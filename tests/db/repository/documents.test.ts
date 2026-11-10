import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { A, B, C, E, asUser } from '../../support/as-user';
import {
  findCurrentDocumentVersion,
  findDocumentByKey,
  findDocumentDraft,
  findDocumentMailingItems,
  findLatestSentDocumentMailing,
  findOpenDocumentMailings,
  findPendingDocumentVersions,
  findPublishedDocumentVersion,
  findPublishedDocumentVersionPage,
  findUnsentDocumentMailingRecipientPage,
  withAudit,
} from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { StaleWrite } from '@/lib/errors';
import { insertDocumentMailing } from '../../support/db/insert-document';

// The documents' finders and named writes. Every table is marked `namedWrites`, so the generic writes refuse each at compile time
// (tests/modules/documents/schema/documents-schema.type-check.ts). Setup rows go in through the raw client.

const ADMIN = E.id;
const FIRST_PAGE = { limit: 25, inverted: false };

let sql: postgres.Sql;
useTestDatabase((client) => (sql = client));

const admin = () => assertSiteAdmin(asUser(E));

async function aDocument(key = `testdoc-${crypto.randomUUID().slice(0, 8)}`): Promise<string> {
  const [row] = await sql`
    insert into documents (key, title, lede, created_by, updated_by)
    values (${key}, 'Testwort Charter', 'What the Testwort Charter says.', ${ADMIN}, ${ADMIN})
    returning id
  `;
  return row.id;
}

async function aVersion(
  documentId: string,
  number: number,
  status: 'draft' | 'published',
  { body = `Testwort text ${number}`, daysAgo = 0, deleted = false } = {},
): Promise<string> {
  const [row] = await sql`
    insert into document_versions (document_id, number, body, status, published_at, created_by, updated_by, deleted_at, deleted_by)
    values (
      ${documentId}, ${number}, ${body}, ${status},
      ${status === 'published' ? sql`now() - make_interval(days => ${daysAgo})` : null},
      ${ADMIN}, ${ADMIN},
      ${deleted ? sql`now()` : null}, ${deleted ? ADMIN : null}
    )
    returning id
  `;
  return row.id;
}

async function aMailing(
  versionIds: string | readonly string[],
  status: 'sending' | 'sent' | 'replaced' | 'paused' = 'sending',
  startedSecondsAgo = 0,
): Promise<string> {
  const items = (typeof versionIds === 'string' ? [versionIds] : versionIds).map((versionId) => ({
    versionId,
    summary: `Summary of ${versionId}`,
  }));
  return insertDocumentMailing(
    sql,
    { items, status, recipient_count: 2, startedSecondsAgo },
    ADMIN,
  );
}

async function aRecipient(
  mailingId: string,
  userId: string,
  { sent = false, deleted = false } = {},
): Promise<void> {
  await sql`
    insert into document_mailing_recipients (mailing_id, user_id, sent_at, created_by, updated_by, deleted_at, deleted_by)
    values (${mailingId}, ${userId}, ${sent ? sql`now()` : null}, ${ADMIN}, ${ADMIN},
            ${deleted ? sql`now()` : null}, ${deleted ? ADMIN : null})
  `;
}

const versionRow = async (id: string) =>
  (
    await sql`select number, body, status, published_at, revision, updated_by from document_versions where id = ${id}`
  )[0];

beforeEach(async () => {
  await sql`truncate documents cascade`;
});

describe('findDocumentByKey', () => {
  it('reads the live document under a key', async () => {
    const id = await aDocument('testdoc-charter');

    expect(await findDocumentByKey('testdoc-charter')).toMatchObject({
      id,
      key: 'testdoc-charter',
      title: 'Testwort Charter',
      lede: 'What the Testwort Charter says.',
    });
  });

  it('reads no document under an unknown key, and none that is soft-deleted', async () => {
    const id = await aDocument('testdoc-charter');
    await sql`update documents set deleted_at = now(), deleted_by = ${ADMIN} where id = ${id}`;

    expect(await findDocumentByKey('testdoc-charter')).toBeUndefined();
    expect(await findDocumentByKey('testdoc-missing')).toBeUndefined();
  });
});

