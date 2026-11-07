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
});
