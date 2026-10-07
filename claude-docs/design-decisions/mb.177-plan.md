# MB.177 — Every admin holds `canCreateWorkspace`

## Context

The spec already says admins may create a coven "regardless of the flag" (DESIGN.md §5), and M6.7's planned gate is "`canCreateWorkspace` **or** the admin role". The rows do not say so:

- `grantAdmin` in `src/modules/identity/services/admin-role.ts:75-77` writes only `role`, so the primary admin promoted through `ADMIN_BOOTSTRAP_EMAIL` holds `false`.
- Fixture E is seeded `role: 'admin', canCreateWorkspace: false` on purpose (`src/db/seed/standard.ts:71-78`, `claude-docs/db/standard-scenario.md`), so that it exercises M6.7's "or admin" branch.
- No migration backfilled existing admins. Migration 0043 wrote ledger rows only.
- As a result, admins show "No" on `/admin/users` and appear under `?awaiting` (`src/db/repository/users.ts:80`).

**Decision (the user's):** make it an invariant rather than a second rule.

- A CHECK constraint on `users` makes "admin without the flag" impossible.
- Existing admins are backfilled.
- Promotion sets both columns in one write.
- E is seeded `true`.
- M6.7's gate reads the flag alone, and the "or admin" prong is dropped.

The awaiting filter becomes right as a side effect. This is a new task, **MB.177**, in Wave 8 between MB.53 and M5.8. M5.8 is next to touch the flag, and its revoke now has to respect the constraint. Re-check the board and `TASKS.md` for the next free id right before minting.

Nothing creates a workspace yet (M6.7 is Wave 9), so no runtime gate changes. The work is schema, data, the one promotion write, the seed, and docs.

## Branch & tracking

1. Run `/create-feature` off the latest `staging` as `feature/mb.177-every-admin-holds-workspace-creation`. The current branch, MB.53, is clean and unrelated.
2. Mint MB.177 as `.claude/rules/task-tracking.md` "Minting a task" describes: `gh issue create … --milestone "<Wave 08 milestone>"`, then `estimate MB.177 2`, then `reorder --apply`. Write the docs row first.
   - Auto mode refuses `gh` writes (memory), so hand the user the command if it is blocked.
3. Mark the issue In Progress once work starts.

## Implementation (TDD: failing tests first)

### 1. Schema constraint — `src/modules/identity/schema/users.ts`

Add to the table's extras, beside `users_email_lower_case`:

```ts
// Every admin may create a workspace, held by the row rather than by a second
// rule beside the flag (claude-docs/design-decisions/mb.177-…md).
check('users_admin_can_create_workspace', sql`${table.role} <> 'admin' or ${table.canCreateWorkspace}`),
```

The constraint covers soft-deleted rows too. It is a fact about the row, not a uniqueness rule, so it does not go partial.

### 2. Migration — `npm run db:generate` → `src/db/migrations/0049_<tag>.sql`

Hand-edit the generated file so that the backfill precedes `ADD CONSTRAINT`. 0043 is the model for comments and stamping:

```sql
-- MB.177: … every admin row, soft-deleted included, since the CHECK binds them all;
-- stamped as that admin, as 0043's backfill was.
UPDATE "users" SET "can_create_workspace" = true, "updated_by" = "id"
WHERE "role" = 'admin' AND "can_create_workspace" = false;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_can_create_workspace" CHECK (…);
```

- The migration is additive, so no `.ack.md` is needed. Confirm with `npm run check:destructive-ddl`.
- Confirm that `scripts/check-migration-order.ts` passes.

### 3. Promotion — `src/modules/identity/services/admin-role.ts`

`grantAdmin` writes `{ role: 'admin', canCreateWorkspace: true }` in its one `withAudit` update. Update the comment ("The one role write…") to say that it also sets the flag the constraint requires. MB.59's `setUserRole` will inherit this when it replaces `grantAdmin`.

### 4. Seed

- `src/db/seed/standard.ts`: set E's `canCreateWorkspace` to `true`, and rewrite the `FIXTURE_USERS` doc comment. A–D earned the flag by membership, and E holds it as every admin must.
- `src/db/seed/minimal.ts` and `bootstrap-admin.ts` seed `role: 'user'`, so they need no change. Verify this.

### 5. Tests

**New:**

- `tests/modules/identity/schema/users-schema.test.ts`, a db-project test with these cases:
  - An `insert` of `role = 'admin', can_create_workspace = false` fails with `23514` naming `users_admin_can_create_workspace`.
  - An `update users set role = 'admin'` on a flag-less user fails the same way.
  - Preconditions are asserted, so the test cannot pass vacuously: the same row inserts with the flag set, and a `user` without the flag inserts. Use the existing `failureOf` helper.
- The backfill, in the same file or beside it, following `admin-role-changes-schema.test.ts`'s "the backfill" pattern (`statementsOfMigrationContaining` plus `sql.unsafe`):
  - Drop the constraint inside the test DB, or insert before re-adding it, to plant a flag-less live admin and a flag-less soft-deleted admin plus a flag-less user.
  - Run the `update` statement.
  - Assert that both admins are now `true` and stamped as themselves, and that the user is untouched.
  - The test databases are per-worker clones, so altering the constraint in-test is safe. Confirm in `tests/support/db/database.ts`.
- `tests/modules/identity/services/admin-role.test.ts`: both promotions leave `can_create_workspace = true` on a user who started `false`, with the precondition asserted.

**Updated, because they break under the constraint or the seed change:**

- `tests/db/seed/standard.test.ts:128-138`: E is now `true`, so the case reads "every fixture user holds the flag".
- `tests/modules/identity/services/user-list.test.ts:140-153`: recheck the awaiting count. E leaves the awaiting list, and the "Pending Fixturewort" rows keep the filter non-vacuous.
- Raw-SQL admin rows must also set `can_create_workspace = true`:
  - `admin-role.test.ts` `insertUser(…, 'admin')`
  - `tests/db/sign-in-landing.test.ts` `insertVerified` and its `update users set role = 'admin'` (:131)
  - `admin-role-changes-schema.test.ts` (:159 deleted admin, :176 bootstrap-as-admin)
  - `tests/e2e/session.ts` `signInAs(…, 'admin')`
- Grep `tests/` for `role = 'admin'` and `'admin',` inside `insert into users` to catch any stragglers.

### 6. Docs, in the same PR

- **`claude-docs/design-decisions/mb.177-admins-hold-workspace-creation.md`** (new): the decision, why an invariant beats "flag or admin", and what it costs. E no longer distinguishes the two prongs, which is acceptable because there is only one prong. M5.8 cannot revoke an admin's flag.
- **`claude-docs/design-decisions/mb.177-plan.md`**: a copy of this plan (memory: store the plan beside the records).
- **`claude-docs/DESIGN.md`**:
  - Rewrite the §5 `canCreateWorkspace` paragraph (~:245). The flag is what lets anyone create, admins included. Every admin holds it, by a CHECK (MB.177). Granting admin sets it, and revoking admin leaves it.
  - Drop "or admin" from the `createWorkspace` SDL comment (~:820) and from the Story 3 acceptance line (~:1380).
- **`CLAUDE.md` domain invariant (line 68)**: "…or being made admin (MB.59)" becomes "or being made admin, which a CHECK makes every admin hold (MB.177)". Keep it to one line.
- **`claude-docs/tasks/m6.md` M6.7**:
  - The gate becomes "gated on `canCreateWorkspace`, which every admin holds (MB.177)".
  - The acceptance criterion "An admin can create without holding the flag" becomes "The gate reads the flag alone, never `role`; E creates through it".
- **`claude-docs/tasks/m5.md` M5.8**: add a criterion. Revoking the flag from an admin is refused with an explaining error, not a constraint violation, and revoking admin first is the route.
- **`claude-docs/tasks/mb.md`**:
  - Add a new **MB.177** entry (story, notes and acceptance criteria as below) and a summary-table row.
  - Add a note on MB.59 that the constraint already enforces its "grant sets `canCreateWorkspace`".
- **`claude-docs/design-decisions/m2.9-granting-admin.md` "Granting" (:326-330)**: replace "the flag is not what lets them" with a pointer to MB.177. This is a live record, and correcting it is allowed.
- **`claude-docs/db/standard-scenario.md`**: rewrite the "`canCreateWorkspace` follows the invite gate" paragraph. E is seeded `true` because the CHECK requires it.
- **`claude-docs/auth/admin-bootstrap.md` (~:461)**: the stop-gap `psql` `UPDATE` must set `can_create_workspace = true` as well.
- **`claude-docs/TASKS.md`** and **`claude-docs/waves/wave-08.md`**:
  - Insert MB.177 between MB.53 and M5.8 in the execution order.
  - Add a sentence to wave-08 explaining why it precedes M5.8.
  - Add the id to the milestone description's first line.
- Run `sync MB.177` after the entry is final, and `sync M6.7 M5.8 MB.59` because their entries changed.

**MB.177 acceptance criteria (for the entry):**

- A CHECK on `users` refuses any row with `role = 'admin'` and `can_create_workspace = false`, asserted by insert and by update, with the preconditions shown.
- The migration sets the flag on every existing admin, soft-deleted included, before adding the constraint.
- Promotion at sign-in or at verification sets both columns in one audited write.
- Fixture E is seeded with the flag. `/admin/users?awaiting` lists no admin.
- DESIGN.md, CLAUDE.md, M6.7, M5.8 and the M2.9 record say "the flag, which every admin holds".

## Verification

- `npm run db:migrate` against local Postgres, then confirm `select role, can_create_workspace from users where role='admin'` shows all `true`. Run `npm run db:reset` for the `standard` seed.
- `npm run test:coverage`. It needs the db project. Use flock if running in parallel (memory).
- `npm run check:destructive-ddl` (clean) and `npm run pre-commit`.
- Run `npm run dev` and open `/admin/users` as E. The admin row reads "Yes", and `?awaiting=1` excludes it.
- Do not open a PR until the user asks (memory).