describe('the published-version finders', () => {
  let documentId: string;

  beforeEach(async () => {
    documentId = await aDocument();
  });

  it('reads the highest-numbered published version as current, past an open draft', async () => {
    await aVersion(documentId, 1, 'published', { daysAgo: 3 });
    const second = await aVersion(documentId, 2, 'published', { daysAgo: 1 });
    await aVersion(documentId, 3, 'draft');

    expect(await findCurrentDocumentVersion(documentId)).toMatchObject({
      id: second,
      number: 2,
      status: 'published',
    });
  });

  it('reads no current version of a document with only a draft, nor one whose published rows are deleted', async () => {
    await aVersion(documentId, 1, 'published', { deleted: true });
    await aVersion(documentId, 2, 'draft');

    expect(await findCurrentDocumentVersion(documentId)).toBeUndefined();
  });

  it("reads no other document's version as current", async () => {
    await aVersion(await aDocument(), 1, 'published');

    expect(await findCurrentDocumentVersion(documentId)).toBeUndefined();
  });

  it('reads a published version by its number, and never a draft, a deleted row or a missing number', async () => {
    const first = await aVersion(documentId, 1, 'published');
    await aVersion(documentId, 2, 'published', { deleted: true });
    await aVersion(documentId, 3, 'draft');

    expect(await findPublishedDocumentVersion(documentId, 1)).toMatchObject({ id: first });
    expect(await findPublishedDocumentVersion(documentId, 2)).toBeUndefined();
    expect(await findPublishedDocumentVersion(documentId, 3)).toBeUndefined();
    expect(await findPublishedDocumentVersion(documentId, 4)).toBeUndefined();
    // The precondition: number 1 is not found on another document, so the document id is matched.
    expect(await findPublishedDocumentVersion(await aDocument(), 1)).toBeUndefined();
  });

  it('pages through the published versions newest first, leaving out drafts, deleted rows and other documents', async () => {
    await aVersion(documentId, 1, 'published', { daysAgo: 5 });
    await aVersion(documentId, 2, 'published', { daysAgo: 3, deleted: true });
    await aVersion(documentId, 3, 'published', { daysAgo: 1 });
    await aVersion(documentId, 4, 'draft');
    await aVersion(await aDocument(), 1, 'published');

    const page = await findPublishedDocumentVersionPage(documentId, FIRST_PAGE);

    expect(page.map((entry) => entry.node.number)).toEqual([3, 1]);
  });

  it('pages by the limit it is given, and resumes after the cursor', async () => {
    for (const number of [1, 2, 3]) await aVersion(documentId, number, 'published');

    const first = await findPublishedDocumentVersionPage(documentId, { limit: 2, inverted: false });
    const rest = await findPublishedDocumentVersionPage(documentId, {
      limit: 2,
      inverted: false,
      after: first[1]?.cursor,
    });

    expect(first.map((entry) => entry.node.number)).toEqual([3, 2]);
    expect(rest.map((entry) => entry.node.number)).toEqual([1]);
  });
});

describe('findDocumentDraft', () => {
  it("reads the document's open draft under the SiteAdmin proof, and no deleted one", async () => {
    const documentId = await aDocument();
    await aVersion(documentId, 1, 'published');
    expect(await findDocumentDraft(admin(), documentId)).toBeUndefined();

    const draft = await aVersion(documentId, 2, 'draft');

    expect(await findDocumentDraft(admin(), documentId)).toMatchObject({ id: draft, number: 2 });
    await sql`update document_versions set deleted_at = now(), deleted_by = ${ADMIN} where id = ${draft}`;
    expect(await findDocumentDraft(admin(), documentId)).toBeUndefined();
  });
});

