# claude-code-mods

Claude Code mods by Team Brilliant — function-hook plugins that change how Claude Code looks and behaves. Early-access API; Claude Code only.

## Install

```
/plugin install thoughts@teambrilliant-marketplace
```

(`/plugin marketplace add teambrilliant/marketplace` first if you haven't.)

## Mods

| Mod | What it does |
| --- | --- |
| [`thoughts`](mods/thoughts) | A side pane into the work: the active `thoughts/plans/` plan as a progress card backed by real check runs, plus the session's ★ views pinned until `/clear`. `/thoughts` opens it. Pairs with [dev-skills](https://github.com/teambrilliant/dev-skills). |

Skills feed mods through [CONTRACTS.md](CONTRACTS.md).

## Develop

```
~/.local/bin/claude --plugin-dir mods/<name>
~/.local/bin/claude plugin test mods/<name>
```

See [CLAUDE.md](CLAUDE.md).
