# Docs are split so a task loads only what it touches

**Status:** decided. Live home: `CLAUDE.md` (precedence line and rules index) and `claude-docs/token-efficiency.md`.

## Decision

- **`CLAUDE.md` is slim and always loaded.** It holds the Vocabulary, a short Commands table, the ten architecture rules with their numbers (each cut to its binding sentence plus a citation), the domain invariants, the Testing bullets that apply to every test, the Conventions, Out of scope, Skills and a short task-tracking summary. Everything longer lives in a path-scoped rule file or a subsystem doc.
- **Rule files are the long form of `CLAUDE.md` lines, never a rule of their own.** `.claude/rules/<area>.md` carries a `paths:` glob and loads only when a matching file is read or edited: `database.md` (rules 2–5 and 10), `graphql.md` (6–9), `components.md`, `testing.md`, `task-tracking.md`. Precedence is `DESIGN.md`, then `CLAUDE.md`, then a rule file.
- **The long command table is `claude-docs/commands.md`.**
- **`TASKS.md` splits by milestone, read in a declared sequence, not into per-task files.** `scripts/tasks-md.mjs` defines a wave range by the file order of the `**ID — title** · Nh` headings, and `tally.mjs` reads the same headings.
- **A doc split leaves the `## ` headings in the original file as an index.** `tests/guards/doc-citation.test.ts` resolves a cite by heading prefix in the cited file, so every code citation keeps resolving with no guard change.
- **The ten architecture rule numbers stay in `CLAUDE.md`**, because tests cite them in comments (`CLAUDE.md rule 4`).
- **Moves and rewrites are separate tasks**, so each diff reviews as one thing.
- **Skills:** `create-feature` and `create-hotfix` are short wrappers over one shared reference (the base branch is the only difference); a skill does not restate `CLAUDE.md`.
- **`TASKS.md` has no "Standing rules" section**; it cites `CLAUDE.md`.
- **The Vercel plugin is disabled for this repo** (project scope). There is no project effort override.

## Why

Claude Code loads `.claude/rules/*.md` with a `paths:` glob only when a matching file is read or edited, so unmatched rules cost nothing. `@imports` in `CLAUDE.md` are eager and buy nothing. Every always-loaded byte is paid on every turn.

## Rules out

- Per-task `TASKS.md` files, which break the wave-range and tally scripts.
- `@imports` in `CLAUDE.md` to save size.
- A rule file that holds a rule `CLAUDE.md` does not.
