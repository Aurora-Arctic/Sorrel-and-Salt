import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { databaseUrl, dropDatabase, seedTemplate } from '../support/seeded-database';

// A template stored under a key is rebuilt only when asked for under another key.
const NAME = 'sorrel_template_key_test';

async function hasMarker(): Promise<boolean> {
  const sql = postgres(databaseUrl(NAME));
  try {
    const [row] = await sql<
      { found: string | null }[]
    >`select to_regclass('public.marker') as found`;
    return row?.found != null;
  } finally {
    await sql.end();
  }
}

// Read from the template itself: pg_database is shared, so any database can see its own comment.
async function storedKey(): Promise<string | undefined> {
  const sql = postgres(databaseUrl(NAME));
  try {
    const [row] = await sql<{ key: string | null }[]>`
      select shobj_description(oid, 'pg_database') as key from pg_database where datname = ${NAME}
    `;
    return row?.key ?? undefined;
  } finally {
    await sql.end();
  }
}

async function isSeeded(): Promise<boolean> {
  const sql = postgres(databaseUrl(NAME));
  try {
    const [row] = await sql<{ count: number }[]>`select count(*)::int as count from users`.catch(
      () => [{ count: 0 }],
    );
    return (row?.count ?? 0) > 0;
  } finally {
    await sql.end();
  }
}

async function addMarker(): Promise<void> {
  const sql = postgres(databaseUrl(NAME));
  try {
    await sql`create table marker (id int)`;
  } finally {
    await sql.end();
  }
}

afterAll(() => dropDatabase(NAME));

describe('seedTemplate with a key', () => {
  it('keeps a template stored under the same key, and rebuilds one stored under another or none', async () => {
    await seedTemplate(NAME, { key: 'aa11' });
    await addMarker();

    await seedTemplate(NAME, { key: 'aa11' });
    expect(await hasMarker()).toBe(true);

    await seedTemplate(NAME, { key: 'bb22' });
    expect(await hasMarker()).toBe(false);

    await addMarker();
    await seedTemplate(NAME);
    expect(await hasMarker()).toBe(false);
  }, 60_000);

  it('stores no key when the seed fails part-way, so the next run under that key reseeds', async () => {
    await seedTemplate(NAME, { key: 'cc33' });
    expect(await storedKey()).toBe('cc33');

    // With npm off the PATH, the migrate step fails after the database is cloned.
    const path = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      await expect(seedTemplate(NAME, { key: 'dd44' })).rejects.toThrow(/db:migrate/);
    } finally {
      process.env.PATH = path;
    }
    expect(await isSeeded()).toBe(false);
    expect(await storedKey()).toBeUndefined();

    await seedTemplate(NAME, { key: 'dd44' });
    expect(await isSeeded()).toBe(true);
    expect(await storedKey()).toBe('dd44');
  }, 60_000);
});
