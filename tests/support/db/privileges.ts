import type postgres from 'postgres';

// The trigger on `users` refuses a privilege change that declares no route, from any client, so a test's
// setup changing `role` or `can_create_workspace` by hand declares itself a `psql` fix
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).

export async function asManualFix(
  sql: postgres.Sql,
  work: (tx: postgres.TransactionSql) => Promise<unknown>,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.privilege_route', 'manual', true)`;
    await work(tx);
  });
}

// Drizzle wraps the driver's error as its `cause`; the raw client throws it bare.
export async function refusalOf(work: Promise<unknown>): Promise<string> {
  return await work.then(
    () => {
      throw new Error('expected the write to be refused, but it succeeded');
    },
    (error: Error & { cause?: Error }) => (error.cause ?? error).message,
  );
}
