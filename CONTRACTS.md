# Contracts

What skills emit so mods can read it. Skills keep these when edited; mods parse only what's here.

## ★ views

A view is a block a skill closes its reply with — a summary meant to stay visible.

```
`★ <Kind> ─────`
...body...
`───── ★`
```

- Opener: `★ <Kind> ` then 3+ `─`. Optional surrounding backticks.
- Closer: a line ending in 3+ `─` then ` ★`. Without it the block is not a view — so a header banner (`★ growth-skills:x ───` … plain `───`) never pins.
- Keep bars short (5 dashes): long rules wrap in narrow terminals and in Codex.
- A view about something specific names it after ` · `: `★ Explain · thoughts/plans/x.md ─────`. A file target is watched for changes.
- One slot per `<Kind>`: a newer view of the same kind replaces the older one.

Readers: `thoughts` (pins views in its pane).

## Plans (`thoughts/plans/*.md`, from dev-skills `write-plan`)

- `# <Title> - Implementation Plan`, phases as `## Phase N: <name>` with a `**Layer:** <layer>` line.
- Every Phase Check item starts with its command in backticks: `` - [ ] `cmd` → expected ``.
- `execute-plan` ticks `- [x]` right after each check passes, never before.

Readers: `thoughts` (plan card, evidence glyphs matched against Bash runs).