describe('updateDocument', () => {
  it('writes the title and lede, stamped from the session', async () => {
    const id = await aDocument('testdoc-charter');

    const written = await withAudit(asUser(E), (write) =>
      write.updateDocument(admin(), id, { title: 'Testwort Pact', lede: 'The Testwort Pact.' }),
    );

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      id,
      key: 'testdoc-charter',
      title: 'Testwort Pact',
      lede: 'The Testwort Pact.',
      updatedBy: ADMIN,
    });
  });

  it('writes nothing to a soft-deleted document', async () => {
    const id = await aDocument();
    await sql`update documents set deleted_at = now(), deleted_by = ${ADMIN} where id = ${id}`;

    const written = await withAudit(asUser(E), (write) =>
      write.updateDocument(admin(), id, { title: 'Testwort Pact', lede: 'The Testwort Pact.' }),
    );

    expect(written).toEqual([]);
  });
});

describe('openDocumentDraft', () => {
  let documentId: string;

  beforeEach(async () => {
    documentId = await aDocument();
  });

  it('opens a draft copied from the latest published body under the next number, stamped from the session', async () => {
    await aVersion(documentId, 1, 'published', { body: 'Testwort one' });
    await aVersion(documentId, 2, 'published', { body: 'Testwort two' });

    const opened = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );

    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({
      documentId,
      number: 3,
      body: 'Testwort two',
      status: 'draft',
      publishedAt: null,
      revision: 1,
      createdBy: ADMIN,
    });
  });

  // A deleted version still holds its number: the next draft never reuses one a reader may have cited.
  it('numbers past a deleted version, and copies the latest live published body', async () => {
    await aVersion(documentId, 1, 'published', { body: 'Testwort one' });
    await aVersion(documentId, 2, 'published', { body: 'Testwort gone', deleted: true });

    const [opened] = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );

    expect(opened).toMatchObject({ number: 3, body: 'Testwort one' });
  });

  it('opens draft number 1 with an empty body on a document with no version', async () => {
    const [opened] = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );

    expect(opened).toMatchObject({ number: 1, body: '', status: 'draft' });
  });

  it('opens nothing while a draft is open, and leaves that draft alone', async () => {
    await aVersion(documentId, 1, 'published');
    const draft = await aVersion(documentId, 2, 'draft', { body: 'Testwort in progress' });

    const opened = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );

    expect(opened).toEqual([]);
    expect(await versionRow(draft)).toMatchObject({
      body: 'Testwort in progress',
      status: 'draft',
    });
    const [{ count }] = await sql`select count(*)::int as count from document_versions`;
    expect(count).toBe(2);
  });

  it('opens nothing on a soft-deleted document or a missing one', async () => {
    await sql`update documents set deleted_at = now(), deleted_by = ${ADMIN} where id = ${documentId}`;

    const onDeleted = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );
    const onMissing = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), crypto.randomUUID()),
    );

    expect([onDeleted, onMissing]).toEqual([[], []]);
  });
});

describe('saveDocumentDraft', () => {
  let documentId: string;
  let draft: string;

  beforeEach(async () => {
    documentId = await aDocument();
    await aVersion(documentId, 1, 'published', { body: 'Testwort published' });
    draft = await aVersion(documentId, 2, 'draft');
  });

  it("writes the draft's body at the revision it read, moving the revision on", async () => {
    const saved = await withAudit(asUser(A), (write) =>
      write.saveDocumentDraft(admin(), draft, 1, 'Testwort revised'),
    );

    expect(saved).toHaveLength(1);
    expect(await versionRow(draft)).toMatchObject({
      body: 'Testwort revised',
      status: 'draft',
      revision: 2,
      updated_by: A.id,
    });
  });

  it('refuses a stale revision with StaleWrite carrying the current one, and writes nothing', async () => {
    await sql`update document_versions set body = 'Testwort elsewhere' where id = ${draft}`;
    // The precondition: someone else's save moved the draft past the revision read.
    expect((await versionRow(draft)).revision).toBe(2);

    const refused = await withAudit(asUser(E), (write) =>
      write.saveDocumentDraft(admin(), draft, 1, 'Testwort revised'),
    ).catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(StaleWrite);
    expect((refused as StaleWrite).currentRevision).toBe(2);
    expect((await versionRow(draft)).body).toBe('Testwort elsewhere');
  });

  it('writes whatever the revision when the expected revision is null', async () => {
    await sql`update document_versions set body = 'Testwort elsewhere' where id = ${draft}`;

    await withAudit(asUser(E), (write) =>
      write.saveDocumentDraft(admin(), draft, null, 'Testwort revised'),
    );

    expect((await versionRow(draft)).body).toBe('Testwort revised');
  });

  // The rule that a published row is never edited again: the save matches drafts alone, so a published id answers like a missing one.
  it('writes nothing to a published version, and throws no StaleWrite for it', async () => {
    const [published] = await sql`
      select id from document_versions where document_id = ${documentId} and number = 1
    `;

    const saved = await withAudit(asUser(E), (write) =>
      write.saveDocumentDraft(admin(), published.id, 1, 'Testwort rewritten'),
    );

    expect(saved).toEqual([]);
    expect((await versionRow(published.id)).body).toBe('Testwort published');
  });

  it('writes nothing to a soft-deleted draft', async () => {
    await sql`update document_versions set deleted_at = now(), deleted_by = ${ADMIN} where id = ${draft}`;

    const saved = await withAudit(asUser(E), (write) =>
      write.saveDocumentDraft(admin(), draft, null, 'Testwort revised'),
    );

    expect(saved).toEqual([]);
  });
});

