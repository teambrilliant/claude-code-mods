import { describe, expect, test } from 'claude-code/testing'

import { evidenceSummary, failStreakOf, glyphFor, isProvenDone, progressGlyph, recordRun, stripOf } from '../hooks/evidence'
import type { Glyph } from '../hooks/evidence'
import { parsePlan } from '../hooks/plan'
import type { Plan, PlanItem } from '../hooks/plan'
import { PLANS } from './fixtures/fixtures.gen'
import type { ThoughtsRun } from '../types'

const check = (isChecked: boolean): PlanItem => ({ text: '`pnpm vitest sync.test.ts` → pass', command: 'pnpm vitest sync.test.ts', isChecked })
const prose: PlanItem = { text: 'Acceptance criteria: each verified', command: null, isChecked: true }
const run = (isOk: boolean, editSeq: number): ThoughtsRun => ({ command: 'cd app &&  pnpm vitest   sync.test.ts 2>&1', isOk, at: 1, editSeq })

describe('glyphFor', () => {
  test('ticked with a passing run since the last edit → ●', async () => {
    expect(glyphFor(check(true), recordRun([], run(true, 3)), 3, [])).toBe('●')
  })

  test('an edit after the run makes it stale → ◌', async () => {
    expect(glyphFor(check(true), recordRun([], run(true, 3)), 4, [])).toBe('◌')
  })

  test('last matching run failed → ✗, ticked or not', async () => {
    const ledger = recordRun(recordRun([], run(true, 1)), run(false, 1))
    expect(glyphFor(check(true), ledger, 1, [])).toBe('✗')
    expect(glyphFor(check(false), ledger, 1, [])).toBe('✗')
  })

  test('ticked this session with no run → ◌; ticked before the mod watched → ✓', async () => {
    expect(glyphFor(check(true), [], 0, [])).toBe('◌')
    expect(glyphFor(check(true), [], 0, [check(true).text])).toBe('✓')
  })

  test('open → ○; a ticked prose item has nothing to verify → ✓', async () => {
    expect(glyphFor(check(false), [], 0, [])).toBe('○')
    expect(glyphFor(prose, [], 0, [])).toBe('✓')
  })
})

describe('progressGlyph', () => {
  test('quarters of the pie', async () => {
    expect([0, 1, 2, 3, 4].map(done => progressGlyph(done, 4))).toEqual(['○', '◔', '◑', '◕', '●'])
  })
})

describe('evidenceSummary', () => {
  test('counts what backs each tick', async () => {
    const items = [check(true), { ...check(true), text: 'b', command: 'pnpm lint' }, prose, check(false)]
    const ledger = recordRun(recordRun([], run(true, 2)), { command: 'pnpm lint', isOk: false, at: 1, editSeq: 2 })
    expect(evidenceSummary(items, ledger, 2, [])).toEqual({ verified: 1, earlier: 0, selfReported: 1, stale: 0, failing: 1 })
    expect(evidenceSummary([check(true)], [], 0, [check(true).text])).toEqual({ verified: 0, earlier: 1, selfReported: 0, stale: 0, failing: 0 })
  })
})

const midrun = (): Plan => {
  const plan = parsePlan(PLANS.midrun)
  if (plan === undefined) throw new Error('midrun fixture does not parse')
  return plan
}
const baseline = (plan: Plan) => plan.phases.flatMap(phase => phase.items.filter(item => item.isChecked).map(item => item.text))
const glyphsOf = (plan: Plan, ledger: readonly ThoughtsRun[] = [], editSeq = 0) => (item: PlanItem) => glyphFor(item, ledger, editSeq, baseline(plan))
const named = (command: string, isOk: boolean, editSeq = 0): ThoughtsRun => ({ command, isOk, at: 1, editSeq })

describe('stripOf', () => {
  test('one cell per check, a gap between phases', async () => {
    const plan = midrun()
    expect(stripOf(plan, glyphsOf(plan), 80)).toEqual(['✓', '✓', 'gap', '✓', '○', 'gap', '○', 'gap', '○', '○'])
  })

  test('too wide: one cell per phase at its worst glyph; still too wide: nothing', async () => {
    const plan = midrun()
    const failing = glyphsOf(plan, [named('pnpm vitest sync-replay.test.ts', false)])
    expect(stripOf(plan, failing, 12)).toEqual(['✓', 'gap', '✗', 'gap', '○', 'gap', '○'])
    expect(stripOf(plan, failing, 9)).toEqual([])
  })

  test('phases without checks take no cell and no gap', async () => {
    const plan: Plan = { title: 'T', phases: [{ name: 'Phase 1: a', layer: null, items: [] }, midrun().phases[0] ?? { name: 'x', layer: null, items: [] }] }
    expect(stripOf(plan, () => '●', 80)).toEqual(['●', '●'])
  })
})

describe('failStreakOf', () => {
  const item = check(false)
  test('counts failures back to the last pass; other commands never count', async () => {
    const pass = named('pnpm vitest sync.test.ts', true)
    const fail = named('pnpm vitest sync.test.ts', false)
    const other = named('rg nope', false)
    expect(failStreakOf(item, [pass, fail, other, fail])).toBe(2)
    expect(failStreakOf(item, [fail, pass])).toBe(0)
    expect(failStreakOf(item, [other, other])).toBe(0)
    expect(failStreakOf(prose, [fail])).toBe(0)
  })
})

describe('isProvenDone', () => {
  const plan = (final: boolean): Plan => ({
    title: 'T',
    phases: [
      { name: 'Phase 1: a', layer: null, items: [{ text: '`early` → ok', command: 'early', isChecked: true }] },
      ...(final ? [{ name: 'Final Verification', layer: null, items: [{ text: '`bun test` → ok', command: 'bun test', isChecked: true }, prose] }] : []),
    ],
  })
  const glyphs = (map: Record<string, Glyph>) => (item: PlanItem) => map[item.command ?? ''] ?? '✓'

  test('a fresh Final Verification proves it, even with stale early checks', async () => {
    expect(isProvenDone(plan(true), glyphs({ early: '◌', 'bun test': '●' }))).toBe(true)
    expect(isProvenDone(plan(true), glyphs({ early: '●', 'bun test': '◌' }))).toBe(false)
  })

  test('an unticked box is never done', async () => {
    const open = plan(true)
    const first = open.phases[0]?.items[0]
    if (first !== undefined) first.isChecked = false
    expect(isProvenDone(open, glyphs({ early: '●', 'bun test': '●' }))).toBe(false)
  })

  test('without a Final Verification gate, every check with a command must be fresh; with none, never', async () => {
    expect(isProvenDone(plan(false), glyphs({ early: '●' }))).toBe(true)
    expect(isProvenDone(plan(false), glyphs({ early: '◌' }))).toBe(false)
    expect(isProvenDone({ title: 'T', phases: [{ name: 'Phase 1: a', layer: null, items: [prose] }] }, () => '✓')).toBe(false)
  })
})
