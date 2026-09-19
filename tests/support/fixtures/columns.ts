// The db tests insert by column name through `postgres` directly, while the
// fixtures are keyed by field against each table's `$inferInsert`; this
// translates, once. A string transform rather than Drizzle's `getTableColumns`,
// which is a runtime drizzle-orm import tests/support/ may not make (rule 4).

/**
 * A fixture row keyed the way the database spells it. Callers pass it without
 * child collections (other tables) and audit stamps (the session's, rule 3).
 */
export function toColumns<T extends object>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([field, value]) => [
      field.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}
