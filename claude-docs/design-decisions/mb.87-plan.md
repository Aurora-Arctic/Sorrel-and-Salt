# Split `src/db/repository.ts` into `src/db/repository/` (MB.87)

## Context

`src/db/repository.ts` is 530 lines, and M3.10 is adding three more finders to it. It mixes six concerns in one file: the table-shape types, the audited write path, the one select builder and its keyset paging, the generic finders, the spell visibility finders, the two reads that take no proof, and the provisional-account delete. Its test, `tests/db/repository.test.ts`, is 819 lines. The aim is a `src/db/repository/` folder with one file per concern and a test tree that mirrors it. Callers don't change, because `@/db/repository` and `../../../db/repository` resolve to `index.ts` under `moduleResolution: bundler`.

**Scheduling (decided):** this is a new MB task, **stacked on M3.10**. M3.10's PR is open (#190, into `staging`), and its pushed branch already carries `findOneById`, `findManyByIds` and `findMembershipsOfUsers`. The work gets its own `feature/mb.87-repository-folder` branch off `origin/feature/m3.10-me-query-user-type-and-field-level` (currently `623ccf3`), in a worktree under `/home/node/worktrees/`. It does not go in `/app`, which is on M3.10's branch. When a PR is opened, its base is M3.10's branch until #190 merges, then it retargets to `staging`. If M3.10 picks up review fixes to `repository.ts`, merge them in before carving. Before minting the id, re-check the next free MB id, per the note about parallel sessions. Add the task to the Asana `Bugfixes` section and to `TASKS.md` in the same pass. The task notes say it is stacked on M3.10.

## What the split costs, stated up front

Today `selectFrom` and `writerFor` are **file-private**, so the language itself guarantees that no caller can reach an unfiltered read. After the split, sibling files must import them, so they become **folder-private**: exported from `select.ts`/`write.ts`, never re-exported from `index.ts`, and a deep import from outside the folder is banned. That ban has to be mechanical, or the soft-delete guarantee is weaker than it is today. It gets the same pair of guards the module boundary already uses: a lint pattern for fast feedback, and an import-graph guard that catches every spelling. This is the one real design change. Everything else moves code without changing it.

## Layout

| File                         | Holds                                                                                                                                                                                                                                                                                                                                  | Imports `db`? |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `src/db/repository/index.ts` | Named re-exports only (never `export *`): the pinned surface plus `type AuditWriter`. Its **first line** is a side-effect import of `../../modules/identity/schema/users`, so the database layer is entered through `users` before `audit.ts` (the circular-init hazard that `repository.test.ts` "entering the database layer" pins). | no            |
| `shapes.ts`                  | `SoftDeletable`/`HardDeletable`, `WorkspaceScoped`/`Unscoped`, `NotVisibilityScoped`/`SpellScoped`/`NotSpellScoped`, `Identified`, `Writable`, `WritableInWorkspace`, `AuditColumnName`, plus the two predicates `scopedTo` and `notSoftDeleted`                                                                                       | no            |
| `write.ts`                   | `AuditWriter`, `writerFor`, `withAudit`, `Transaction`                                                                                                                                                                                                                                                                                 | yes           |
| `select.ts`                  | `selectFrom` (the one SELECT builder), `SortColumn`, `Keyset`, `pageBounds`, `isDataException`                                                                                                                                                                                                                                         | yes           |
| `finders.ts`                 | `findMany`, `findOne`, `findOneById`, `findManyByIds`, `findManyInWorkspace`, `findOneInWorkspace`, `findPage`, `findPageInWorkspace`, `findManyIncludingSoftDeleted`                                                                                                                                                                  | no            |
| `spells.ts`                  | `readableSpells`, `findManySpells`, `findOneSpell`, `findManyInSpell`                                                                                                                                                                                                                                                                  | no            |
| `memberships.ts`             | `findWorkspaceRole`, `findMembershipsOfUsers`                                                                                                                                                                                                                                                                                          | no            |
| `provisional-users.ts`       | `deleteProvisionalUsers`                                                                                                                                                                                                                                                                                                               | yes           |

Function bodies and doc comments move verbatim. The file-header comment (rules 2 and 4) goes into `index.ts`. Comments that say "the repository holding exactly one select builder" or "`repository.test.ts` pins the export list" are corrected to name the folder or guard that is now true, per MB.50's comment rules.

