## Audit columns and `applyAudit`

`src/db/audit.ts` exports two column-set _factories_, and
`src/modules/identity/schema/users.ts` exports the two _instances_ every table
spreads, built by calling them with `() => users.id`:

- **`auditStampColumnsReferencing(usersId)`** → `auditStampColumns` — `createdAt`,
  `createdBy`, `updatedAt`, `updatedBy`.
- **`deletionColumnsReferencing(usersId)`** → `deletedAt` and `deletedBy`, which
  `users.ts` spreads after the stamp _instance_ to make `auditColumns`. Building
  the six as the four plus two stops the two sets drifting.

The factories take the referenced column rather than importing `users`, so
`audit.ts` depends on nothing in a module. The instances live beside `users`
because every stamp references it, and a table imports them from there —
`import { auditColumns } from '../../identity/schema/users'`, relative, since the
schema graph is what drizzle-kit loads.

**The factories' keys are the only list of the audit field names.**
`src/db/types.ts` reads `StampField` and `DeletionField` off their return types
and builds `AuditFields` from them; `applyAudit`'s overloads `Pick` those, the
seed's `InsertStamps` is `StampField`, and the runtime `AUDIT_FIELD_NAMES` that
`applyAudit` strips a payload of is `Object.keys` of the two factories' output,
built with a reference that is never resolved. A column renamed or added in a
factory reaches all of them without a second edit.

Every table spreads `...auditColumns` **except two join tables**:
`ingredient_categories` and `spell_categories` spread `...auditStampColumns` and
are hard-deleted (["Hard delete on two join tables"](hard-delete-join-tables.md)).
`workspace_members`, `ingredient_folk_names` and `spell_steps` are _not_ in that
set.

**Where a table's audit columns are proved.** Once, in
`tests/db/audit-columns.test.ts`'s catalogue sweep: every audited table in the
migrated database carries the set — the four stamps required, the delete pair
nullable but on the two hard-deleted joins, every id a key to `users.id` — and no
unaudited table carries an audit id. That each table spreads them is its module
schema test's exact column set, `[...OWN, ...AUDIT_COLUMNS]` or the stamp set.
`tests/db/audit.test.ts` keeps `applyAudit` alone
([`testing/db-harness.md`](../testing/db-harness.md), "The db test harness").

`createdBy`/`updatedBy`/`deletedBy` carry `.references((): AnyPgColumn =>
users.id)` per DESIGN.md §5, including for `users`' own rows
(`users.created_by -> users.id`, a genuine self-reference). Drizzle's thunk defers
evaluation past module load, and the explicit `AnyPgColumn` return annotation
stops TypeScript reporting a circular reference. `src/db/bootstrap.ts` exports
`BOOTSTRAP_USER_ID`, a fixed UUID shared between the seed and anything that needs
to identify that row. The bootstrap user has no pre-existing creator, so it
inserts itself as its own `created_by`/`updated_by` in one statement (`INSERT INTO
users (id, created_by, updated_by) VALUES ($1,$1,$1)`), which Postgres accepts
because a `FOREIGN KEY` is checked at statement end.

`applyAudit(operation, payload, session)` is the pure helper `withAudit` calls
before every write. It takes `'insert' | 'update' | 'delete'`, a payload, and
`{ userId }`, and returns the payload with any audit fields the caller supplied
stripped out and replaced with the correct ones for that operation:

- `insert` sets `createdAt`/`createdBy`/`updatedAt`/`updatedBy` from `session`.
- `update` sets only `updatedAt`/`updatedBy`, leaving `createdAt`/`createdBy`
  absent so the `UPDATE` never touches them. The `updatedAt` it sets is then
  overwritten by the database (["`updated_at` is the database's"](updated-at.md)),
  so the column carries one clock rather than two.
- `delete` (soft delete) sets only `deletedAt`/`deletedBy`.

Audit ids never come from the caller: `applyAudit` deletes any of the six audit
keys off the incoming payload before setting the ones the operation calls for, so
a payload smuggling `createdBy` from a request body is ignored in favour of
`session.userId`, per CLAUDE.md rule 3.
