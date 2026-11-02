import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { A, B, C, E, asUser } from '../../support/as-user';
import {
  findCurrentDocumentVersion,
  findDocumentByKey,
  findDocumentDraft,
  findDocumentMailingForVersion,
  findPublishedDocumentVersion,
  findPublishedDocumentVersionPage,
  findUnsentDocumentMailingRecipientPage,
  withAudit,
} from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { StaleWrite } from '@/lib/errors';

// The documents' finders and named writes. Every table is marked `namedWrites`, so the generic writes refuse each at compile time
// (tests/modules/documents/schema/documents-schema.type-check.ts). Setup rows go in through the raw client.

const ADMIN = E.id;
const FIRST_PAGE = { limit: 25, inverted: false };

let sql: postgres.Sql;
useTestDatabase((client) => (sql = client));

const admin = () => assertSiteAdmin(asUser(E));

/** A fresh document under an invented key, its id. */
async function aDocument(key = `testdoc-${crypto.randomUUID().slice(0, 8)}`): Promise<string> {
  const [row] = await sql`
    insert into documents (key, title, lede, created_by, updated_by)
    values (${key}, 'Testwort Charter', 'What the Testwort Charter says.', ${ADMIN}, ${ADMIN})
    returning id
  `;
  return row.id;
}

/** A version, published `daysAgo` days back unless it is a draft; its id. */
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
  versionId: string,
  status: 'sending' | 'sent' = 'sending',
): Promise<string> {
  const [row] = await sql`
    insert into document_mailings (document_version_id, summary, status, recipient_count, finished_at, created_by, updated_by)
    values (${versionId}, 'Testwort clause added.', ${status}, 2, ${status === 'sent' ? sql`now()` : null}, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return row.id;
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

  it('starts a mailing of a published version, sending, stamped from the session', async () => {
    const started = await withAudit(asUser(E), (write) =>
      write.startDocumentMailing(admin(), versionId, {
        summary: 'Testwort clause added.',
        recipientCount: 2,
      }),
    );

    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      documentVersionId: versionId,
      summary: 'Testwort clause added.',
      status: 'sending',
      recipientCount: 2,
      finishedAt: null,
      createdBy: ADMIN,
    });
    expect(await findDocumentMailingForVersion(versionId)).toEqual(started[0]);
  });

  it('starts nothing for a version already mailed', async () => {
    await aMailing(versionId);

    const started = await withAudit(asUser(E), (write) =>
      write.startDocumentMailing(admin(), versionId, { summary: 'Again.', recipientCount: 2 }),
    );

    expect(started).toEqual([]);
  });

  it('starts nothing for a draft, a soft-deleted version or a missing one', async () => {
    const documentId = await aDocument();
    const draft = await aVersion(documentId, 1, 'draft');
    const deleted = await aVersion(await aDocument(), 1, 'published', { deleted: true });

    const outcomes = [];
    for (const id of [draft, deleted, crypto.randomUUID()]) {
      outcomes.push(
        await withAudit(asUser(E), (write) =>
          write.startDocumentMailing(admin(), id, { summary: 'Testwort.', recipientCount: 1 }),
        ),
      );
    }

    expect(outcomes).toEqual([[], [], []]);
  });

  it('reads no mailing for an unmailed version, nor a soft-deleted mailing', async () => {
    expect(await findDocumentMailingForVersion(versionId)).toBeUndefined();
    const mailing = await aMailing(versionId);
    await sql`update document_mailings set deleted_at = now(), deleted_by = ${ADMIN} where id = ${mailing}`;

    expect(await findDocumentMailingForVersion(versionId)).toBeUndefined();
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
});
