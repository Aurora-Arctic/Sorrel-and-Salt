import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ClientRegistry } from './types';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

// One client per process per URL, kept on `globalThis` rather than in this
// module's scope: a module can be evaluated more than once in one process —
// `vi.resetModules()` in the OAuth tests, a hot reload under `next dev` — and
// each evaluation would otherwise open a pool that nothing ends, the earlier
// ones idling on their connections until the server runs out (MB.179). Keyed
// by the URL so a test that repoints `DATABASE_URL` still gets its own.
const registry = globalThis as typeof globalThis & ClientRegistry;
const clients = (registry.__sorrelPostgresClients ??= new Map());

function client(url: string): postgres.Sql {
  let existing = clients.get(url);
  if (!existing) {
    existing = postgres(url);
    clients.set(url, existing);
  }
  return existing;
}

// `DEBUG_SQL=1` prints every statement, `withAudit`'s `set_config` included
// (claude-docs/db/debugging-a-query.md, "Debugging a query").
export const db = drizzle(client(databaseUrl()), { logger: process.env.DEBUG_SQL === '1' });