describe('publishDocumentDraft', () => {
  let documentId: string;
  let draft: string;

  beforeEach(async () => {
    documentId = await aDocument();
    await aVersion(documentId, 1, 'published', { daysAgo: 3 });
    draft = await aVersion(documentId, 2, 'draft', { body: 'Testwort new' });
  });

  it('turns the draft into the next published version, dated now, and makes it current', async () => {
    const published = await withAudit(asUser(E), (write) =>
      write.publishDocumentDraft(admin(), draft, 1),
    );

    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ id: draft, number: 2, status: 'published' });
    const publishedAt = published[0]?.publishedAt as Date;
    expect(publishedAt).toBeInstanceOf(Date);
    expect(Date.now() - publishedAt.getTime()).toBeLessThan(60_000);
    expect(await findCurrentDocumentVersion(documentId)).toMatchObject({ id: draft });
    expect(await findDocumentDraft(admin(), documentId)).toBeUndefined();
  });

  it('refuses a stale revision with StaleWrite, leaving the draft a draft', async () => {
    await sql`update document_versions set body = 'Testwort elsewhere' where id = ${draft}`;

    const refused = await withAudit(asUser(E), (write) =>
      write.publishDocumentDraft(admin(), draft, 1),
    ).catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(StaleWrite);
    expect(await versionRow(draft)).toMatchObject({ status: 'draft', published_at: null });
  });

  it('publishes nothing that is already published, keeping its date', async () => {
    const [first] = await sql`
      select id, published_at from document_versions where document_id = ${documentId} and number = 1
    `;

    const published = await withAudit(asUser(E), (write) =>
      write.publishDocumentDraft(admin(), first.id, null),
    );

    expect(published).toEqual([]);
    expect((await versionRow(first.id)).published_at).toEqual(first.published_at);
  });

  it('lets the next draft open once this one is published', async () => {
    await withAudit(asUser(E), (write) => write.publishDocumentDraft(admin(), draft, null));

    const [opened] = await withAudit(asUser(E), (write) =>
      write.openDocumentDraft(admin(), documentId),
    );

    expect(opened).toMatchObject({ number: 3, body: 'Testwort new', status: 'draft' });
  });
});

