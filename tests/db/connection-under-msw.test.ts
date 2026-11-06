import { Socket } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';

// A database client opened while msw listens, as every db test that fakes an outside service does (PR #1542).
// msw patches every socket's `connect` and passes a database socket through on a handle of its own, which
// ignores Node's `onread` read mode: a driver reading that way fails its first read with `read ENOTCONN`.

const unpatchedConnect = Socket.prototype.connect;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

describe('a database client opened while msw listens', () => {
  it('opens a second connection for a concurrent transaction and runs both', async () => {
    // Precondition: msw has patched the connect every new database socket goes through.
    expect(Socket.prototype.connect).not.toBe(unpatchedConnect);

    const sql = postgres(process.env.DATABASE_URL as string);
    try {
      // Each transaction holds its connection through the sleep, so the second cannot reuse the first's.
      const transaction = (n: number) =>
        sql.begin(async (tx) => {
          const [row] = await tx<{ n: number; pid: number }[]>`
            SELECT ${n}::int AS n, pg_backend_pid() AS pid, pg_sleep(0.2)
          `;
          return row;
        });
      const [first, second] = await Promise.all([transaction(1), transaction(2)]);

      expect([first?.n, second?.n]).toEqual([1, 2]);
      expect(first?.pid).not.toBe(second?.pid);
    } finally {
      await sql.end();
    }
  });
});
