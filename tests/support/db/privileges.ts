import type postgres from 'postgres';

// MB.195: the trigger on `users` refuses a privilege change that declares no
// route, from any client. A test's setup changing `role` or
// `can_create_workspace` by hand is a `psql` fix as far as the database can
// tell, so it declares itself as one
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).

/** Runs `work` in one transaction that first declares the route `manual`, as a `psql` fix must. */
export async function asManualFix(
  sql: postgres.Sql,
  work: (tx: postgres.TransactionSql) => Promise<unknown>,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.privilege_route', 'manual', true)`;
    await work(tx);
  });
}

/**
 * The database's own message for a write that was expected to be refused:
 * Drizzle wraps the driver's error as its `cause`, and the raw client throws
 * it bare. Throws if the write succeeded instead.
 */
export async function refusalOf(work: Promise<unknown>): Promise<string> {
  return await work.then(
    () => {
      throw new Error('expected the write to be refused, but it succeeded');
    },
    (error: Error & { cause?: Error }) => (error.cause ?? error).message,
  );
}
