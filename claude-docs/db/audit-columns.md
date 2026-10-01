## Audit columns and `applyAudit` (M1.15, FKs restored MB.5, split MB.34)

`src/db/audit.ts` exports two column-set _factories_, and
`src/modules/identity/schema/users.ts` exports the two _instances_ every
table spreads, built by calling them with `() => users.id`:

- **`auditStampColumnsReferencing(usersId)`** → `auditStampColumns` —
  `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- **`deletionColumnsReferencing(usersId)`** → `deletedAt` and `deletedBy`,
  which `users.ts` spreads after the stamp _instance_ to make
  `auditColumns`. The six-column set is the four-column one plus two, from
  the same builders, and `tests/db/audit.test.ts` asserts that identity.

The factories take the referenced column rather than importing `users`, so
`audit.ts` depends on nothing in a module; the instances live beside `users`
because every stamp references it, and a table imports them from there —
`import { auditColumns } from '../../identity/schema/users'`, relative, since
the schema graph is what drizzle-kit loads.

Every table spreads `...auditColumns` **except two join tables**:
`ingredient_categories` and `spell_categories` spread `...auditStampColumns`
and are hard-deleted (MB.34) — see ["Hard delete on two join tables"](hard-delete-join-tables.md) for
why, and note that `workspace_members`, `ingredient_folk_names` and, since
MB.110, `spell_ingredients` are _not_ in that set. Writing the six columns as the
four plus two rather than listing them twice is what stops the two sets
drifting, and `tests/db/audit.test.ts` asserts each stamp column is literally
the same builder object in both.

`createdBy`/`updatedBy`/`deletedBy` carry
`.references((): AnyPgColumn => users.id)` per DESIGN.md §5, including for
`users`' own rows (`users.created_by -> users.id`, a genuine self-reference,
since `users.ts` spreads the instance it builds from its own id). Drizzle's
thunk defers evaluation past module load, so the self-reference is fine; the
explicit `AnyPgColumn` return annotation is what stops TypeScript reporting a
circular reference trying to infer it. `src/db/bootstrap.ts`
exports `BOOTSTRAP_USER_ID`, a fixed UUID shared between M1.21's seed and
anything that needs to identify that row — the bootstrap user has no
pre-existing creator, so it inserts itself as its own `created_by`/
`updated_by` in one statement (`INSERT INTO users (id, created_by,
updated_by) VALUES ($1,$1,$1)`), which Postgres accepts because a `FOREIGN
KEY` is checked at statement end, not before the row exists — verified
against a live Postgres by applying MB.5's migration in a rolled-back
transaction and confirming both the self-referencing insert and the
rejection of a nonexistent `created_by` uuid.

`applyAudit(operation, payload, session)` is the pure helper `withAudit`
(M1.16) calls before every write — it takes `'insert' | 'update' |
'delete'`, a payload, and `{ userId }`, and returns the payload with any
audit fields the caller supplied stripped out and replaced with the correct
ones for that operation:

- `insert` sets `createdAt`/`createdBy`/`updatedAt`/`updatedBy` from `session`
- `update` sets only `updatedAt`/`updatedBy`, leaving `createdAt`/`createdBy` absent from the returned payload so the `UPDATE` never touches them — and the `updatedAt` it sets is then overwritten by the database (see ["`updated_at` is the database's"](updated-at.md)), so the column carries one clock rather than two
- `delete` (soft delete) sets only `deletedAt`/`deletedBy`

Audit ids never come from the caller: `applyAudit` deletes any of the six
audit keys off the incoming payload before setting the ones the operation
calls for, so a payload smuggling `createdBy` from a request body is ignored
in favour of `session.userId`, per CLAUDE.md rule 3.