describe('the mailing finders and writes', () => {
  let versionId: string;

  beforeEach(async () => {
    const documentId = await aDocument();
    versionId = await aVersion(documentId, 1, 'published');
  });

  it('starts a mailing of published versions, sending, with an item each, stamped from the session', async () => {
    const other = await aVersion(await aDocument(), 2, 'published');

    const started = await withAudit(asUser(E), (write) =>
      write.startDocumentMailing(admin(), {
        recipientCount: 2,
        items: [
          { versionId, summary: 'Testwort clause added.' },
          { versionId: other, summary: 'Testwort clause removed.' },
        ],
      }),
    );

    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      documentVersionId: null,
      summary: null,
      status: 'sending',
      recipientCount: 2,
      finishedAt: null,
      createdBy: ADMIN,
    });
    expect(
      await sql`select document_version_id, summary, created_by from document_mailing_items
        where mailing_id = ${started[0]!.id} order by summary`,
    ).toEqual([
      { document_version_id: versionId, summary: 'Testwort clause added.', created_by: ADMIN },
      { document_version_id: other, summary: 'Testwort clause removed.', created_by: ADMIN },
    ]);
  });

  it('starts nothing when any version is a draft, soft-deleted or missing', async () => {
    const documentId = await aDocument();
    const draft = await aVersion(documentId, 2, 'draft');
    const deleted = await aVersion(await aDocument(), 2, 'published', { deleted: true });

    const outcomes = [];
    for (const id of [draft, deleted, crypto.randomUUID()]) {
      outcomes.push(
        await withAudit(asUser(E), (write) =>
          write.startDocumentMailing(admin(), {
            recipientCount: 1,
            items: [
              { versionId, summary: 'Testwort.' },
              { versionId: id, summary: 'Testwort.' },
            ],
          }),
        ),
      );
    }

    expect(outcomes).toEqual([[], [], []]);
    expect(await sql`select id from document_mailings`).toEqual([]);
  });

  it('replaces every live sending and paused mailing, and no other', async () => {
    const sending = await aMailing(versionId);
    const paused = await aMailing(versionId, 'paused');
    const sent = await aMailing(versionId, 'sent');
    const deleted = await aMailing(versionId);
    await sql`update document_mailings set deleted_at = now(), deleted_by = ${ADMIN} where id = ${deleted}`;

    const replaced = await withAudit(asUser(E), (write) =>
      write.replaceOpenDocumentMailings(admin()),
    );

    expect(replaced.map((row) => row.id).sort()).toEqual([sending, paused].sort());
    const statuses = await sql`select id, status from document_mailings`;
    expect(Object.fromEntries(statuses.map((row) => [row.id, row.status]))).toEqual({
      [sending]: 'replaced',
      [paused]: 'replaced',
      [sent]: 'sent',
      [deleted]: 'sending',
    });
  });

  it('reads the live sending and paused mailings, oldest first', async () => {
    const newer = await aMailing(versionId, 'paused', 10);
    const older = await aMailing(versionId, 'sending', 20);
    await aMailing(versionId, 'sent', 30);
    await aMailing(versionId, 'replaced', 40);
    const deleted = await aMailing(versionId, 'sending', 50);
    await sql`update document_mailings set deleted_at = now(), deleted_by = ${ADMIN} where id = ${deleted}`;

    expect((await findOpenDocumentMailings()).map((row) => row.id)).toEqual([older, newer]);
  });

  it('reads the newest live sent mailing, or none', async () => {
    expect(await findLatestSentDocumentMailing()).toBeUndefined();
    await aMailing(versionId, 'sent', 30);
    const newest = await aMailing(versionId, 'sent', 20);
    await aMailing(versionId, 'replaced', 10);
    const deleted = await aMailing(versionId, 'sent', 5);
    await sql`update document_mailings set deleted_at = now(), deleted_by = ${ADMIN} where id = ${deleted}`;

    expect((await findLatestSentDocumentMailing())?.id).toBe(newest);
  });

  it('reads the live items of the named mailings, with each document, leaving out a deleted version or document', async () => {
    const charter = await aDocument('testdoc-charter');
    const charterVersion = await aVersion(charter, 2, 'published');
    const goneDocument = await aDocument();
    const goneDocumentVersion = await aVersion(goneDocument, 2, 'published');
    const goneVersion = await aVersion(await aDocument(), 2, 'published');
    const mailing = await aMailing([charterVersion, goneDocumentVersion, goneVersion]);
    const other = await aMailing(versionId);
    await aMailing(versionId);
    await sql`update documents set deleted_at = now(), deleted_by = ${ADMIN} where id = ${goneDocument}`;
    await sql`update document_versions set deleted_at = now(), deleted_by = ${ADMIN} where id = ${goneVersion}`;

    const items = await findDocumentMailingItems([mailing, other]);

    expect(items.sort((a, b) => a.versionNumber - b.versionNumber)).toEqual([
      {
        mailingId: other,
        versionId,
        key: expect.stringMatching(/^testdoc-/),
        title: 'Testwort Charter',
        versionNumber: 1,
        summary: `Summary of ${versionId}`,
      },
      {
        mailingId: mailing,
        versionId: charterVersion,
        key: 'testdoc-charter',
        title: 'Testwort Charter',
        versionNumber: 2,
        summary: `Summary of ${charterVersion}`,
      },
    ]);
    expect(await findDocumentMailingItems([])).toEqual([]);
  });

  it('adds each account once, unsent, skipping one already in the mailing', async () => {
    const mailing = await aMailing(versionId);
    await aRecipient(mailing, A.id, { sent: true });

    const added = await withAudit(asUser(E), (write) =>
      write.addDocumentMailingRecipients(mailing, [A.id, B.id, C.id]),
    );

    expect(added.map((row) => row.userId).sort()).toEqual([B.id, C.id].sort());
    expect(added.every((row) => row.sentAt === null && row.createdBy === ADMIN)).toBe(true);
    const [{ count }] = await sql`
      select count(*)::int as count from document_mailing_recipients where mailing_id = ${mailing}
    `;
    expect(count).toBe(3);
    expect(
      await withAudit(asUser(E), (write) => write.addDocumentMailingRecipients(mailing, [])),
    ).toEqual([]);
  });

  it('pages through the unsent accounts of one mailing, leaving out sent, deleted and other mailings', async () => {
    const mailing = await aMailing(versionId);
    const other = await aMailing(await aVersion(await aDocument(), 1, 'published'));
    await aRecipient(mailing, A.id);
    await aRecipient(mailing, B.id, { sent: true });
    await aRecipient(mailing, C.id, { deleted: true });
    await aRecipient(other, C.id);

    const page = await findUnsentDocumentMailingRecipientPage(mailing, FIRST_PAGE);

    expect(page.map((entry) => entry.node.userId)).toEqual([A.id]);
  });

  it('marks the named accounts sent, once, and no other', async () => {
    const mailing = await aMailing(versionId);
    await aRecipient(mailing, A.id);
    await aRecipient(mailing, B.id);

    const marked = await withAudit(asUser(E), (write) =>
      write.markDocumentMailingRecipientsSent(mailing, [A.id]),
    );
    const again = await withAudit(asUser(E), (write) =>
      write.markDocumentMailingRecipientsSent(mailing, [A.id]),
    );

    expect(marked.map((row) => row.userId)).toEqual([A.id]);
    expect(marked[0]?.sentAt).toBeInstanceOf(Date);
    // A retried batch marks nothing twice, so the first send time stands.
    expect(again).toEqual([]);
    const unsent = await findUnsentDocumentMailingRecipientPage(mailing, FIRST_PAGE);
    expect(unsent.map((entry) => entry.node.userId)).toEqual([B.id]);
  });

  it('finishes a sending mailing once, dated now', async () => {
    const mailing = await aMailing(versionId);

    const finished = await withAudit(asUser(E), (write) => write.finishDocumentMailing(mailing));
    const again = await withAudit(asUser(E), (write) => write.finishDocumentMailing(mailing));

    expect(finished).toHaveLength(1);
    expect(finished[0]).toMatchObject({ id: mailing, status: 'sent' });
    expect(finished[0]?.finishedAt).toBeInstanceOf(Date);
    expect(again).toEqual([]);
  });

  it('finishes nothing that a newer mailing replaced, keeping it replaced', async () => {
    const mailing = await aMailing(versionId, 'replaced');

    const finished = await withAudit(asUser(E), (write) => write.finishDocumentMailing(mailing));

    expect(finished).toEqual([]);
    const [row] = await sql`select status from document_mailings where id = ${mailing}`;
    expect(row.status).toBe('replaced');
  });
});

