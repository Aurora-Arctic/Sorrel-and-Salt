import type postgres from 'postgres';

// An UPDATE that changes no column keeps `updated_at` and `updated_by`, so a setup that writes a
// stamp alone would be undone. It declares itself a deliberate touch instead, as `writeChildren` does.

/** Runs `work` in one transaction that first publishes `app.touch_row`, so the stamps it writes are kept. */
export async function asTouch(
  sql: postgres.Sql,
  work: (tx: postgres.TransactionSql) => Promise<unknown>,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.touch_row', 'on', true)`;
    await work(tx);
  });
}
