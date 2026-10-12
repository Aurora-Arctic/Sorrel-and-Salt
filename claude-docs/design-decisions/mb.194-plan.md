<!-- The approved plan for MB.194 to MB.203, stored beside the records it produces. The decisions are mb.194-privilege-ledger-by-trigger.md (MB.194) and mb.201-two-tier-invitations.md (MB.201); this file is how they were reached and is not maintained after the PR lands. -->

# One privilege ledger, written by the database, with its route and an admin page

## Context

Four tables record "who did what to whom" outside the row's own audit stamps, each with its own task, schema file, schema test, marker type and doc entry:

| Table                                                                                  | Kind                                         | Written through                                          | Marker on the writer's generic methods    |
| -------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `admin_role_changes` (MB.58, **released on main**)                                     | privilege ledger: `userId`, `change`, `note` | generic `insert`                                         | `NotAppendOnly` = `{ change?: never }`    |
| `workspace_creation_changes` (MB.193, **staging only**, M5.8 writing it on its branch) | privilege ledger: `userId`, `change`         | generic `insert`                                         | the same `NotAppendOnly`                  |
| `admin_role_change_pauses` (MB.62)                                                     | state ledger, open → ended                   | named `pauseAdminRoleChanges` / `resumeAdminRoleChanges` | `NotPauseLedger` = `{ endedAt?: never }`  |
| `admin_invitations` (MB.69)                                                            | state ledger, pending → accepted or revoked  | named insert / accept / revoke                           | `NotInvitation` = `{ tokenHash?: never }` |

The owner asked how to stop ledgers multiplying. Decided across this session:

- **The two privilege ledgers become one, `user_privilege_changes`, filled by a trigger on `users`**, not by services. Every privilege change is recorded whether the writer remembered or not, including a `psql` break-glass update, and a future flag on `users` is one column name in the trigger, not a table task. The write path's comment already reserves `app.current_user_id` for exactly this ("what makes the v2 history trigger … one migration"). This is not §13's edit history: it records two columns of one table, as a privilege's account, and §13's `record_revisions` stays v2.
- **The route is kept.** A change says how it came about (`bootstrap`, `admin`, `invitation`, `manual`). Services publish it as a second transaction-local setting from `withAudit`, and the trigger refuses a privilege change that declared none.
- **Admins get a page to read the ledger**, newest first, filterable by user, linked from each row of `/admin/users`.
- **A change may carry a note.** `withAudit`'s option is `{ via, note? }`; the note is published as a third setting and the trigger copies it into a nullable `note` column. MB.59's confirmation offers an optional reason; MB.70 passes the invitation's note into the grant.
- **The two invitation tables become one two-tier `invitations` table**, the shape `ingredients` already has: `workspaceId` and `role` nullable and paired by a CHECK, the workspace tier written under a `Membership`, the site tier under a `SiteAdmin`. `workspace_invitations` (M7.1) and `admin_invitations` (MB.69) are both released, but nothing writes or reads either yet (M7.2 to M7.6 and MB.70 are open), so the merge is a copy of nothing and lands before five tasks would have built two of everything. M2.9's objections to reusing the workspace table, that it was scoped and its CHECK refused admin, are both answered by the nullable pair. The decision record states the three things a reader must know: null workspace means a site-tier invitation, as null workspace means a compendium entry; the table lives in `coven` and the admin tier reaches it as admin curation reaches `ingredients`; policy (who may create, the pause, what accepting grants, where it redirects, where it is listed) stays in two services while the mechanics (token, hash, expiry, pending predicate, accept, revoke, finder, rejections) exist once.
- **The pause table stays separate.** It holds state, not acts, and has no sibling.
- **Append-only is the database's job.** A `forbid_rewrite()` trigger on the ledger makes an update or delete impossible rather than absent from the TypeScript writer. The type side then needs a single mark, `namedWrites`, for the two state ledgers, replacing three markers keyed on incidental column names.
- Built **after M5.8 merges**, **from a worktree** (`/app` holds another session's uncommitted edits). **Re-check the next free id right before minting**: 193 is the highest on the board and in staging's `tasks/mb.md`.

Wave 8 order after the change: `… MB.193 · M5.8 · MB.194 · MB.195 · MB.196 · MB.198 · MB.201 · MB.202 · MB.59 · MB.63 · MB.70 · MB.199 · MB.200 …`, with MB.201 and MB.202 also ahead of M7.2 wherever it sits, and the two drops, `MB.197` and `MB.203`, after a release carrying MB.196 and MB.202 has reached production.

## The ledger

**`user_privilege_changes`** — `id`, `userId` → `users.id`, `privilege`, `change`, `via`, `note` (nullable), `...auditColumns`.

- `privilege`: pgEnum `user_privilege` = `admin` | `create_workspace`. The `users` column the trigger watched, named as a privilege. A future flag is a value here and a line in the trigger.
- `change`: pgEnum `user_privilege_change` = `grant` | `revoke`, derived by the trigger from old and new (`role` user → admin is a grant; `can_create_workspace` false → true is a grant).
- `via`: pgEnum `user_privilege_route` = `bootstrap` | `admin` | `invitation` | `manual`. Read from the setting `app.privilege_route`, which `withAudit` publishes beside `app.current_user_id` when the service declares it. `bootstrap` is the env-var promotion (sign-in or verification, MB.60/MB.68); `admin` an admin's act on `/admin/users` (M5.8, MB.59), including the flag a role grant sets in the same write (MB.177), so the old `admin_role` value is not needed — the reader sees both rows at one instant by one actor; `invitation` an acceptance (a workspace invitation for `create_workspace`, M7.5; an admin invitation for `admin`, MB.70); `manual` a `psql` update, which must `select set_config('app.privilege_route', 'manual', true)` first or be refused.
- `created_by` is the actor: `app.current_user_id` when set, else `NEW.updated_by` (the seed's and a `psql` write's own stamp). `created_at` is `now()`. `updated_*` mirror them and the delete pair stays null: the full spread, one shape for every audited table, plus `set_updated_at` which never fires because `forbid_rewrite()` refuses every update and delete first.
- `note`: nullable text, from the setting `app.privilege_note` when the service published one. The copy keeps `admin_role_changes.note`. MB.59's confirmation offers an optional reason; MB.70 passes the invitation's note; M5.8 and M7.5 pass none.
- No index beyond the key for now; the page sorts by `created_at, id` and filters by `user_id`, so MB.199 adds `(user_id, created_at desc)` if the keyset helper wants one.

**`record_privilege_change()`**, `AFTER INSERT OR UPDATE ON users FOR EACH ROW`: for each watched column that changed (on insert, that is non-default: `role = 'admin'` or `can_create_workspace`), insert one row. Route missing or empty → `RAISE EXCEPTION 'a privilege change must declare its route'`, so a service that forgets `via` fails its own test. Better Auth's writes to `users` never touch either column, so they never reach the check; the trigger's `WHEN` clause keeps it off their path entirely.

**`withAudit(session, fn, { via, note? })`**: an optional third argument; when present, the one `set_config` statement publishes the route and the note too, transaction-local as the other two. The type is the `via` enum's union, so a service cannot misspell it.

## The invitations

**`invitations`**, in `src/modules/coven/schema/invitations.ts` — `id`, `workspaceId` (nullable → `workspaces.id`), `email`, `role` (nullable `workspace_role`), `tokenHash`, `expiresAt` (default seven days), `acceptedAt`, `acceptedBy`, `revokedAt`, `note` (nullable), `...auditColumns`.

- CHECK `invitations_tier`: `(workspace_id is null) = (role is null)`. CHECK `invitations_role_invitable`: `role is null or role in ('viewer', 'member')`, the allowed set as today. Unique partial index on `token_hash`, as both tables have.
- A null `workspaceId` is a site-tier invitation, which grants admin on acceptance; the pattern and the wording follow `ingredients`' compendium tier. `note` is allowed on both tiers; the workspace tier's UI may simply not offer it.
- Marked `namedWrites` (MB.198): the table is what authorises a membership or a grant, so it takes only its named writes, each deciding the tier from its proof:
  - `insertInvitation(membership, values)` fills `workspaceId` from the proof and requires `role`; `insertInvitation(admin, values)` writes a null pair. One function, two overloads, hashing the token in the repository as `insertAdminInvitation` does.
  - `acceptInvitation(token)` under no proof, matching a pending row whose address the session holds verified, as `acceptAdminInvitation` does today.
  - `revokeInvitation(membership, id)` ANDs the proof's workspace; `revokeInvitation(admin, id)` ANDs `workspace_id is null`.
  - Finders: `findInvitationByToken(token)` (every state, so the service can say which), `findPendingInvitationsInWorkspace(membership)`, `findPendingSiteInvitations(admin)`.
- Policy stays in two services: `coven`'s `createInvitation` / `revokeInvitation` (owner only, role chosen) and `identity`'s `createAdminInvitation` / `revokeAdminInvitation` (admin only, refused while paused). One accept service in `identity`, `acceptInvitation(session, token)`, which on a workspace row adds the membership and declares `via: 'invitation'` for the flag, and on a site row sets the role and declares the same route with the invitation's note; one route, `/invite/[token]`, redirecting by tier (into the workspace, or to `/admin`). If the branches grow apart, two thin pages over the one service.

## Tasks

### MB.194 — `user_privilege_changes`, the one privilege ledger (schema) · 2h

The table, append-only by the database, and the copy of both old ledgers. Expand step; no trigger on `users` yet.

- `claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md`: the model above; why a trigger (cannot be forgotten or bypassed; a privilege is a column, not a table); why the route is a published setting and refused when absent; why one mark and one trigger replace three markers; what was rejected (one table per privilege as built; merging by hand with services writing it, the first draft of this plan; folding the state ledgers in; the generic §13 history pulled forward whole). Copy this plan beside it as `mb.194-plan.md`.
- `src/modules/identity/schema/user-privilege-changes.ts`, from `workspace-creation-changes.ts` on staging, with the three enums.
- Migration by `npm run db:generate`, then hand-appended as `0043_admin-role-changes.sql` was: the `set_updated_at` trigger line; `CREATE OR REPLACE FUNCTION forbid_rewrite() RETURNS trigger … RAISE EXCEPTION` and `CREATE OR REPLACE TRIGGER forbid_rewrite BEFORE UPDATE OR DELETE ON user_privilege_changes`; and one data statement copying both old ledgers **with ids and stamps** so MB.197's final sweep can `ON CONFLICT (id) DO NOTHING`:
  - `admin_role_changes`: `bootstrap` → (`admin`, `grant`, `bootstrap`); `grant` → (`admin`, `grant`, `admin`); `revoke` → (`admin`, `revoke`, `admin`).
  - `workspace_creation_changes`: `grant` → (`create_workspace`, `grant`, `admin`); `revoke` → (`create_workspace`, `revoke`, `admin`); `invitation` → (`create_workspace`, `grant`, `invitation`); `admin` → (`create_workspace`, `grant`, `admin`).
  - The copy runs before `forbid_rewrite` is attached, or as plain inserts, which the trigger allows either way.
- Tests, after `admin-role-changes-schema.test.ts`: columns, enums, FK, no row after a fresh migration; the copy re-run through `statementsOfMigrationContaining`; and an `UPDATE` and a `DELETE` through the raw client both refused by `forbid_rewrite` (the `db` project, as every Postgres test). A catalogue-introspection test in `tests/db/` lists the append-only tables (this one) and asserts each carries the trigger, the sweep-over-database-objects pattern.
- `tests/support/db/table-metadata.ts` gains the table; `claude-docs/modules.md`'s identity row and DESIGN.md §5 gain the entry (the two old entries say "superseded, dropped by MB.197").
- Nothing writes it yet beyond the copy. `check:destructive-ddl` clean.

### MB.195 — Privilege changes record themselves, with their route · 3h

The trigger on `users`, the route in `withAudit`, and every writer that changes a privilege declaring one. Lands as one PR because the trigger refuses an undeclared change, so the declarations cannot trail it.

- Migration (`generate --custom`): `record_privilege_change()` and its trigger on `users`, with the `WHEN` clause on the two columns. The catalogue test from MB.194 gains "`users` carries `record_privilege_change`".
- `src/db/repository/write.ts`: `withAudit(session, fn, options?)` publishes `app.privilege_route` and `app.privilege_note` in the existing `set_config` statement (an empty note publishes an empty string, which the trigger stores as null); `src/db/repository/types.ts` and `src/db/types.ts` carry the `via` type and the options shape (type-only files, MB.108). `claude-docs/db/write-path.md` documents the two settings beside the other two.
- Declarations, each with a test that the row appears with its route and that the same call without the declaration is refused by the trigger (so the test proves the mechanism, not just the row):
  - M5.8's `workspace-creation.ts` (merged by then): `via: 'admin'`; its explicit insert into `workspace_creation_changes` is removed, and its "writes no row when refused" tests now read the new table.
  - The primary-admin promotion (`promotePrimaryAdmin` and MB.68's verification twin): `via: 'bootstrap'`.
  - `src/db/seed/standard.ts`: fixture E is inserted with `app.current_user_id` set to E and `app.privilege_route` to `bootstrap` for that statement, so the trigger writes E's two rows stamped as E; `insertMissingAdminBootstrap` goes. `tests/db/seed/index.test.ts` follows. The `seed:` scenarios that seed no admin are unaffected.
  - The two identity bootstraps outside `withAudit` (the sign-up hook, the seed): neither changes a privilege except the seed case above, asserted by the existing rule-3 tests staying green.
- `claude-docs/auth/admin-bootstrap.md`: the `psql` fallback now reads `select set_config('app.privilege_route', 'manual', true); update users …` in one transaction, and says why.
- Task entries corrected and `sync`ed in the same pass, since their ledger criteria change shape: MB.59 (declares `via: 'admin'` with the optional reason from its confirmation as `note`; writes no ledger row itself; a refused grant writes no row because no column changed), M7.5 (`via: 'invitation'`), MB.70 (`via: 'invitation'`, privilege `admin`, the invitation's note as `note`), MB.63 (the pause reads unchanged), MB.58 and MB.193 (a dated note: folded into MB.194). `node scripts/task-board.mjs sync MB.59 M7.5 MB.70 MB.63 MB.58 MB.193`.

### MB.196 — Nothing declares the two old ledgers · 1.5h

The code half of the drop. **No `db:generate` in this task** (it would emit the drops, which are MB.197's; `claude-docs/db/expand-contract.md`).

- Delete `admin-role-changes.ts`, `workspace-creation-changes.ts`, their schema tests, their rows in `table-metadata.ts`, `tests/modules/identity/schema/types.ts`'s `LedgerRow` if unused, and `NotAppendOnly` from `src/db/repository/types.ts` and the six signatures that carry it (MB.198 replaces the other two markers; this one simply has no table left).
- Docs: DESIGN.md §5 (two entries out) and §14; `claude-docs/modules.md`; `claude-docs/db/standard-scenario.md`; `claude-docs/db/migrations-and-scripts.md`; dated pointers atop `m2.9-granting-admin.md` and `m5.8-revoking-workspace-creation.md`.

### MB.197 — Drop `admin_role_changes` and `workspace_creation_changes` · 1h

**Merges into staging only after a release carrying MB.196 has reached production**, never in the same release (`admin_role_changes` is declared by the production deploy; the MB.137 worked case). `npm run db:generate` emits the two `DROP TABLE`s and two `DROP TYPE`s; hand-prepend MB.194's copy statement with `ON CONFLICT (id) DO NOTHING` as a final sweep for rows the pre-switch deploy wrote during rollout; `src/db/migrations/<tag>.ack.md` saying `Destructive DDL acknowledged: both ledgers were copied into user_privilege_changes by MB.194 and swept again here; nothing has declared them since MB.196`.

### MB.198 — One table mark replaces the two state-ledger markers · 2h

A mechanism plus a mechanical guard (the sweep-over-code rule), landing before MB.63 and MB.70 build on the named writes.

- `src/db/types.ts`: `export type NamedWrites = { readonly $writes: 'named' }` and `export type Generic = { $writes?: never }`. `$writes` sits beside Drizzle's `$inferSelect`, so no column key can collide. A one-line cast helper `namedWrites(table)` in a new runtime file `src/db/table-marks.ts` (schema files already import from `../../../db/audit`). No runtime property is added; drizzle-kit sees the same object.
- `admin-role-change-pauses.ts` and `admin-invitations.ts` wrap their `pgTable` in `namedWrites(…)` (MB.201's `invitations` is born marked, and MB.202 removes `admin-invitations.ts`). In `src/db/repository/types.ts`, `insert`, `update`, `updateById`, `softDelete`, `softDeleteByIds` and `delete` take `… & Generic`, and so do `insertInWorkspace`, `updateInWorkspace`, `updateByIdInWorkspace`, `softDeleteInWorkspace`, `softDeleteByIdInWorkspace`, `insertInCompendium`, `updateByIdInCompendium` and `softDeleteByIdInCompendium`, since a marked two-tier table must be off the proof-scoped methods too; `NotPauseLedger` and `NotInvitation` are deleted.
- The named writes move beside their finders: `pauseAdminRoleChanges` / `resumeAdminRoleChanges` to `src/db/repository/admin-roles.ts`, the invitation trio with `pendingInvitation` and `heldVerifiedBySession` to `admin-invitations.ts`, each exported as a function of a small writer context (`tx`, `session`, the local `insert` and `update`) that `writerFor` spreads in. `AuditWriter` and the twenty-three-method pin in `tests/db/repository/write.test.ts` are unchanged.
- Guard: `tests/support/db/probe-tables.ts` gains `switches = namedWrites(pgTable('repository_probe_switches', …))` (unscoped) and `tiers = namedWrites(pgTable('repository_probe_tiers', …))` with a nullable `workspaceId`; `write.test.ts`'s `@ts-expect-error` block asserts every generic method, unscoped, workspace-scoped and compendium-tier, refuses them, so `npm run typecheck` is the check. The per-table pins in `admin-role-change-pauses-schema.test.ts` and `admin-invitations-schema.test.ts` point at the mark.
- Docs: `claude-docs/db/write-path.md` ("Table marks"), `claude-docs/db/finder-convention.md`, `claude-docs/db/repository-files.md`, `claude-docs/db/invitations.md`, and the mb.62 record's `NotPauseLedger` sentences.

### MB.201 — `invitations`, one two-tier table (schema) · 2h

Expand step. Lands after MB.198 so the table is born marked, and before MB.59 (so MB.70 builds on it) and M7.2.

- `claude-docs/design-decisions/mb.201-two-tier-invitations.md`: the model in "The invitations" above; why now (nothing writes either table; five open tasks); the three things a reader must know; what was rejected (two tables with one convention; a `kind` column beside the nullable pair; placing the table in `identity`). Copy this plan's section beside it.
- `src/modules/coven/schema/invitations.ts` wrapped in `namedWrites(…)`, the two CHECKs and the partial unique index, `DEFAULT_LIFETIME` shared with nothing else once the old files go. Exported through `@/modules/coven`'s index for the identity service.
- Migration by `db:generate`, hand-appended with the `set_updated_at` trigger and a copy of both old tables with ids and stamps (`workspace_invitations` rows with their `workspace_id` and `role`; `admin_invitations` rows with a null pair and their `note`). Production holds no rows in either, so the copy is for staging and for the sweep in MB.203.
- Schema test after `admin-invitations-schema.test.ts` and `workspace-invitations`' own: columns, both CHECKs (a row with a workspace and no role is refused, and the reverse; `owner` is refused; a null pair is accepted), the index, the "only one column names a token" property, no row after a fresh migration. `table-metadata.ts`, `claude-docs/modules.md` (coven's row), DESIGN.md §5 (one entry; the two old ones say "superseded, dropped by MB.203").
- Nothing writes it yet. The old tables and MB.69's named writes are untouched.

### MB.202 — Invitations are written and read by tier · 2.5h

The code half. **No `db:generate`.**

- The repository: `insertAdminInvitation` / `acceptAdminInvitation` / `revokeAdminInvitation` and `findAdminInvitationByToken` become `insertInvitation` / `acceptInvitation` / `revokeInvitation` / `findInvitationByToken` with the proof overloads in "The invitations", in `src/db/repository/invitations.ts` (renamed from `admin-invitations.ts`, holding the named writes since MB.198), plus `findPendingInvitationsInWorkspace(membership)` and `findPendingSiteInvitations(admin)`. The twenty-three-method pin in `write.test.ts` keeps its count (three names change). Their tests move with them and gain the workspace tier: an owner's `Membership` fills the workspace and requires a role; a `SiteAdmin` writes the null pair; each tier's revoke cannot reach the other's row, asserted by direct id.
- Delete `admin-invitations.ts` and `workspace-invitations.ts` (schema) and their schema tests; `NotInvitation` is already gone (MB.198). `tests/support/db/table-metadata.ts`; `claude-docs/db/invitations.md` rewritten around one table; `claude-docs/db/repository-files.md`; DESIGN.md §5 and §7 (`InvitationResult`), §14; `claude-docs/modules.md`; a dated pointer atop the MB.61 record's "The admin invitation" and in M2.9's "B".
- Task entries corrected and `sync`ed: M7.2 (hash through `hashToken` in the repository, by the named insert), M7.3 and M7.6 (the named writes under `Membership`; the members page's pending list through `findPendingInvitationsInWorkspace`), M7.5 and MB.70 (one accept service and one `/invite/[token]` route, by tier; MB.70 keeps the pause, its `/admin/users` pending list through `findPendingSiteInvitations`, and the note), M7.1 and MB.69 (dated note: folded into MB.201). No page over past invitations is planned or added: the two lists are pending-only, where each is acted on, and the ledger holds every acceptance that granted something. `node scripts/task-board.mjs sync M7.1 M7.2 M7.3 M7.5 M7.6 MB.69 MB.70`.

### MB.203 — Drop `workspace_invitations` and `admin_invitations` · 1h

As MB.197, after a release carrying MB.202 has reached production: `db:generate` emits the two drops; the MB.201 copy prepended as a sweep with `ON CONFLICT (id) DO NOTHING`; the `.ack.md` sidecar. May share a release with MB.197 but is its own PR.

### MB.199 — Read the privilege ledger (service and GraphQL) · 2h

- `src/modules/identity/services/privilege-changes.ts`: `listPrivilegeChanges(session, { userId? }, page)` under `assertSiteAdmin`, reading through `findPage` (rule 8), newest first by `(created_at, id)`, optionally filtered by subject. `import 'server-only'`. Tests: an admin reads; a non-admin is refused with `Forbidden`, asserting why it could have succeeded (fixture E vs A, D); the filter; the order.
- GraphQL: `privilegeChanges(userId: ID, first, after)` as `t.pagedConnection`, with enum types for `privilege`, `change` and `via`, the nullable `note`, and `subject` and `actor` resolved through the existing per-request `User` loader (rule 9). `npm run codegen`, commit `src/gql/`. The SDL snapshot updates. M5.7's Pothos admin scope on the field, beside the service check. `tests/guards/pagination.test.ts` stays green.
- The index `(user_id, created_at desc)` if the keyset helper's plan wants it, as a migration in this task (additive).

### MB.200 — `/admin/privilege-changes`, the ledger page · 3h

- **One page, not one per privilege and not a merged activity feed**: one table, one reader, filtered by user (`?user=<id>`, the link from `/admin/users`) and by privilege (`?privilege=admin|create_workspace`). The pause stays stated in words on `/admin/users` (MB.63); invitations stay in their pending lists (M7.6 on the members page, MB.70 on `/admin/users`); an accepted invitation is already in the ledger as its `invitation` row. A combined feed, if ever wanted, is a `Derived` union read added as a section.
- Route `src/app/admin/privilege-changes/page.tsx`, a server component calling the service through `cache()`, numbered through `src/lib/pagination.ts`'s helper as every admin page is (MB.132). `AdminNav` gains `{ href: '/admin/privilege-changes', label: 'Privilege changes' }` after Users. MB.199's service and connection take the `privilege` filter as well as `userId`.
- Component `src/components/PrivilegeLedger/` (directory, `index.tsx`, `index.scss` with tokens only, `index.stories.tsx`, and `claude-docs/components/privilege-ledger.md`): a table of when, subject, privilege, change, route, actor and note (shown only when present); subject and actor link to their `/admin/users` row; an empty state in plain words; British spelling. Component tests by role and label only.
- `UserList` rows gain a "History" link (`href.ts`) to the page filtered by that user.
- Playwright: `tests/e2e/admin/privilege-changes.spec.ts` with `@axe-core/playwright`, run against the e2e container before done; a non-admin gets the styled not-authorised page.
- Story: name the acceptance test for the story this creates (a new story number in DESIGN.md §10, minted with the task: "As a site admin, I want to see every change to who is an admin and who may create a coven, with who made it and how, so that misuse comes to light").

## Where the work happens

Never in `/app`: it holds M5.8's branch now (a peer switched it mid-session) and M5.7 is in progress in `/home/node/worktrees/m5.7`. Every command runs with `cd <worktree>` first, since the shell's cwd resets to `/app` between calls.

1. **The minting pass, now**, on its own branch as MB.192's was (`feature/mint-mb.192`, PR #741): `git fetch origin staging`, then `git worktree add /home/node/worktrees/mint-privilege-ledger -b feature/mint-mb.194 origin/staging --no-track`; `cp -a /app/node_modules` into it and delete `node_modules/.cache/tsc/tsconfig.tsbuildinfo` (the copy carries `/app`'s incremental cache). The existing `mint` worktree stays untouched; removing worktrees is asked about, never assumed. The pass is doc-only, so verification is `format:check` and `lint`, not the coverage run. It stops at a commit-ready tree and reports; commit, push and the PR into `staging` wait for the owner's word.
2. **Each task in its own worktree** off the latest `origin/staging` once the mint PR has merged: `/home/node/worktrees/mb.194` on `feature/mb.194-privilege-ledger-schema`, and so on, through `/start-task` so the issue moves to `In Progress` in the same turn. MB.194 and MB.198 depend on nothing in flight and can start first; MB.195 waits for M5.8 to merge (it re-points M5.8's service); MB.201 waits for MB.198; the two drops wait for a release.
3. **Shared Postgres**: every `vitest run --project db` rebuilds the shared template, so each run is `flock /tmp/sorrel-vitest.lock npm run test:coverage` (that fixed path, which peer sessions also lock). A worktree has no `.env.local`; copy `/app`'s in before an e2e run (MB.200 only). A container rebuild deletes `/home/node/worktrees`, so commit before any rebuild.

## Minting

Per `.claude/rules/task-tracking.md`, "Minting a task", in one pass: entries and summary rows in `claude-docs/tasks/mb.md`, wave 8's row in `claude-docs/TASKS.md` (and M7.2's wave if MB.201 and MB.202 must move ahead of it), a paragraph in `claude-docs/waves/wave-08.md` (why the ledger sits between M5.8 and MB.59; why the invitations table sits before MB.70 and M7.2; why the two drops wait a release), the new story in DESIGN.md §10, then `gh issue create` × 10 (auto mode may refuse `gh` writes; if so hand the owner the commands), `estimate`, `reorder --apply`. Ten tasks, about twenty hours in all; the two drops are an hour each and wait on a release.

## Verification, per task

- `npm run db:reset` on a fresh local database, then `npm run test:coverage`, never plain `test`. The catalogue tests for the two triggers and the refused update/delete live in the `db` project.
- `npm run pre-commit`. The `@ts-expect-error` pins fail typecheck if the mark stops refusing.
- `npm run check:destructive-ddl`: clean for every task but MB.197 and MB.203, which pass with their sidecars.
- `npm run build` after MB.195, MB.198, MB.202, MB.199 and MB.200.
- MB.202 by hand once: through Altair at `/api/graphql`, no mutation can reach `invitations` but the named ones, and `write.test.ts`'s type pins fail typecheck if a generic method is widened to take it.
- MB.195 by hand once: approve a user on `/admin/users` in `npm run dev`, then `select privilege, change, via, created_by from user_privilege_changes order by created_at desc limit 3`; then in `psql`, `update users set can_create_workspace = true where …` without the setting is refused, and with `set_config('app.privilege_route', 'manual', true)` records `manual`.
- MB.200: the Playwright spec above, run from here against the remote browser server; axe clean.
