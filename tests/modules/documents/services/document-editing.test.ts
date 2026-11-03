import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { DOCUMENTS_TAG } from '@/lib/documents-cache';
import { Forbidden, NotFound, StaleWrite, ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  discardDocumentDraft,
  publishDocumentDraft,
  readDocument,
  readDocumentForEditing,
  saveDocumentDraft,
  updateDocument,
} from '@/modules/documents';
import { assertCurator } from '@/modules/identity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// The admin's editing of the four documents: the read the editor opens on, saving into a draft (opening one when none is open),
// publishing that draft, and changing the title and lede. Each is an admin's alone, through assertSiteAdmin, so a curator who
// curates the compendium reaches none of it (claude-docs/design-decisions/m15.59-document-editor-scope.md). That a publish
// empties the cached public reads is documents-cache.test.ts's; the signed-out caller is refused at the GraphQL scope
// (tests/db/graphql-query-scopes.test.ts), since a service is never called without a session.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let privacyId: string;
let disclaimerId: string;

beforeEach(async () => {
  vi.mocked(revalidateTag).mockClear();
  await sql`truncate documents cascade`;
  // The privacy policy at versions 1 and 2 with 3 an open draft; the disclaimer at version 1 with no draft.
  privacyId = await insertDocument(
    sql,
    { key: 'privacy', title: 'Fixture Policy', lede: 'What the fixture keeps.' },
    E.id,
  );
  await insertDocumentVersion(sql, privacyId, { number: 1, body: 'Fixture first.' }, E.id);
  await insertDocumentVersion(
    sql,
    privacyId,
    { number: 2, body: 'Fixture second.', published_at: '2026-04-05 12:30:00' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    privacyId,
    { number: 3, body: 'Fixture draft.', status: 'draft' },
    E.id,
  );
  disclaimerId = await insertDocument(
    sql,
    { key: 'disclaimer', title: 'Fixture Disclaimer', lede: 'What the fixture disclaims.' },
    E.id,
  );
  await insertDocumentVersion(sql, disclaimerId, { number: 1, body: 'Fixture disclaimer.' }, E.id);
});

/** Every version of `documentId`, oldest first, as stored. */
async function versionsOf(documentId: string) {
  return sql<
    { number: number; body: string; status: string; revision: number; updated_by: string }[]
  >`
    select number, body, status::text as status, revision, updated_by
    from document_versions where document_id = ${documentId} and deleted_at is null
    order by number`;
}

/** The newest version of `documentId`, as stored. */
async function lastVersionOf(documentId: string) {
  const versions = await versionsOf(documentId);
  return versions[versions.length - 1];
}

describe('readDocumentForEditing', () => {
  it('answers the published version and the open draft beside it', async () => {
    const editing = await readDocumentForEditing(asUser(E), 'privacy');

    expect(editing).toEqual({
      id: privacyId,
      key: 'privacy',
      title: 'Fixture Policy',
      lede: 'What the fixture keeps.',
      published: {
        number: 2,
        body: 'Fixture second.',
        publishedAt: new Date('2026-04-05T12:30:00Z'),
      },
      draft: { id: expect.any(String), number: 3, body: 'Fixture draft.', revision: 1 },
    });
  });

  it('answers no draft for a document with none open', async () => {
    const editing = await readDocumentForEditing(asUser(E), 'disclaimer');

    expect(editing.published?.number).toBe(1);
    expect(editing.draft).toBeNull();
  });

  it('throws NotFound for a document with no row', async () => {
    await expect(readDocumentForEditing(asUser(E), 'terms')).rejects.toBeInstanceOf(NotFound);
  });
});

describe('saveDocumentDraft', () => {
  it('opens a draft past the published version when none is open, and leaves the public text as it was', async () => {
    const draft = await saveDocumentDraft(asUser(E), disclaimerId, {
      body: 'Fixture disclaimer, edited.',
      expectedRevision: null,
    });

    expect(draft).toMatchObject({ number: 2, body: 'Fixture disclaimer, edited.', revision: 1 });
    expect(await versionsOf(disclaimerId)).toEqual([
      expect.objectContaining({ number: 1, body: 'Fixture disclaimer.', status: 'published' }),
      expect.objectContaining({
        number: 2,
        body: 'Fixture disclaimer, edited.',
        status: 'draft',
        updated_by: E.id,
      }),
    ]);
    expect(await readDocument('disclaimer')).toMatchObject({
      number: 1,
      body: 'Fixture disclaimer.',
    });
  });

  it('writes into the open draft at the revision the editor holds, and raises it', async () => {
    const draft = await saveDocumentDraft(asUser(E), privacyId, {
      body: 'Fixture draft, edited.',
      expectedRevision: 1,
    });

    expect(draft).toMatchObject({ number: 3, body: 'Fixture draft, edited.', revision: 2 });
    expect((await versionsOf(privacyId)).map(({ number, status }) => [number, status])).toEqual([
      [1, 'published'],
      [2, 'published'],
      [3, 'draft'],
    ]);
  });

  it('refuses a stale revision with the one stored, and keeps the newer text', async () => {
    await saveDocumentDraft(asUser(E), privacyId, { body: 'Fixture newer.', expectedRevision: 1 });

    const refusal = await saveDocumentDraft(asUser(E), privacyId, {
      body: 'Fixture older.',
      expectedRevision: 1,
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(StaleWrite);
    expect((refusal as StaleWrite).currentRevision).toBe(2);
    expect(await lastVersionOf(privacyId)).toMatchObject({
      body: 'Fixture newer.',
      revision: 2,
    });
  });

  // The editor opened on no draft, and another admin opened one since: saving would overwrite text this editor never saw.
  it('refuses to open a draft when one was opened since the editor loaded', async () => {
    const refusal = await saveDocumentDraft(asUser(E), privacyId, {
      body: 'Fixture overwrite.',
      expectedRevision: null,
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(StaleWrite);
    expect((refusal as StaleWrite).currentRevision).toBe(1);
    expect(await lastVersionOf(privacyId)).toMatchObject({ body: 'Fixture draft.' });
  });

  it('throws NotFound for a deleted document', async () => {
    await sql`update documents set deleted_at = now(), deleted_by = ${E.id} where id = ${disclaimerId}`;

    await expect(
      saveDocumentDraft(asUser(E), disclaimerId, { body: 'Fixture.', expectedRevision: null }),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe('publishDocumentDraft', () => {
  it('publishes the open draft as the public version, and expires the documents tag', async () => {
    const published = await publishDocumentDraft(asUser(E), privacyId, { expectedRevision: 1 });

    expect(published).toMatchObject({
      number: 3,
      body: 'Fixture draft.',
      publishedAt: expect.any(Date),
    });
    expect(await lastVersionOf(privacyId)).toMatchObject({
      number: 3,
      status: 'published',
      updated_by: E.id,
    });
    expect(revalidateTag).toHaveBeenCalledWith(DOCUMENTS_TAG, { expire: 0 });
    expect(await readDocument('privacy')).toMatchObject({ number: 3, body: 'Fixture draft.' });
  });

  it('throws NotFound when no draft is open', async () => {
    await expect(
      publishDocumentDraft(asUser(E), disclaimerId, { expectedRevision: null }),
    ).rejects.toBeInstanceOf(NotFound);
    expect((await readDocument('disclaimer')).number).toBe(1);
  });

  // The editor publishes what it shows: a draft saved elsewhere since would publish text nobody here read.
  it('refuses a stale revision, and leaves the draft a draft', async () => {
    await saveDocumentDraft(asUser(E), privacyId, { body: 'Fixture newer.', expectedRevision: 1 });

    const refusal = await publishDocumentDraft(asUser(E), privacyId, {
      expectedRevision: 1,
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(StaleWrite);
    expect((refusal as StaleWrite).currentRevision).toBe(2);
    expect(await lastVersionOf(privacyId)).toMatchObject({ status: 'draft' });
    expect((await readDocument('privacy')).number).toBe(2);
  });
});

// Restore Published Version: the draft goes, as a soft delete, and the published text is what the editor shows again.
describe('discardDocumentDraft', () => {
  /** The open draft of `documentId` as stored, deleted or not. */
  async function draftRowOf(documentId: string) {
    const [row] = await sql<{ id: string; deleted_at: Date | null; deleted_by: string | null }[]>`
      select id, deleted_at, deleted_by from document_versions
      where document_id = ${documentId} and status = 'draft'`;
    return row;
  }

  it('soft-deletes the open draft as the admin, and leaves the published version as it was', async () => {
    const draft = await draftRowOf(privacyId);
    // Precondition: a live draft is open beside the published version 2.
    expect(draft).toMatchObject({ deleted_at: null });
    expect((await readDocumentForEditing(asUser(E), 'privacy')).draft).not.toBeNull();

    const discarded = await discardDocumentDraft(asUser(E), privacyId, 1);

    expect(discarded).toBe(draft?.id);
    expect(await draftRowOf(privacyId)).toMatchObject({
      deleted_at: expect.any(Date),
      deleted_by: E.id,
    });
    expect((await versionsOf(privacyId)).map(({ number, status }) => [number, status])).toEqual([
      [1, 'published'],
      [2, 'published'],
    ]);
    const editing = await readDocumentForEditing(asUser(E), 'privacy');
    expect(editing.draft).toBeNull();
    expect(editing.published).toMatchObject({ number: 2, body: 'Fixture second.' });
    expect(await readDocument('privacy')).toMatchObject({ number: 2, body: 'Fixture second.' });
  });

  it('lets the next save open a new draft', async () => {
    await discardDocumentDraft(asUser(E), privacyId, 1);

    const draft = await saveDocumentDraft(asUser(E), privacyId, {
      body: 'Fixture fresh draft.',
      expectedRevision: null,
    });

    expect(draft).toMatchObject({ body: 'Fixture fresh draft.', revision: 1 });
    expect(draft.number).toBeGreaterThan(3);
  });

  // The editor discards what it shows: a draft saved elsewhere since holds text nobody here read.
  it('refuses a stale revision with the one stored, and keeps the draft', async () => {
    await saveDocumentDraft(asUser(E), privacyId, { body: 'Fixture newer.', expectedRevision: 1 });

    const refusal = await discardDocumentDraft(asUser(E), privacyId, 1).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(StaleWrite);
    expect((refusal as StaleWrite).currentRevision).toBe(2);
    expect(await draftRowOf(privacyId)).toMatchObject({ deleted_at: null });
    expect(await lastVersionOf(privacyId)).toMatchObject({
      status: 'draft',
      body: 'Fixture newer.',
      revision: 2,
    });
  });

  it('throws NotFound when no draft is open', async () => {
    await expect(discardDocumentDraft(asUser(E), disclaimerId, 1)).rejects.toBeInstanceOf(NotFound);
    expect(await versionsOf(disclaimerId)).toEqual([
      expect.objectContaining({ number: 1, status: 'published' }),
    ]);
  });
});

describe('updateDocument', () => {
  it('changes the title and lede, with no new version, and expires the documents tag', async () => {
    const before = await versionsOf(disclaimerId);

    await updateDocument(asUser(E), disclaimerId, {
      title: 'Fixture Disclaimer Renamed',
      lede: 'What the renamed fixture disclaims.',
    });

    const [row] =
      await sql`select title, lede, updated_by from documents where id = ${disclaimerId}`;
    expect(row).toEqual({
      title: 'Fixture Disclaimer Renamed',
      lede: 'What the renamed fixture disclaims.',
      updated_by: E.id,
    });
    expect(await versionsOf(disclaimerId)).toEqual(before);
    expect(revalidateTag).toHaveBeenCalledWith(DOCUMENTS_TAG, { expire: 0 });
  });

  it('refuses a blank title on the title field', async () => {
    const refusal = await updateDocument(asUser(E), disclaimerId, {
      title: '  ',
      lede: 'What the fixture disclaims.',
    }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([['title']]);
    const [row] = await sql`select title from documents where id = ${disclaimerId}`;
    expect(row?.title).toBe('Fixture Disclaimer');
  });
});

// Each call is made by direct id, as a forged request would make it. E's same call succeeds, A holds no site role, and F passes
// the curation check, so each refusal is the admin check's and would fail with it removed.
describe('the editing services are an admin’s alone', () => {
  const CALLS: [string, (session: Session) => Promise<unknown>][] = [
    ['readDocumentForEditing', (session) => readDocumentForEditing(session, 'privacy')],
    [
      'saveDocumentDraft',
      (session) =>
        saveDocumentDraft(session, privacyId, { body: 'Fixture forged.', expectedRevision: 1 }),
    ],
    [
      'publishDocumentDraft',
      (session) => publishDocumentDraft(session, privacyId, { expectedRevision: 1 }),
    ],
    ['discardDocumentDraft', (session) => discardDocumentDraft(session, privacyId, 1)],
    [
      'updateDocument',
      (session) => updateDocument(session, privacyId, { title: 'Fixture Forged', lede: 'Forged.' }),
    ],
  ];

  it.each(CALLS)('%s refuses a curator, a member and a coven owner', async (_name, call) => {
    expect(asUser(A).role).toBe('user');
    expect(asUser(B).role).toBe('user');
    expect(() => assertCurator(asUser(F))).not.toThrow();
    const versionsBefore = await versionsOf(privacyId);
    // A live draft is open, so a discard, a save or a publish has a row to act on.
    expect(versionsBefore).toContainEqual(expect.objectContaining({ number: 3, status: 'draft' }));
    const [documentBefore] = await sql`select title, lede from documents where id = ${privacyId}`;

    for (const who of [F, B, A]) {
      await expect(call(asUser(who)), who.id).rejects.toBeInstanceOf(Forbidden);
    }

    expect(await versionsOf(privacyId)).toEqual(versionsBefore);
    expect((await sql`select title, lede from documents where id = ${privacyId}`)[0]).toEqual(
      documentBefore,
    );
    await call(asUser(E));
  });
});
