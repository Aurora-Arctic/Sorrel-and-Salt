/**
 * One answer per id in the order given, as a DataLoader's batch is answered: the row carrying the id, or `missing(id)`. `rows` is one unordered read,
 * indexed once, so a batch costs one pass per list.
 */
export function inIdOrder<Row extends { id: string }, Missing>(
  ids: readonly string[],
  rows: readonly Row[],
  missing: (id: string) => Missing,
): (Row | Missing)[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id) ?? missing(id));
}
