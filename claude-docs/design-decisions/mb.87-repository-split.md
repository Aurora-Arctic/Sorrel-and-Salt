# The repository is a folder

**Status:** decided. Live home: `claude-docs/modules.md` and `.claude/rules/database.md`.

## Decision

`src/db/repository.ts` became `src/db/repository/index.ts` plus files carved out of it, with `index.ts` as re-exports and a lint pattern that keeps the database client inside the folder. The soft-delete, module-boundary, client-boundary, access-boundary and doc-citation guards read the folder shape. Its test file was split too, with a shared `probe-tables.ts`.

## Why

One file past a size where every task touched it; guards go red first, so the move cannot loosen a rule.

## Rules out

- Moving the code before the guards fail against the single file.
