## The db test harness — `tests/support/db/` (MB.51)

Two modules the `tests/db/` and `tests/modules/` files share, a sweep built
on them, and the setup inserter. They sit in their own directory under `tests/support/` because
the rest of `tests/support/` may not import `drizzle-orm` at runtime —
`.oxlintrc.json`'s `no-restricted-imports` bans it everywhere but the database
layer and its tests (CLAUDE.md rule 4), and
`tests/guards/lint-db-client-boundary.test.ts` probes that ban by writing a
runtime import into `tests/support/` and asserting the lint fires.
`getTableConfig` from `drizzle-orm/pg-core` is what `table-metadata.ts` is
made of, so the database-layer override names `tests/support/db/**/*.ts`
beside `tests/db/**/*.ts` and `tests/modules/**/*.ts`;
`lint-db-client-boundary.test.ts` lists `tests/support/db` among its `EXEMPT`
probes, which proves the override actually reaches the harness.
`vitest.config.mts` collects only `*.test.ts` files, so a module there is never
run as a test.

- **`database.ts` — `useTestDatabase(bind)` and `failureOf(work)`.**
  `useTestDatabase` registers a `beforeAll` that opens one `postgres` client
  (reading `DATABASE_URL` inside the hook, after `db-setup.ts` has pointed it
  at the worker's clone) and an `afterAll` that ends it, and returns the
  catalogue reads — `columnNames(table)`, `indexRow(table, name)`,
  `uniqueIndexNames(table)` — closing over that client. **It is per file, not
  per worker, and that is not a style choice:** `db-setup.ts` re-clones the
  worker's database `WITH (FORCE)` before every test file, which terminates
  any session still open on it, so a connection shared across files would be
  killed by the next file's clone. Vitest's default `sequence.hooks` is
  `stack`, so a call at the top of a file opens before the file's own
  `beforeAll` (the ones that read seeded ids by name) and closes after its
  `afterAll` — no reordering needed. It hands the client to a `bind` callback
  rather than returning it so a file's existing `let sql` and every
  `` sql`…` ``, `sql(row)`, `sql(table)`, `sql.begin` and `sql.unsafe` call on
  it stay exactly as written:

  ```ts
  let sql: ReturnType<typeof postgres>;
  const catalogue = useTestDatabase((client) => (sql = client));
  ```

  `repository/*.test.ts` (through `tests/support/db/probe-tables.ts`), `updated-at-trigger.test.ts`,
  `test-database-isolation.test.ts`, `seeded-template.test.ts` and
  `tests/db/seed/*` still open their own client — the isolation test's subject
  _is_ the connection, and the others truncate everything first.

- **`table-metadata.ts` — the Drizzle half.** `tableFacts(table)` is
  `getTableConfig` plus the lookups every schema test used to build by hand:
  `byName`, `byIndexName`, `foreignKeyByColumn` (each entry
  `{ column, name, foreignColumnName, foreignTable }`) and
  `nonAuditForeignKeys`, the table's own references with the audit ids
  filtered out. `AUDIT_COLUMNS`, `STAMP_COLUMNS` and `DELETE_COLUMNS` are
  **literal string lists, deliberately not derived from `src/db/audit.ts`**:
  a test comparing a table against `Object.keys(auditColumns)` passes for any
  value of `auditColumns`, an empty one included. `AUDITED_TABLES` (twenty-six
  names, the two hard-deleted join tables among them) and
  `UNAUDITED_TABLES` (Better Auth's `accounts`, `sessions`, `verifications`)
  moved here from `updated-at-trigger.test.ts` so the trigger sweep and the
  audit-columns sweep read one list.

- **`insert-ingredient.ts` — `insertIngredient(sql, fixture, author)`** (MB.101).
  The setup inserter for an ingredient and its children, on the raw client and
  in one transaction. Why setup goes this way rather than through `withAudit`
  is under ["Fixture factories"](fixture-factories.md), where the convention is stated; its test
  is `tests/db/insert-ingredient.test.ts`, under `tests/db/` because that is
  the project with a database.

- **`insert-spell.ts` — `insertSpell(sql, fixture, author)`** (M5.3). The
  same for a spell: its row, its layers and its assigned categories, on
  `insertIngredient`'s terms. `author` is `created_by`, which is whom a
  private spell is readable by, and a layer's ingredient id is written as
  given, which is how a test writes the cross-coven link a finder must
  withhold. Its test is `tests/db/insert-spell.test.ts`.

- **`tests/db/audit-columns.test.ts` — one sweep instead of a copy per
  file.** It holds two transcribed lists of Drizzle table _objects_ — the
  twenty-four six-column tables and the two four-column join tables — asserts
  both non-empty and their names equal to `AUDITED_TABLES`, and loops the same
  expectations over each, on **both sides**: the schema (the columns are
  defined, the stamps `NOT NULL`, `deleted_at` nullable or absent, every
  `*_by` a foreign key to `users.id`, `deleted_by` absent on a join table) and
  the catalogue (`information_schema.columns` carries the names,
  `referential_constraints` shows each `*_by` referencing `users(id)`). Both
  sides because they can disagree: a spread deleted from a schema file leaves
  the migrated database's columns standing, and a catalogue-only sweep would
  stay green. The `UNAUDITED_TABLES` are asserted to exist and carry no `*_by`
  column, which is what stops the catalogue half being satisfied by a table
  with nothing to check. The per-file `spreads the shared audit columns` /
  `references users.id from every audit id` tests are gone; a schema test now
  asserts the table's _own_ columns, constraints and behaviour. A new
  audited table added without `...auditColumns` fails this file, where
  before it would simply have had no test.
