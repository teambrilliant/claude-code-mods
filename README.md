# claude-code-mods

Claude Code mods by Team Brilliant. A mod is a plugin that hooks into Claude Code's events and UI: it can draw a pane, rewrite how a message renders, or react to tool calls. The mods API is early access, and mods run in Claude Code only.

## Install

```
/plugin install thoughts@teambrilliant-marketplace
```

Run `/plugin marketplace add teambrilliant/marketplace` first if you haven't added the marketplace.

## Mods

| Mod | What it does |
| --- | --- |
| [`thoughts`](mods/thoughts) | Side pane with the active `thoughts/plans/` plan as a progress card, each tick checked against the commands that actually ran, plus the session's ★ views pinned until `/clear`. `/thoughts` opens it. Works with [dev-skills](https://github.com/teambrilliant/dev-skills). |

[CONTRACTS.md](CONTRACTS.md) lists what skills must emit for mods to read.

## Develop

```
~/.local/bin/claude --plugin-dir mods/<name>
~/.local/bin/claude plugin test mods/<name>
```

The full loop is in [CLAUDE.md](CLAUDE.md).
