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

// `DEBUG_SQL=1` prints every statement, `withAudit`'s `set_config` included
// (claude-docs/db.md, "Debugging a query").
export const db = drizzle(client, { logger: process.env.DEBUG_SQL === '1' });
