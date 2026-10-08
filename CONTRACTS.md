# Contracts

What skills emit so mods can read it. Skills keep these formats when edited, and mods parse only what's listed here.

## ★ views

A view is the block a skill closes its reply with: a short summary meant to stay visible.

```
`★ <Kind> ─────`
...body...
`───── ★`
```

- Opener: `★ <Kind> ` then 3+ `─`. Backticks around the line are optional.
- Closer: a line ending in 3+ `─` then ` ★`. A block without one is not a view, so a header banner (`★ growth-skills:x ───` … plain `───`) never pins.
- Bars stay short (5 dashes), because long rules wrap in narrow terminals and in Codex.
- A view about one thing names it after ` · `, as in `★ Explain · thoughts/plans/x.md ─────`. When the target is a file, `thoughts` flags the view once the file changes.
- One slot per `<Kind>`: a newer view of the same kind replaces the older one.

Readers: `thoughts` (pins views in its pane).

## Plans (`thoughts/plans/*.md`, from dev-skills `write-plan`)

- `# <Title> - Implementation Plan`, phases as `## Phase N: <name>` with a `**Layer:** <layer>` line.
- Every Phase Check item starts with its command in backticks: `` - [ ] `cmd` → expected ``.
- `execute-plan` ticks `- [x]` right after each check passes, never before.

Readers: `thoughts` (plan card, with evidence glyphs matched against Bash runs).
