/**
 * One answer per id in the order given, as a DataLoader's batch is answered:
 * the row carrying the id, or `missing(id)` where none does. `rows` comes from
 * one read of the ids in no particular order, and is indexed once, so a batch
 * costs one pass over each list rather than a search per id.
 */
export function inIdOrder<Row extends { id: string }, Missing>(
  ids: readonly string[],
  rows: readonly Row[],
  missing: (id: string) => Missing,
): (Row | Missing)[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id) ?? missing(id));
}
