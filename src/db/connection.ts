import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { withoutClientOnlyParams } from './connection-url';
import type { ClientRegistry } from './types';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return withoutClientOnlyParams(url);
}

// One client per process per URL, kept on `globalThis` and not in module scope: a module can be evaluated twice in one process
// (`vi.resetModules()`, a hot reload), and each evaluation would open a pool nothing ends. Keyed by URL so a test repointing `DATABASE_URL` gets its own.
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
