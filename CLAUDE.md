# CLAUDE.md

Claude Code mods (function-hook plugins, early-access API). Claude Code only: Codex can't run them.

## Layout

One plugin per folder in `mods/<name>/`: `.claude-plugin/plugin.json`, `hooks/hooks.json` → `hooks/register.tsx`, `types/index.d.ts` (the `$.state` contract), `tests/*.test.ts(x)`. Each mod is versioned and installed on its own; `teambrilliant/marketplace` lists each one with a `git-subdir` source (`path: mods/<name>`).

What mods read from skills (dev-skills, tap-skills, growth-skills) is specified in `CONTRACTS.md` — change it together with the mods that read it.

## Loop

- Always call `~/.local/bin/claude` — the shell alias `claude --channels …` swallows `plugin` subcommands.
- `~/.local/bin/claude plugin test mods/<name>` · `~/.local/bin/claude plugin validate mods/<name>` · `cd mods/<name> && bunx tsc -p .`
- Run a mod from its folder: `~/.local/bin/claude --plugin-dir mods/<name>`.
- tsc reads the API from `.claude-plugin/types/` (gitignored). The engine writes it there whenever it loads the mod; before the first load, copy the plugin-authoring skill's `types/claude-code.d.ts` to `.claude-plugin/types/claude-code/index.d.ts`.
- The test kit has no fs: fixtures are generated into `tests/fixtures/fixtures.gen.ts` (e.g. `bun mods/thoughts/scripts/build-fixtures.ts`).
- The kit can't answer `session.append` (it requires `next`, and nothing sits beneath it in a test), so test the logic behind that hook through another entry point.
- If the kit says hooks modules are turned off ("rollout switch"), run it once with network access.
- Bump a mod's `plugin.json` version on behavioral changes.