**Client importers go from one to three** (`write.ts`, `select.ts`, `provisional-users.ts`), each with its own `// oxlint-disable-next-line no-restricted-imports` on `import { db } from '../connection'`. I'm choosing this over funnelling everything through one internal `client.ts` re-export. That would add a hop and create a second name for `db` that the lint patterns don't match.

## Guards and lint

- **`.oxlintrc.json`**: add a pattern group `["@/db/repository/*", "**/db/repository/*"]` ("reach the repository through its index — its other files are internal"). It goes at the top level **and in every override that restates `no-restricted-imports`**, because an override replaces the top-level patterns rather than merging. A sibling's `./select` doesn't match the pattern, so the folder is free to import itself. Update the "Import the database client only in src/db/repository.ts" and "Build queries only in…" messages to say `src/db/repository/`.
- **`tests/guards/soft-delete-finder-guard.test.ts`**: read every `.ts` in `src/db/repository/` with `readdirSync` and assert the listing is non-empty and contains `select.ts`, as a precondition.
  - Exactly one SELECT across the folder, and it's inside `selectFrom` in `select.ts`.
  - `functionBody` looks up each finder in whichever file declares it.
  - "Does not export the builder" becomes two assertions: `index.ts` does not re-export `selectFrom`/`writerFor`, and `index.ts` contains no `export *`.
  - The pinned surface is read from `index.ts`'s named re-exports.
  - The finder, scoped and visibility assertions are unchanged.
- **`tests/guards/module-boundaries.test.ts`**:
  - The tier seam's `chunks()` runs over every file in the folder.
  - The expected edge becomes `src/db/repository/index → src/modules/identity/schema/users`.
  - **New:** no edge from outside `src/db/repository/` into any file there except `index`. This is the precise guard behind the lint pattern, and it uses the resolver that is already there.
- **`tests/guards/lint-db-client-boundary.test.ts`**: `CLIENT_EXEMPT` swaps `src/db/repository.ts` for the three files, "exactly four" becomes "exactly six", and the comment is updated.
- **`tests/guards/lint-access-boundary.test.ts`**: add probes showing the deep-import ban fires, for example `@/db/repository/select` from `src/modules/coven/services` and `../../../db/repository/write`, and that `@/db/repository` itself still does not fire.
- **`tests/guards/doc-citation.test.ts`**: the precondition's `src/db/repository.ts` becomes whichever file keeps the `claude-docs/db.md` citation (`write.ts`).

## Tests: mirror the folder

Split `tests/db/repository.test.ts` into `tests/db/repository/`. It stays under `tests/db/`, so the `db` project glob still picks it up.

- **`tests/support/db/probe-tables.ts`**: the four `repository_probe_*` Drizzle tables, the fixed `session`/`impostor` ids, and a `useProbeTables()` that registers the `beforeAll` create, `afterAll` drop and `beforeEach` truncate. Each test file gets a freshly cloned database, so every file that uses it creates its own tables. `tests/support/db` is already exempt from the drizzle-orm runtime ban.
- **`index.test.ts`**: the public-API export pin and "entering the database layer through the repository".
- **`write.test.ts`**:
  - `withAudit`
  - `app.current_user_id`
  - the MB.34 hard delete, including the nine-writer-methods pin
  - `write.insertInWorkspace`
- **`finders.test.ts`**:
  - soft-delete filtering and `by id`
  - the partial-index convention
  - `findManyInWorkspace`
  - the direct-id denials
  - the compile-time refusals
- **`memberships.test.ts`**: the `findWorkspaceRole` and `findMembershipsOfUsers` describes.
- The spell finders are already covered in `tests/db/spell-visibility.test.ts` and `workspace-isolation.test.ts`, which stay where they are.

Test bodies move verbatim. The one thing to preserve is that each authorization test still asserts its preconditions after the move.

## Docs

"Correct a doc in the PR that makes it wrong":

- **`CLAUDE.md`**: rule 2 ("Only `src/db/repository.ts`…"). The three exemptions "besides the repository" now sit beside a folder whose own three files carry the comment. Also update the rule 4 and 5 mentions and the Testing-section path if it has one.
- **`claude-docs/db.md`**:
  - "The write path — `repository.ts`…", "Soft-delete filtering…" (the private-`selectFrom` paragraph becomes folder-private plus the deep-import ban), and "Who may import the client", including its table and the "four files" count.
  - The "Testing against a scratch table" paragraph gets the new test paths and `probe-tables.ts`.
