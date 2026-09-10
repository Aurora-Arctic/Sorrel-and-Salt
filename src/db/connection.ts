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

export const db = drizzle(client);
