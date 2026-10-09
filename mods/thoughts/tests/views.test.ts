import { describe, expect, test } from 'claude-code/testing'

import { extractViews, hashText, pinViews, shrinkPinned } from '../hooks/views'
import type { ThoughtsPin } from '../types'
import { REPLIES } from './fixtures/fixtures.gen'

const reply = (name: string) => REPLIES[name] ?? ''

describe('extractViews', () => {
  test('finds the one block each real skill reply carries', async () => {
    const kinds = ['explain', 'product-thinker', 'shaping-work', 'strategic-thinker', 'working-backwards', 'write-plan'].map(
      name => extractViews(reply(name)).map(view => view.kind),
    )
    expect(kinds).toEqual([['Explain'], ['Product View'], ['Shaped View'], ['Strategic View'], ['Working Backwards View'], ['Plan View']])
  })

  test('explain carries its target; views carry none', async () => {
    expect(extractViews(reply('explain'))[0]?.target).toBe('inline: cron job charges pending orders')
    expect(extractViews(reply('product-thinker'))[0]?.target).toBeNull()
  })

  test('plan view spans the ASCII map: the plain rule after the bullets does not close it', async () => {
    const text = extractViews(reply('write-plan'))[0]?.text ?? ''
    expect(text).toContain('Full plan →')
    expect(text.split('\n').at(-1)).toMatch(/─ ★$/)
  })

  test('an opener without a closer, and an output-style insight, are not views', async () => {
    expect(extractViews(reply('malformed'))).toEqual([])
  })

  test('an unclosed header banner before a view does not swallow it', async () => {
    const text = [
      '`★ growth-skills:business-thinker ────────────────`',
      'Question type: pricing',
      '`────────────────────────────────────────────────`',
      '',
      '`★ Decision View ─────────────────────────────────`',
      '- Raise prices',
      '`───────────────────────────────────────────── ★`',
    ].join('\n')
    const views = extractViews(text)
    expect(views.map(view => view.kind)).toEqual(['Decision View'])
    expect(views[0]?.text).not.toContain('Question type')
  })

  test('short bars still open and close a view', async () => {
    const views = extractViews('`★ Product View ─────`\n- Build it\n`───── ★`')
    expect(views.map(view => view.kind)).toEqual(['Product View'])
  })

  test('several kinds in one reply come back in order', async () => {
    expect(extractViews(reply('multi')).map(view => view.kind)).toEqual(['Product View', 'Strategic View'])
  })
})

describe('shrinkPinned', () => {
  test('a pinned block becomes one line; text around it is byte-identical', async () => {
    const text = reply('multi')
    const [product] = extractViews(text)
    const shrunk = shrinkPinned(text, [product?.text ?? ''])
    expect(shrunk.split('\n')[0]).toBe('★ Product View · pinned')
    expect(shrunk).toContain('Analysis paragraph in between.')
    expect(shrunk).toContain('`★ Strategic View')
    expect(shrunk.endsWith('Closing prose.\n')).toBe(true)
  })

  test('a fenced block takes its fences with it', async () => {
    const text = reply('write-plan')
    const shrunk = shrinkPinned(text, extractViews(text).map(view => view.text))
    expect(shrunk).toContain('★ Plan View · pinned')
    expect(shrunk).not.toContain('Full plan →')
    expect(shrunk).not.toMatch(/```\n★ Plan View · pinned/)
  })

  test('nothing pinned leaves the text untouched', async () => {
    expect(shrinkPinned(reply('multi'), [])).toBe(reply('multi'))
  })
})

describe('pinViews', () => {
  test('same kind replaces, different kinds stack in arrival order', async () => {
    const [product, strategic] = extractViews(reply('multi'))
    const first = pinViews([], [product, strategic].flatMap(view => (view === undefined ? [] : [view])), 1, () => null)
    const replaced = pinViews(first, extractViews(reply('product-thinker')), 2, () => null)
    expect(replaced.map(pin => [pin.kind, pin.pinnedAt])).toEqual([
      ['Strategic View', 1],
      ['Product View', 2],
    ])
  })

  test('a hand-set fold survives views of other kinds; a new view of the same kind resets it', async () => {
    const [product, strategic] = extractViews(reply('multi'))
    const first = pinViews([], [product, strategic].flatMap(view => (view === undefined ? [] : [view])), 1, () => null)
    const opened = first.map((pin): ThoughtsPin => (pin.kind === 'Product View' ? { ...pin, fold: 'open' } : pin))
    const withShaped = pinViews(opened, extractViews(reply('shaping-work')), 2, () => null)
    expect(withShaped.find(pin => pin.kind === 'Product View')?.fold).toBe('open')
    const replaced = pinViews(withShaped, extractViews(reply('product-thinker')), 3, () => null)
    expect(replaced.find(pin => pin.kind === 'Product View')?.fold).toBeUndefined()
  })

  test('a file target is hashed at pin time', async () => {
    const pinned = pinViews([], extractViews(reply('explain')), 1, () => hashText('v1'))
    expect(pinned[0]?.targetHash).toBe(hashText('v1'))
    expect(hashText('v1')).not.toBe(hashText('v2'))
  })
})
