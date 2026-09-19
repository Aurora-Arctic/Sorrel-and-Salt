import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

const client = postgres(databaseUrl());

// MB.22 — off by default, so test output and CI are unaffected. Set
// `DEBUG_SQL=1` to print every statement the repository emits, including
// `withAudit`'s `set_config('app.current_user_id', …)` — the fastest way to
// tell a row missing to a `Membership` workspace predicate apart from a row
// missing to soft-delete filtering.
export const db = drizzle(client, { logger: process.env.DEBUG_SQL === '1' });
