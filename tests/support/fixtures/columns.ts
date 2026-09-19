// M1.25 — a fixture states fields; the schema tests name columns.
//
// The db tests under tests/db/ talk to Postgres through `postgres` directly
// rather than through Drizzle, so they insert by column name: `canonical_name`,
// not `canonicalName`. The fixtures are keyed the other way round on purpose —
// they are typed against each table's own `$inferInsert`, which is what makes a
// column renamed in `src/db/schema/` a compile error in every fixture that
// names it — so something has to translate, and it is this, once, rather than a
// literal spelled out per call site.
//
// The mapping is a plain string transform rather than a read of Drizzle's
// column metadata, which would be the obvious source of truth: `getTableColumns`
// is a *runtime* import of drizzle-orm, and nothing outside the database layer
// may make one (CLAUDE.md rule 4 / MB.33). tests/db/ may, tests/support/ may
// not, and the fixtures are worth more to the `unit` project than the metadata
// is worth here.

/**
 * A fixture row keyed the way the database spells it — `canonicalName` becomes
 * `canonical_name`.
 *
 * Callers pass the row *without* its child collections and without its audit
 * stamps: children belong to other tables, and the stamps come from the
 * session rather than from a fixture (CLAUDE.md rule 3).
 */
export function toColumns<T extends object>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([field, value]) => [
      field.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}
