import { describe, expect, test } from 'claude-code/testing'

import { parsePlan } from '../hooks/plan'
import { bandText, isOpen, markdownOf, previewOf, wrapFor } from '../hooks/ui'
import type { ThoughtsPin } from '../types'
import { PLANS, REPLIES } from './fixtures/fixtures.gen'

const pinOf = (text: string, fold?: 'open' | 'closed'): ThoughtsPin => ({
  kind: 'K',
  text,
  target: null,
  targetHash: null,
  isTargetChanged: false,
  pinnedAt: 1,
  ...(fold === undefined ? {} : { fold }),
})

describe('wrapFor', () => {
  test('prose wraps; box-drawing lines truncate so the picture stays intact', async () => {
    expect(wrapFor('- Fine in Codex: the mod runs only inside Claude Code; Codex only sees the skills')).toBe('wrap')
    expect(wrapFor('├─ Phase 1: Stripe client        [layer: outbound I/O]')).toBe('truncate-end')
    expect(wrapFor(' browser ──POST /invoices──► API')).toBe('truncate-end')
  })
})

describe('markdownOf', () => {
  test('bullets stay prose; a run of drawing lines is fenced so it keeps its shape', async () => {
    const lines = ['- Building: a thing', '- Risk: replay', '', 'Plan: x', '├─ Phase 1', '└─ Phase 2', '', 'Full plan → a.md']
    expect(markdownOf(lines)).toBe('- Building: a thing\n- Risk: replay\n\nPlan: x\n```\n├─ Phase 1\n└─ Phase 2\n```\n\nFull plan → a.md')
  })

  test('a body with its own fences passes through', async () => {
    expect(markdownOf(['```', ' a ──► b', '```'])).toBe('```\n a ──► b\n```')
  })
})

describe('previewOf', () => {
  test('skips a fenced drawing and starts at the first prose line', async () => {
    const explain = REPLIES.explain ?? ''
    const block = explain.slice(explain.indexOf('★ Explain'), explain.indexOf('───── ★') + '───── ★'.length)
    expect(previewOf(pinOf(block))).toMatch(/^So a cron job wakes up on a schedule/)
  })

  test('drops the bullet and skips unfenced drawing lines', async () => {
    expect(previewOf(pinOf('★ Plan View ─────\n\n├─ Phase 1\n- Building: a thing\n───── ★'))).toBe('Building: a thing')
  })

  test('a body with no prose previews as nothing', async () => {
    expect(previewOf(pinOf('★ X ─────\n```\n a ──► b\n```\n───── ★'))).toBe('')
  })
})

describe('isOpen', () => {
  test('a hand-set fold wins; otherwise only the newest is open', async () => {
    expect([isOpen(pinOf(''), true), isOpen(pinOf(''), false)]).toEqual([true, false])
    expect([isOpen(pinOf('', 'open'), false), isOpen(pinOf('', 'closed'), true)]).toEqual([true, false])
  })
})

describe('bandText', () => {
  const evidence = { ledger: [], editSeq: 0, baselineTicks: [], now: 0 }
  const noPins = { kinds: [], isPaneShown: false }
  const big = parsePlan(
    ['# Big', ...[1, 2, 3, 4].flatMap(phase => [`## Phase ${phase}: p`, ...Array.from({ length: 10 }, (_, at) => `- [ ] \`check ${phase}-${at}\` → ok`)])].join('\n'),
  )

  test('room to spare: one cell per check after the count', async () => {
    expect(bandText(parsePlan(PLANS.midrun), noPins, evidence, 100)).toBe('◑ Billing invoices · P2 Function · 3/7 · ▖▖  ▖▁  ▁  ▁▁')
  })

  test('too narrow for every check: one cell per phase', async () => {
    expect(bandText(big, noPins, evidence, 40)).toBe('○ Big · P1 · 0/40 · ▁  ▁  ▁  ▁')
  })

  test('too narrow even per phase: no strip, the pins notice stays whole', async () => {
    const line = bandText(parsePlan(PLANS.midrun), { kinds: ['Product View'], isPaneShown: false }, evidence, 50)
    expect(line).toBe('◑ Billing invoices · P2 Function · 3/7 · ★ 1 pinned: Product · /thoughts to view')
  })
})
