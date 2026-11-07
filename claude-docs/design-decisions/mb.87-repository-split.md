# Split `src/db/repository.ts` into `src/db/repository/` (MB.87)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Execution order

1. Mint the MB id, add the Asana task in `Bugfixes`, and add the `TASKS.md` entry. Then create the branch and worktree off `origin/feature/m3.10-me-query-user-type-and-field-level`, run `npm ci` in the worktree, and mark the task `▶ `. Nothing gets committed, pushed or PR'd unless you ask.
2. Guards first, red. Update the soft-delete, module-boundary, client-boundary, access-boundary and doc-citation guards to the folder shape, and watch them fail against the single file.
3. `git mv src/db/repository.ts src/db/repository/index.ts`, then carve the other files out of it, leaving `index.ts` as re-exports. Add the lint pattern.
4. Split the test file, creating `probe-tables.ts`.
5. Docs.