describe('findPendingDocumentVersions', () => {
  const pendingIds = async () => (await findPendingDocumentVersions()).map((row) => row.versionId);

  it('reads each document’s newest published version past the first, with its document', async () => {
    const documentId = await aDocument('testdoc-charter');
    await aVersion(documentId, 1, 'published');
    await aVersion(documentId, 2, 'published');
    const newest = await aVersion(documentId, 3, 'published');
    await aVersion(documentId, 4, 'draft');

    expect(await findPendingDocumentVersions()).toEqual([
      {
        documentId,
        versionId: newest,
        key: 'testdoc-charter',
        title: 'Testwort Charter',
        versionNumber: 3,
      },
    ]);
  });

  // About is not an agreed document, so a keeper edit to it is never mailed with the agreement wording.
  it('leaves out the about document’s newer version and keeps another document’s', async () => {
    const aboutId = await aDocument('about');
    await aVersion(aboutId, 1, 'published');
    await aVersion(aboutId, 2, 'published');
    const terms = await aVersion(await aDocument('terms'), 2, 'published');

    // Precondition: about does have a published version 2 past its first, so only its key leaves it out.
    const [{ count }] = await sql`
      select count(*)::int as count from document_versions where document_id = ${aboutId} and number = 2 and status = 'published'
    `;
    expect(count).toBe(1);
    expect(await pendingIds()).toEqual([terms]);
  });

  it('leaves out a document whose only published version is the first', async () => {
    await aVersion(await aDocument(), 1, 'published');
    // Precondition: a second document past its first version is read, so the empty answer is the first version's.
    const second = await aVersion(await aDocument(), 2, 'published');

    expect(await pendingIds()).toEqual([second]);
  });

  it('leaves out a version an item of a sent mailing covers, and keeps one a replaced, sending or paused mailing covers', async () => {
    const sent = await aVersion(await aDocument(), 2, 'published');
    const replaced = await aVersion(await aDocument(), 2, 'published');
    const sending = await aVersion(await aDocument(), 2, 'published');
    const paused = await aVersion(await aDocument(), 2, 'published');
    await aMailing([sent], 'sent');
    await aMailing([replaced], 'replaced');
    await aMailing([sending], 'sending');
    await aMailing([paused], 'paused');

    expect((await pendingIds()).sort()).toEqual([replaced, sending, paused].sort());
  });

  it('keeps a version whose sent mailing, or the item in it, is deleted', async () => {
    const mailingGone = await aVersion(await aDocument(), 2, 'published');
    const itemGone = await aVersion(await aDocument(), 2, 'published');
    const gone = await aMailing([mailingGone], 'sent');
    const kept = await aMailing([itemGone], 'sent');
    await sql`update document_mailings set deleted_at = now(), deleted_by = ${ADMIN} where id = ${gone}`;
    await sql`update document_mailing_items set deleted_at = now(), deleted_by = ${ADMIN} where mailing_id = ${kept}`;

    expect((await pendingIds()).sort()).toEqual([mailingGone, itemGone].sort());
  });

  it('reads a newer version as pending once an older one was mailed', async () => {
    const documentId = await aDocument();
    const mailed = await aVersion(documentId, 2, 'published');
    await aMailing([mailed], 'sent');
    // Precondition: the mailed version is not pending.
    expect(await pendingIds()).toEqual([]);

    const newer = await aVersion(documentId, 3, 'published');

    expect(await pendingIds()).toEqual([newer]);
  });

  it('reads past a deleted newest version, and leaves out a deleted document', async () => {
    const documentId = await aDocument();
    const live = await aVersion(documentId, 2, 'published');
    await aVersion(documentId, 3, 'published', { deleted: true });
    const goneDocument = await aDocument();
    await aVersion(goneDocument, 2, 'published');
    await sql`update documents set deleted_at = now(), deleted_by = ${ADMIN} where id = ${goneDocument}`;

    expect(await pendingIds()).toEqual([live]);
  });
});
