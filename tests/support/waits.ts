/**
 * A real wait that is itself the requirement: a lock or race that must hold for a stretch of wall time,
 * a pause between two polls of the database, or a gap that gives two database clock readings different
 * values. Fake timers cannot stand in, because the other side is Postgres or another connection, not this
 * process's clock. The reason says why; `tests/guards/vitest-waits.test.ts` refuses any other sleep.
 */
export function requiredDelay(ms: number, reason: string): Promise<void> {
  void reason;
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
