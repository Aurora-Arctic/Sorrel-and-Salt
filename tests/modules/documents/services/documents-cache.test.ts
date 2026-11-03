import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { DOCUMENTS_TAG } from '@/lib/documents-cache';
import type { PageRequest } from '@/lib/types';
import {
  listDocumentVersions,
  publishDocumentDraft,
  readDocument,
  readDocumentVersion,
  saveDocumentDraft,
  updateDocument,
} from '@/modules/documents';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';
import { clearDataCache } from '../../../support/next-data-cache';

// The documents' public reads held in the data cache under the `documents` tag (DESIGN.md §7). The data cache holds as Next's does
// (tests/support/next-data-cache.ts), so a version published underneath a read shows whether the repeat read reached Postgres.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let documentId: string;

beforeEach(async () => {
  await sql`truncate documents cascade`;
  clearDataCache();
  documentId = await insertDocument(sql, { key: 'privacy' }, E.id);
  await insertDocumentVersion(sql, documentId, { number: 1, body: 'Fixture first.' }, E.id);
});

const PAGE: PageRequest = { limit: 26, inverted: false };

/** Publishes version 2 straight into Postgres, underneath whatever the cache holds. */
const publishUnderneath = () =>
  insertDocumentVersion(
    sql,
    documentId,
    { number: 2, body: 'Fixture second.', published_at: '2026-04-05 00:00:00' },
    E.id,
  );

const numbersListed = async () =>
  (await listDocumentVersions('privacy', PAGE)).map((entry) => entry.node.number);

describe('the documents reads are cached under the documents tag', () => {
  it('answers a repeat read of the current version and of the list from the cache', async () => {
    expect((await readDocument('privacy')).number).toBe(1);
    expect(await numbersListed()).toEqual([1]);

    await publishUnderneath();

    // Postgres holds version 2 now; the cache still answers as before.
    const current = await readDocument('privacy');
    expect(current.number).toBe(1);
    expect(current.publishedAt).toBeInstanceOf(Date);
    expect(await numbersListed()).toEqual([1]);
  });

  it('reads Postgres again once the documents tag expires', async () => {
    await readDocument('privacy');
    await numbersListed();
    await publishUnderneath();

    revalidateTag(DOCUMENTS_TAG, { expire: 0 });

    expect((await readDocument('privacy')).number).toBe(2);
    expect((await readDocumentVersion('privacy', 2)).body).toBe('Fixture second.');
    expect(await numbersListed()).toEqual([2, 1]);
  });

  // Each tag is emptied for its own writes alone: a compendium edit leaves the documents cached.
  it('keeps the documents cached when the compendium tag expires', async () => {
    await readDocument('privacy');
    await publishUnderneath();

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });

    expect((await readDocument('privacy')).number).toBe(1);
  });
});

// The keeper's writes empty the cache themselves, so a reader sees a publish, or a new title, on the next read rather than whenever
// the cache would have lapsed. A saved draft leaves it, since no reader is shown a draft.
describe('the editing services expire the documents tag', () => {
  it('shows a reader the published draft, and the earlier version in the list, after a publish', async () => {
    expect((await readDocument('privacy')).number).toBe(1);
    expect(await numbersListed()).toEqual([1]);

    const draft = await saveDocumentDraft(asUser(E), documentId, {
      body: 'Fixture published edit.',
      expectedRevision: null,
    });
    // A saved draft is no reader's: the cache still answers version 1.
    expect((await readDocument('privacy')).number).toBe(1);

    await publishDocumentDraft(asUser(E), documentId, { expectedRevision: draft.revision });

    expect(await readDocument('privacy')).toMatchObject({
      number: 2,
      body: 'Fixture published edit.',
    });
    expect(await numbersListed()).toEqual([2, 1]);
  });

  it('shows a reader the new title after a title change', async () => {
    expect((await readDocument('privacy')).title).toBe('Fixture Policy');

    await updateDocument(asUser(E), documentId, {
      title: 'Fixture Policy Renamed',
      lede: 'What the fixture keeps.',
    });

    expect((await readDocument('privacy')).title).toBe('Fixture Policy Renamed');
  });
});
