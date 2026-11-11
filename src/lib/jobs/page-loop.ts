/**
 * Reads a page of ids after a cursor, hands each non-empty page to `startBatch`, and stops on an empty or short page. Returns how many
 * batches it started. Both callbacks are the caller's step and `start(...)` calls, so a workflow replay records each once; the loop itself is deterministic.
 */
export async function pageLoop(
  pageSize: number,
  readPage: (after: string | null) => Promise<string[]>,
  startBatch: (ids: string[]) => Promise<unknown>,
): Promise<number> {
  let batches = 0;
  let after: string | null = null;
  for (;;) {
    const ids: string[] = await readPage(after);
    if (ids.length === 0) break;
    await startBatch(ids);
    batches += 1;
    if (ids.length < pageSize) break;
    after = ids[ids.length - 1] ?? null;
  }
  return batches;
}
