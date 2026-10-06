# MB.62 — The admin-role-change pause is a ledger, not a settings row

**Status:** decided · **Date:** 2026-10-06

M2.9 gave the primary admin a switch that stops every other admin granting
or revoking admin while a rogue admin is dealt with
([`m2.9-granting-admin.md`](m2.9-granting-admin.md), "Granting"). It
specified the switch as a one-row `site_settings` table, its one row seeded by
the migration, holding `adminRoleChangesPaused`, and MB.62 was written to
build that. Building it showed the row could not be seeded, and the owner
chose a different shape. DESIGN.md §5, `admin_role_change_pauses`, carries the
model; this record carries why.

## The problem with one seeded row

Every audited table's `created_by` and `updated_by` are `NOT NULL` foreign
keys to `users` (CLAUDE.md rule 3). A migration that writes the settings row
has to stamp it as somebody, and on a fresh database nobody exists yet:
migrations run before any seed, so the seed's bootstrap user is not there.
The test template, CI's databases, `db:reset` and any new environment are all
migrated empty, so the migration would fail on every one of them. Staging and
production already hold the bootstrap user, which is why the problem only
shows on a fresh database.

The options weighed, briefly:

- **The migration inserts the bootstrap user first**, if missing, then the
  row. It works, but the bootstrap user's fields would be written in a frozen
  migration as well as in the seed, and on a fresh database the migration's
  copy would win, since the seed skips a row it finds. It would also be a
  third writer of `users` outside `withAudit`, beside the two rule 3 names.
- **Move the bootstrap user into a migration outright**, dropping it from
  the seed. One definition, but a larger change to the seed module for a
  switch's sake.
- **The seed writes the row.** A database that is migrated but not seeded has
  no row, so "not paused" would have two spellings, a `false` and an absence,
  and MB.63's update would match nothing there.
- **Treat absence as unpaused and upsert on the first flip.** The same two
  spellings, and an insert the table task had ruled out.
- **Relax the audit stamps on this one table.** Breaks the one shape every
  audited table shares, and the sweep tests with it.

## Decided

**One row per pause.** `admin_role_change_pauses`: `id`, `ended_at` and
`ended_by` (null while the pause holds), and the full `...auditColumns`
spread. Pausing inserts a row, so `created_by` is who paused and `created_at`
when; resuming stamps `ended_at` and `ended_by`. "Paused" is a live row with
no `ended_at`. Nothing is seeded, because no row means nothing has ever been
paused, which is the one state a fresh database can be in. The bootstrap
problem disappears rather than being worked around.

- **At most one open pause**, by a unique index on a constant,
  `((true)) WHERE ended_at IS NULL AND deleted_at IS NULL`, so a second open
  pause is a constraint error, the guarantee the single-row check was for.
  Partial on `deleted_at` as rule 4 has every unique index.
- **The ended pair goes together**, by a CHECK:
  `(ended_at IS NULL) = (ended_by IS NULL)`.
- **Its own pair rather than the update stamps.** Ending is the only update
  the table takes, so `updated_by` would say the same thing today, but
  whether a pause holds is then a column rather than an inference from which
  write came last.

**The history is kept, and that is a by-product, not a feature.** MB.63's
entry had called a history of flips v2's edit history and declined to keep
it. A ledger keeps it anyway, because each pause is its own row: who paused,
who resumed, and when, for the same reason MB.58 keeps the role ledger, since
a single row's `updated_by` is overwritten by the next flip. Nothing in v1
lists it; MB.63 reads only the open pause.

**`site_settings` is not built.** It was a home for site-wide settings, and
the pause was its only tenant; nothing else in v1 names one. A later setting
that is a value rather than an event can make its own case for the table
then.

## The repository

The table is reached through three named calls, each under the `SiteAdmin`
proof, since only an admin's act asks:

- `findOpenAdminRoleChangePause(admin)`, the open pause or `undefined`;
- the writer's `pauseAdminRoleChanges(admin)`, which opens one and returns no
  row while one is already open (`ON CONFLICT DO NOTHING`, so the caller's
  transaction is not failed by a double click);
- the writer's `resumeAdminRoleChanges(admin)`, which ends the open pause,
  stamping `ended_at` now and `ended_by` from the session, and returns no row
  when none is open.

`NotPauseLedger`, `{ endedAt?: never }`, takes the table off the writer's
generic insert, both updates, both soft deletes and the hard delete, as
`NotAppendOnly` does for MB.58's ledger. Without it the generic insert would
take a pause already ended, and the generic update would reopen one or
backdate it. The two named writes take the writer from fifteen methods to
seventeen, which `write.test.ts` pins as a decision.

Who may pause is MB.63's, as before: only the primary admin may pause or
resume, and only the primary admin is exempt from a pause. DESIGN.md §5 had
said the pause covered the primary admin too; M2.9's record and MB.63's entry
had the exemption, and this PR corrects §5 to match them, on the owner's
call.
