import type { ThoughtsRun } from '../types'
import type { Plan, PlanItem } from './plan'
import { progressOf } from './plan'

export type Glyph = '○' | '●' | '✓' | '◌' | '✗'

const LEDGER_LIMIT = 200

const normalized = (command: string) => command.replace(/\s+/gu, ' ').trim()

export function recordRun(ledger: readonly ThoughtsRun[], run: ThoughtsRun): ThoughtsRun[] {
  return [...ledger, { ...run, command: normalized(run.command) }].slice(-LEDGER_LIMIT)
}

/** The latest run whose command contains the check's command. */
export function lastRunFor(item: PlanItem, ledger: readonly ThoughtsRun[]): ThoughtsRun | undefined {
  const { command } = item
  if (command === null) return undefined
  const wanted = normalized(command)
  return ledger.findLast(run => run.command.includes(wanted))
}

/**
 * ○ open · ● ticked, passing run since the last edit · ✓ ticked before the mod started watching
 * (or a prose item: nothing to verify) · ◌ ticked without fresh evidence · ✗ last run failed.
 */
export function glyphFor(item: PlanItem, ledger: readonly ThoughtsRun[], editSeq: number, baselineTicks: readonly string[]): Glyph {
  const last = lastRunFor(item, ledger)
  if (last !== undefined && !last.isOk) return '✗'
  if (!item.isChecked) return '○'
  if (last === undefined) return item.command === null || baselineTicks.includes(item.text) ? '✓' : '◌'
  return last.editSeq === editSeq ? '●' : '◌'
}

export type EvidenceSummary = { verified: number; earlier: number; selfReported: number; stale: number; failing: number }

/** What backs the ticks: runs seen this session, ticks from before it, prose ticks with nothing to run, stale or failing runs. */
export function evidenceSummary(items: readonly PlanItem[], ledger: readonly ThoughtsRun[], editSeq: number, baselineTicks: readonly string[]): EvidenceSummary {
  const summary: EvidenceSummary = { verified: 0, earlier: 0, selfReported: 0, stale: 0, failing: 0 }
  for (const item of items) {
    const glyph = glyphFor(item, ledger, editSeq, baselineTicks)
    if (glyph === '●') summary.verified += 1
    if (glyph === '◌') summary.stale += 1
    if (glyph === '✗') summary.failing += 1
    if (glyph === '✓') {
      if (baselineTicks.includes(item.text)) summary.earlier += 1
      else summary.selfReported += 1
    }
  }
  return summary
}

export type StripCell = Glyph | 'gap'

const GAP_CELLS = 2
const WORST_FIRST: readonly Glyph[] = ['✗', '◌', '○', '✓', '●']

const widthOf = (strip: readonly StripCell[]) => strip.reduce((cells, cell) => cells + (cell === 'gap' ? GAP_CELLS : 1), 0)

const withGaps = (groups: readonly Glyph[][]): StripCell[] => groups.flatMap((group, at): StripCell[] => (at === 0 ? group : ['gap', ...group]))

/**
 * One cell per check with a gap (two cells wide) between phases, empty phases skipped. Wider than
 * maxCells: one cell per phase at its worst glyph (✗ > ◌ > ○ > ✓ > ●). Still wider: nothing.
 */
export function stripOf(plan: Plan, glyphOf: (item: PlanItem) => Glyph, maxCells: number): StripCell[] {
  const groups = plan.phases.filter(phase => phase.items.length > 0).map(phase => phase.items.map(glyphOf))
  const perCheck = withGaps(groups)
  if (widthOf(perCheck) <= maxCells) return perCheck
  const perPhase = withGaps(groups.map(glyphs => [WORST_FIRST.find(glyph => glyphs.includes(glyph)) ?? '●']))
  return widthOf(perPhase) <= maxCells ? perPhase : []
}

/** Failed runs in a row for the item's check, counted back from its newest run. */
export function failStreakOf(item: PlanItem, ledger: readonly ThoughtsRun[]): number {
  const { command } = item
  if (command === null) return 0
  const wanted = normalized(command)
  const runs = ledger.filter(run => run.command.includes(wanted))
  const lastPass = runs.findLastIndex(run => run.isOk)
  return runs.length - 1 - lastPass
}

/**
 * Every box ticked, and the plan's own done-gate ran green since the last edit: each Final
 * Verification check with a command is ●. Without such checks, every check with a command is ●.
 */
export function isProvenDone(plan: Plan, glyphOf: (item: PlanItem) => Glyph): boolean {
  const progress = progressOf(plan)
  if (progress.total === 0 || progress.done < progress.total) return false
  const runnable = (items: readonly PlanItem[]) => items.filter(item => item.command !== null)
  const gate = runnable(plan.phases.find(phase => phase.name === 'Final Verification')?.items ?? [])
  const proof = gate.length > 0 ? gate : runnable(plan.phases.flatMap(phase => phase.items))
  return proof.length > 0 && proof.every(item => glyphOf(item) === '●')
}

export function progressGlyph(done: number, total: number): '○' | '◔' | '◑' | '◕' | '●' {
  const ratio = total === 0 ? 0 : done / total
  if (ratio === 0) return '○'
  if (ratio >= 1) return '●'
  if (ratio < 0.375) return '◔'
  return ratio < 0.625 ? '◑' : '◕'
}

export function ageOf(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`
}
