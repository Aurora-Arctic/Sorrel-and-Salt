# MB.194 — One privilege ledger, written by the database

**Status:** decided · **Date:** 2026-10-10

Two tables recorded who changed whose privileges: MB.58's
`admin_role_changes`, one row per change to `users.role`, and MB.193's
`workspace_creation_changes`, one row per change to
`users.can_create_workspace`. They had one shape, each had its own task,
schema file, schema test, enum and doc entry, and each relied on the service
that changed the column remembering to write the row. A third privilege would
have been a third of everything. The owner asked how to stop ledgers
multiplying; this record is the answer, reached in
[`mb.194-plan.md`](mb.194-plan.md). DESIGN.md §5, `user_privilege_changes`,
carries the model.

## The model

**One table, `user_privilege_changes`**: `userId`, `privilege` (`admin` |
`create_workspace`), `change` (`grant` | `revoke`), `via` (`bootstrap` |
`admin` | `invitation` | `manual`), `note` (nullable), and the full audit
spread. `created_by` is the actor and `created_at` when. `privilege` names the
`users` column a change was to, `role` as `admin` and `can_create_workspace`
as `create_workspace`.

**Filled by a trigger on `users`** (MB.195), `AFTER INSERT OR UPDATE`, one row
per watched column that changed, `change` derived from the old and new values.
Nothing in the application inserts into it.

**The route is declared, and refused when absent.** `via` is read from the
transaction-local setting `app.privilege_route`, which `withAudit(session, fn,
{ via, note })` publishes beside `app.current_user_id`, and `note` from
`app.privilege_note`. A privilege change that declared no route raises.

**Append-only by the database.** `forbid_rewrite()`, attached `BEFORE UPDATE
OR DELETE`, raises on every update and delete from every client. TRUNCATE is
left open, as the test harness's resets need it.

The two old ledgers were copied in by MB.194's migration with their ids and
stamps: `admin_role_changes`' `bootstrap`, `grant` and `revoke` become `admin`
rows with that change, by `bootstrap`, `admin` and `admin`;
`workspace_creation_changes`' `grant` and `revoke` become `create_workspace`
rows by `admin`, its `invitation` a grant by `invitation`, and its `admin` (a
user made admin while the flag was off, MB.177) a grant by `admin`. The old
`admin` change needs no route of its own: the reader sees the `admin` grant
and the `create_workspace` grant at one instant by one actor. MB.196 removes
the code that names the old tables and MB.197 drops them, sweeping again with
`ON CONFLICT (id) DO NOTHING` for rows the outgoing deploy wrote mid-rollout.

It is not §13's edit history. That records every column of every table as a
revision; this records two columns of one table as a privilege's account, the
question an admin asks when misuse is suspected.

## Why a trigger

- **It cannot be forgotten.** Every path that changes a privilege column
  writes a row: a service, the seed, a later task's new writer, and a `psql`
  break-glass update. With services writing the ledger, each new writer was a
  place to forget it, and a `psql` fix left no trace at all.
- **It cannot be bypassed.** A row the database writes in the same
  transaction as the change cannot be skipped by a caller that holds a
  writer, and the ledger cannot be edited afterwards by one that holds a
  client.
- **A privilege is a column, not a table.** A third flag on `users` is a value
  in `user_privilege` and a line in the trigger, not a table task.

The write path already reserved `app.current_user_id` for this
(`src/db/repository/write.ts`, "what makes the v2 history trigger … one
migration"): the trigger stamps the row with the actor the transaction
published, or with the row's own `updated_by` where none was published, as the
seed and a `psql` fix stamp themselves.

## Why the route is declared, and refused when absent

The trigger knows which column changed and who changed it, but not how the
change came about: an admin's act, an invitation accepted, the primary
admin's bootstrap and a hand-run fix all set the same column. The service
knows, so it says, through a setting published in the same `set_config`
statement as the actor, transaction-local as that is. A missing route is an
error rather than a default: a default would let a new writer record a wrong
route silently, where an error fails that writer's first test, and a `psql`
fix has to say `manual` before it may change a privilege at all.

Better Auth's own writes to `users` (sign-up, profile, verification) touch
neither column, and the trigger's `WHEN` clause keeps them off its path, so
they need declare nothing.

## Why one database trigger replaces the type markers

Append-only was the writer's job: `NotAppendOnly`, `{ change?: never }`, took
any table with a `change` column off every generic update and delete. It keyed
on an incidental column name, bound only the repository, and bound nothing a
`psql` session or the seed did. `forbid_rewrite()` makes an update or delete
impossible from any client, so `NotAppendOnly` has no table left once the old
ledgers go (MB.196). The two state ledgers, the admin-role-change pause and
the invitations, are written through named methods rather than kept
append-only, and take a single `namedWrites` mark in place of their two
markers (MB.198).

## What was rejected

- **One table per privilege, as built.** Each new flag a table, a migration, a
  schema test, an enum and a doc entry, and a reader of "what happened to this
  user" joining all of them.
- **One table, written by services.** The first draft of the plan: it merged
  the tables but kept every writer responsible for its row, so a forgotten
  insert or a `psql` fix still left no trace, and append-only stayed a matter
  of types.
- **Folding the state ledgers in.** The pause and the invitations hold state
  that moves (open to ended, pending to accepted or revoked), not acts, and
  have no sibling to merge with.
- **Pulling §13's generic edit history forward whole.** It answers a different
  question, every column of every table, at a cost v1 does not need; this
  table can be read beside it when it comes.
- **Defaulting the route.** Covered above: a wrong route recorded silently is
  worse than a writer that fails its own test.
