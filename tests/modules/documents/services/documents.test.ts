import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { NotFound } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import { listDocumentVersions, readDocument, readDocumentVersion } from '@/modules/documents';
import { E } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// No read takes a session or answers with a draft or deleted row (claude-docs/design-decisions/support.md, "History").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate documents cascade`;
});

const PAGE: PageRequest = { limit: 26, inverted: false };

async function policyWithDraft(): Promise<string> {
  const id = await insertDocument(
    sql,
    { key: 'privacy', title: 'Fixture Policy', lede: 'What the fixture keeps.' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    id,
    { number: 1, body: 'Fixture first.', published_at: '2026-03-04 00:00:00' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    id,
    { number: 2, body: 'Fixture second.', published_at: '2026-04-05 12:30:00' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    id,
    { number: 3, body: 'Fixture draft.', status: 'draft' },
    E.id,
  );
  return id;
}

describe('readDocument', () => {
  it('answers the highest published version, which an open draft past it does not displace', async () => {
    await policyWithDraft();

    expect(await readDocument('privacy')).toEqual({
      key: 'privacy',
      title: 'Fixture Policy',
      lede: 'What the fixture keeps.',
      number: 2,
      body: 'Fixture second.',
      publishedAt: new Date('2026-04-05T12:30:00Z'),
    });
  });

  it('throws NotFound for a document with no published version', async () => {
    const id = await insertDocument(sql, { key: 'privacy' }, E.id);
    await insertDocumentVersion(sql, id, { number: 1, status: 'draft' }, E.id);

    await expect(readDocument('privacy')).rejects.toThrow(NotFound);
  });

  it('throws NotFound for a deleted document, whose published version the live one would have shown', async () => {
    const id = await insertDocument(sql, { key: 'privacy', deleted_at: new Date() }, E.id);
    await insertDocumentVersion(sql, id, { number: 1 }, E.id);
    // Precondition: the version itself is published and live, so only the document's tombstone can hide it.
    const [version] = await sql`
      select status::text as status, deleted_at from document_versions where document_id = ${id}`;
    expect(version).toEqual({ status: 'published', deleted_at: null });

    await expect(readDocument('privacy')).rejects.toThrow(NotFound);
  });
});

describe('readDocumentVersion', () => {
  it('answers a published version by its number, dated by its own publish', async () => {
    await policyWithDraft();

    expect(await readDocumentVersion('privacy', 1)).toEqual({
      key: 'privacy',
      title: 'Fixture Policy',
      lede: 'What the fixture keeps.',
      number: 1,
      body: 'Fixture first.',
      publishedAt: new Date('2026-03-04T00:00:00Z'),
    });
  });

  // Direct-number access to a draft: the row exists under that number, so only the status keeps it from the public.
  it('throws NotFound for a draft, by its number', async () => {
    const id = await policyWithDraft();
    const [draft] = await sql`
      select status::text as status from document_versions where document_id = ${id} and number = 3`;
    expect(draft.status).toBe('draft');

    await expect(readDocumentVersion('privacy', 3)).rejects.toThrow(NotFound);
  });

  it('throws NotFound for a number the document never had, or one only another document has', async () => {
    await policyWithDraft();
    const other = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
    for (const number of [1, 2, 3, 4]) {
      await insertDocumentVersion(sql, other, { number }, E.id);
    }

    // Precondition: the other document's version 4 is published and readable under its own key.
    await expect(readDocumentVersion('terms', 4)).resolves.toMatchObject({ number: 4 });
    await expect(readDocumentVersion('privacy', 4)).rejects.toThrow(NotFound);
  });

  it('throws NotFound for a deleted version', async () => {
    const id = await insertDocument(sql, { key: 'privacy' }, E.id);
    await insertDocumentVersion(sql, id, { number: 1, deleted_at: new Date() }, E.id);
    await insertDocumentVersion(sql, id, { number: 2 }, E.id);

    await expect(readDocumentVersion('privacy', 1)).rejects.toThrow(NotFound);
  });

  // The number comes from an address, so anything that is not a whole number from 1 is a version no document has.
  it('throws NotFound for a number that is not a whole number from 1', async () => {
    await policyWithDraft();

    for (const number of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(readDocumentVersion('privacy', number), String(number)).rejects.toThrow(
        NotFound,
      );
    }
  });

  // The column is a Postgres integer, so a number past its largest is one no version can have, not a database error.
  it('throws NotFound for a whole number past the largest a version number can hold', async () => {
    await policyWithDraft();
    // Precondition: the document is readable by number, so the refusal is about the number alone.
    await expect(readDocumentVersion('privacy', 1)).resolves.toMatchObject({ number: 1 });

    for (const number of [2_147_483_648, 9_999_999_999, Number.MAX_SAFE_INTEGER]) {
      await expect(readDocumentVersion('privacy', number), String(number)).rejects.toThrow(
        NotFound,
      );
    }
  });
});

describe('listDocumentVersions', () => {
  it('lists the published versions newest first, each with its number and date, and never the draft', async () => {
    await policyWithDraft();

    const page = await listDocumentVersions('privacy', PAGE);

    expect(page.map((entry) => entry.node)).toEqual([
      { number: 2, publishedAt: new Date('2026-04-05T12:30:00Z') },
      { number: 1, publishedAt: new Date('2026-03-04T00:00:00Z') },
    ]);
  });

  it("lists none of another document's versions", async () => {
    await policyWithDraft();
    const other = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
    await insertDocumentVersion(sql, other, { number: 1 }, E.id);

    const numbers = (await listDocumentVersions('terms', PAGE)).map((entry) => entry.node.number);
    expect(numbers).toEqual([1]);
  });

  it('lists nothing for a document with no published version', async () => {
    expect(await listDocumentVersions('privacy', PAGE)).toEqual([]);
  });
});
