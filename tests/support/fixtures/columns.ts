// The db tests insert by column name through `postgres` while fixtures are keyed by field; this translates,
// as a string transform because `getTableColumns` is a runtime drizzle-orm import tests/support/ may not make (rule 4).

export function toColumns<T extends object>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([field, value]) => [
      field.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}
