import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dropSchema } from '@/db/seed/reset';

// M1.24 — the drop half of `npm run db:reset`.
//
// `db:reset` is the answer to "my local database is wedged": drop, migrate,
// reseed. The migrate and reseed halves already existed; nothing dropped, so a
// half-applied migration or a table drizzle-kit's journal disagrees about left
// `db:migrate` failing in exactly the state the reset exists to escape.
//
// This test runs against a **database of its own**, not the worker's clone.
// `dropSchema` removes the `public` schema outright, pg_trgm and all, and the
// worker clone is shared with every other file that lands in the same pool
// slot — a test that wrecked it would fail some unrelated file downstream
// instead of here. The same `CREATE DATABASE` the harness itself uses
// (tests/support/db-global-setup.ts) keeps the blast radius inside this file.

/** Reachable as the `sorrel` role, which owns the database it is about to gut. */
function adminUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set');
  const url = new URL(base);
  url.pathname = '/sorrel';
  return url.toString();
}

function databaseUrl(name: string): string {
  const url = new URL(adminUrl());
  url.pathname = `/${name}`;
  return url.toString();
}

// One per pool slot, for the reason worker-database.ts gives: `VITEST_POOL_ID`
// is bounded by the worker count, `VITEST_WORKER_ID` is not (MB.14).
const DATABASE = `sorrel_reset_${process.env.VITEST_POOL_ID ?? '1'}`;

let admin: ReturnType<typeof postgres>;
let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function schemaNames(): Promise<string[]> {
  const rows = await sql<{ nspname: string }[]>`
    select nspname from pg_namespace
    where nspname not like 'pg_%' and nspname <> 'information_schema'
    order by nspname
  `;
  return rows.map((row) => row.nspname);
}

async function publicTableNames(): Promise<string[]> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' order by tablename
  `;
  return rows.map((row) => row.tablename);
}

async function extensionNames(): Promise<string[]> {
  const rows = await sql<{ extname: string }[]>`select extname from pg_extension order by extname`;
  return rows.map((row) => row.extname);
}

/**
 * The state `db:reset` is called in: application tables in `public`, plus the
 * `drizzle` schema holding drizzle-kit's `__drizzle_migrations` journal. The
 * journal is the reason a reset has to drop rather than re-run — a migration
 * it records as applied is never applied again, however wrecked the table is.
 */
async function buildWreckedDatabase(): Promise<void> {
  await sql.unsafe('create extension if not exists pg_trgm');
  await sql.unsafe('create table wrecked (id integer primary key)');
  await sql.unsafe("create type wrecked_mood as enum ('sour')");
  await sql.unsafe('create schema drizzle');
  await sql.unsafe('create table drizzle.__drizzle_migrations (id serial primary key, hash text)');
  await sql.unsafe("insert into drizzle.__drizzle_migrations (hash) values ('pretend-applied')");
}

beforeAll(async () => {
  admin = postgres(adminUrl(), { onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DATABASE}`);
  await admin.unsafe(`create database ${DATABASE}`);

  sql = postgres(databaseUrl(DATABASE), { onnotice: () => {} });
  db = drizzle(sql);
});

afterEach(async () => {
  await sql.unsafe('drop schema if exists drizzle cascade');
  await sql.unsafe('drop schema if exists public cascade');
  await sql.unsafe('create schema public');
});

afterAll(async () => {
  await sql.end();
  await admin.unsafe(`drop database if exists ${DATABASE}`);
  await admin.end();
});

describe('dropSchema', () => {
  // The precondition, so nothing below can pass because the setup silently did
  // nothing: a database with no tables would also report no tables afterwards.
  it('starts from a database that really holds the objects it is asked to drop', async () => {
    await buildWreckedDatabase();

    expect(await publicTableNames()).toContain('wrecked');
    expect(await schemaNames()).toContain('drizzle');
    expect(await extensionNames()).toContain('pg_trgm');
  });

  it('removes every table in public', async () => {
    await buildWreckedDatabase();

    await dropSchema(db);

    expect(await publicTableNames()).toEqual([]);
  });

  it('removes the drizzle journal schema, so every migration reapplies', async () => {
    await buildWreckedDatabase();

    await dropSchema(db);

    expect(await schemaNames()).not.toContain('drizzle');
  });

  // Dropping `public` takes pg_trgm with it — the extension is installed
  // there. Migration 0000 puts it back, which is why the reset is drop *then*
  // migrate and never drop alone.
  it('leaves an empty public schema behind for the migrations to land in', async () => {
    await buildWreckedDatabase();

    await dropSchema(db);

    expect(await schemaNames()).toContain('public');
    await expect(sql.unsafe('create table landed (id integer)')).resolves.toBeDefined();
  });

  it('takes an enum type with it, not just the tables', async () => {
    await buildWreckedDatabase();

    await dropSchema(db);

    const rows = await sql<{ typname: string }[]>`
      select t.typname from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e'
    `;
    expect(rows).toEqual([]);
  });

  // "Completes from a broken state" is the acceptance criterion, and the
  // broken state that matters most is the one a failed reset leaves: no
  // `public` schema at all.
  it('succeeds against a database whose public schema is already gone', async () => {
    await sql.unsafe('drop schema public cascade');

    await expect(dropSchema(db)).resolves.toBeUndefined();

    expect(await schemaNames()).toContain('public');
  });

  it('is repeatable — a second run against the schema it just made is a no-op', async () => {
    await buildWreckedDatabase();

    await dropSchema(db);
    await expect(dropSchema(db)).resolves.toBeUndefined();

    expect(await publicTableNames()).toEqual([]);
  });
});