- **`claude-docs/DESIGN.md`**: the §2 tree (line ~106) and the two `src/db/repository.ts` mentions (~227, ~538).
- **`claude-docs/modules.md`**: lines ~29 and ~152.
- **`claude-docs/testing.md`**: line ~239 if the wording depends on the file.
- `tsconfig.json`'s comment at line 39 names `tests/db/repository.test.ts`, so fix the path.
- Historical records (`TASKS.md` entries for M1.16/M1.17, the `design-decisions/*-plan.md` files) are left alone, because they're true of their time.
- Copy this plan to `claude-docs/design-decisions/mb.87-plan.md`.

## Execution order

1. Mint the MB id, add the Asana task in `Bugfixes`, and add the `TASKS.md` entry. Then create the branch and worktree off `origin/feature/m3.10-me-query-user-type-and-field-level`, run `npm ci` in the worktree, and mark the task `▶ `. Nothing gets committed, pushed or PR'd unless you ask.
2. Guards first, red. Update the soft-delete, module-boundary, client-boundary, access-boundary and doc-citation guards to the folder shape, and watch them fail against the single file.
3. `git mv src/db/repository.ts src/db/repository/index.ts`, then carve the other files out of it, leaving `index.ts` as re-exports. Add the lint pattern.
4. Split the test file, creating `probe-tables.ts`.
5. Docs.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`
- `npm run test:coverage`, with every project green and the 80% threshold met. In particular:
  - `tests/guards/*`: soft-delete, module-boundaries, both lint-boundary tests, doc-citation and test-location.
  - `tests/db/repository/*`, `tests/rsc/modules/coven/membership.test.ts` (which mocks `@/db/repository` whole), and `tests/modules/coven/loaders/memberships-by-user.test.ts` (which uses `importOriginal`).
- `npm run build`, because `server-only` and RSC graph resolution through the new `index.ts` only shows up in `next build`.
- A spot-check that the deep-import ban works: temporarily add `import { selectFrom } from '@/db/repository/select'` to a service. `npm run lint` and the module-boundaries guard should both go red. Then revert it.
- `git grep -n "db/repository\.ts"` outside `claude-docs/archive`, `TASKS.md` and `design-decisions/*-plan.md` should return nothing.

## Amendments during execution

- **`writerFor` stayed file-private.** Only `withAudit` calls it, and both live in `write.ts`, so the one builder that became folder-private is `selectFrom` (with the `scopedTo` and `notSoftDeleted` predicates). The plan and the first draft of the task entry said otherwise and were corrected.
- **The task went to the Wave 7 card, not `Bugfixes`.** Scheduled MB tasks are subtasks of their wave card, as MB.86 is.
- **The work moved from a worktree into `/app`** once M3.10's PR was open, branched off M3.10's latest commit (`3a09c2e`) rather than `623ccf3`. The only difference between them was CI-only.
- **The client ban never matched `../connection`.** The group listed `./connection` and `**/db/connection`, so a file one directory below `src/db/` could import the client unflagged. The three new client importers are such files, and their disable comments suppressed nothing, which the client-exemption guard caught. `../connection` and `../connection.ts` joined the group in all four places, with a probe for it and the guard's scan widened to match. This was a sub-hour fix, so it rides here and is named in the PR body.
- **`codegen-staleness` raced the lint guards.** Its `src/**` documents glob picked up the lint guards' `__lint-probe*__` files while they were being deleted, and failed with `ENOENT` when the guards directory ran in parallel. The race predates this task, but the eight new `src/` probes widened its window. `codegen.ts` now excludes `src/**/__lint-probe*__/**`, which changes no generated output.
- **`db.md` was already wrong in one place.** It said `repository.test.ts` asserts each stamp column is the same builder in both audit sets. That assertion is `tests/db/audit.test.ts`'s, and the doc now says so.
- **Test names are unchanged.** `memberships.test.ts` keeps its two describes under the original `the Membership proof (M6.3)` parent, so every test's full name is what it was. There were 47 tests before the split and there are 47 after.
