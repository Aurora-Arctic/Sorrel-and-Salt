import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { seedDocuments } from '@/db/seed/documents';
import type { SeedDocument } from '@/db/seed/types';
import { E } from '../../support/as-user';
import { insertDocument, insertDocumentVersion } from '../../support/db/insert-document';

// What running the documents seed writes: each file as its document and published version 1, dated by its front matter, and
// nothing once a document holds a version, so an admin's published text is never overwritten. The shape every seed shares —
// stamps, idempotency, no resurrection, the dry run — is index.test.ts's; that the shipped files read clean is documents-files.test.ts's.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate documents cascade`;
});

const POLICY: SeedDocument = {
  key: 'privacy',
  title: 'Fixture Policy',
  lede: 'What the fixture keeps.',
  publishedOn: new Date('2026-03-04T00:00:00Z'),
  body: '## Fixture Section\n\nFixture text.[^1]\n\n[^1]: Fixture citation.',
};

const TERMS: SeedDocument = {
  key: 'terms',
  title: 'Fixture Terms',
  lede: 'What the fixture binds.',
  publishedOn: new Date('2026-03-05T00:00:00Z'),
  body: '## Fixture Rules\n\nFixture rule.',
};

interface SeededRow {
  key: string;
  title: string;
  lede: string;
  seed_key: string | null;
  number: number;
  body: string;
  status: string;
  published_at: string | null;
}

/** Every document with each of its versions, as text, keyed and numbered in order. */
async function seeded(): Promise<SeededRow[]> {
  return sql<SeededRow[]>`
    select d.key, d.title, d.lede, d.seed_key, v.number, v.body, v.status::text as status,
           v.published_at::text as published_at
    from documents d join document_versions v on v.document_id = d.id
    order by d.key, v.number`;
}

describe('seedDocuments', () => {
  it('writes each document as published version 1, dated by its file', async () => {
    await seedDocuments(db, { documents: [POLICY, TERMS] });

    expect(await seeded()).toEqual([
      {
        key: 'privacy',
        title: 'Fixture Policy',
        lede: 'What the fixture keeps.',
        seed_key: 'privacy',
        number: 1,
        body: POLICY.body,
        status: 'published',
        published_at: '2026-03-04 00:00:00',
      },
      {
        key: 'terms',
        title: 'Fixture Terms',
        lede: 'What the fixture binds.',
        seed_key: 'terms',
        number: 1,
        body: TERMS.body,
        status: 'published',
        published_at: '2026-03-05 00:00:00',
      },
    ]);
  });

  it('never overwrites a document that already has a version, and still seeds the rest', async () => {
    // An admin's document: renamed, and on its second published version.
    const id = await insertDocument(sql, { key: 'privacy', title: 'Fixture Edited' }, E.id);
    await insertDocumentVersion(sql, id, { number: 1, body: 'Fixture first.' }, E.id);
    await insertDocumentVersion(
      sql,
      id,
      { number: 2, body: 'Fixture second.', published_at: '2026-04-01 00:00:00' },
      E.id,
    );
    const before = await seeded();
    // Precondition: the file differs from what the admin published, so an unchanged row is the seed leaving it.
    expect(before.map((row) => row.body)).not.toContain(POLICY.body);

    await seedDocuments(db, { documents: [POLICY, TERMS] });

    const after = await seeded();
    expect(after.filter((row) => row.key === 'privacy')).toEqual(before);
    expect(after.filter((row) => row.key === 'terms').map((row) => row.number)).toEqual([1]);
  });

  it('leaves a document whose only version is an open draft without a version 1 of its own', async () => {
    const id = await insertDocument(sql, { key: 'privacy' }, E.id);
    await insertDocumentVersion(sql, id, { number: 1, status: 'draft' }, E.id);
    const before = await seeded();
    expect(before).toHaveLength(1);

    await seedDocuments(db, { documents: [POLICY] });

    expect(await seeded()).toEqual(before);
  });
});
