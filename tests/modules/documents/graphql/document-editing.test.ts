import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';
import { run } from '../../../support/graphql/run';

// The document editor's query and three writes over the wire. This is the transport's half (claude-docs/testing/layer-ownership.md):
// each field's shape, and per field one refusal per error code. Which roles are refused, and why, is
// services/document-editing.test.ts's; the signed-out caller and the curator are refused at the scope in
// tests/db/graphql-query-scopes.test.ts.

const READ = /* GraphQL */ `
  query DocumentForEditing($key: String!) {
    documentForEditing(key: $key) {
      id
      key
      title
      lede
      published {
        number
        body
        publishedAt
      }
      draft {
        id
        number
        body
        revision
      }
    }
  }
`;

const SAVE = /* GraphQL */ `
  mutation SaveDocumentDraft($documentId: ID!, $body: String!, $expectedRevision: Int) {
    saveDocumentDraft(documentId: $documentId, body: $body, expectedRevision: $expectedRevision) {
      id
      number
      body
      revision
    }
  }
`;

const PUBLISH = /* GraphQL */ `
  mutation PublishDocumentDraft($documentId: ID!, $expectedRevision: Int) {
    publishDocumentDraft(documentId: $documentId, expectedRevision: $expectedRevision) {
      number
      body
      publishedAt
    }
  }
`;

const UPDATE = /* GraphQL */ `
  mutation UpdateDocument($id: ID!, $input: DocumentInput!) {
    updateDocument(id: $id, input: $input) {
      id
      title
      lede
    }
  }
`;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let documentId: string;

beforeEach(async () => {
  await sql`truncate documents cascade`;
  documentId = await insertDocument(
    sql,
    { key: 'disclaimer', title: 'Fixture Disclaimer', lede: 'What the fixture disclaims.' },
    E.id,
  );
  await insertDocumentVersion(
    sql,
    documentId,
    { number: 1, body: 'Fixture disclaimer.', published_at: '2026-03-04 00:00:00' },
    E.id,
  );
});

const codeOf = (result: Awaited<ReturnType<typeof run>>) =>
  (result.errors?.[0]?.extensions as { code?: string } | undefined)?.code;

describe('documentForEditing', () => {
  it('answers the published version, and no draft while none is open', async () => {
    const result = await run(asUser(E), READ, { key: 'disclaimer' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      documentForEditing: {
        id: documentId,
        key: 'disclaimer',
        title: 'Fixture Disclaimer',
        lede: 'What the fixture disclaims.',
        published: {
          number: 1,
          body: 'Fixture disclaimer.',
          publishedAt: expect.stringMatching(/^2026-03-04T00:00:00(\.000)?Z$/),
        },
        draft: null,
      },
    });
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    expect(codeOf(await run(asUser(A), READ, { key: 'disclaimer' }))).toBe('FORBIDDEN');
  });

  it('answers NOT_FOUND for a key with no document', async () => {
    expect(codeOf(await run(asUser(E), READ, { key: 'terms' }))).toBe('NOT_FOUND');
  });
});

describe('saveDocumentDraft', () => {
  it('opens a draft with the body sent, and answers it', async () => {
    const result = await run(asUser(E), SAVE, {
      documentId,
      body: 'Fixture disclaimer, edited.',
      expectedRevision: null,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      saveDocumentDraft: {
        id: expect.any(String),
        number: 2,
        body: 'Fixture disclaimer, edited.',
        revision: 1,
      },
    });
  });

  it('answers STALE_WRITE with the revision the draft is at now, and writes nothing', async () => {
    await run(asUser(E), SAVE, { documentId, body: 'Fixture first.', expectedRevision: null });
    await run(asUser(E), SAVE, { documentId, body: 'Fixture second.', expectedRevision: 1 });

    const result = await run(asUser(E), SAVE, {
      documentId,
      body: 'Fixture stale.',
      expectedRevision: 1,
    });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'STALE_WRITE',
      currentRevision: 2,
    });
    const [row] = await sql`
      select body from document_versions where document_id = ${documentId} and status = 'draft'`;
    expect(row?.body).toBe('Fixture second.');
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    const result = await run(asUser(A), SAVE, {
      documentId,
      body: 'Fixture forged.',
      expectedRevision: null,
    });
    expect(codeOf(result)).toBe('FORBIDDEN');
  });
});

describe('publishDocumentDraft', () => {
  it('publishes the open draft, and answers the new version', async () => {
    await run(asUser(E), SAVE, { documentId, body: 'Fixture published.', expectedRevision: null });

    const result = await run(asUser(E), PUBLISH, { documentId, expectedRevision: 1 });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      publishDocumentDraft: {
        number: 2,
        body: 'Fixture published.',
        publishedAt: expect.any(String),
      },
    });
  });

  it('answers NOT_FOUND when no draft is open', async () => {
    expect(codeOf(await run(asUser(E), PUBLISH, { documentId, expectedRevision: null }))).toBe(
      'NOT_FOUND',
    );
  });

  it('answers STALE_WRITE with the revision the draft is at now', async () => {
    await run(asUser(E), SAVE, { documentId, body: 'Fixture first.', expectedRevision: null });
    await run(asUser(E), SAVE, { documentId, body: 'Fixture second.', expectedRevision: 1 });

    const result = await run(asUser(E), PUBLISH, { documentId, expectedRevision: 1 });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'STALE_WRITE',
      currentRevision: 2,
    });
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    await run(asUser(E), SAVE, { documentId, body: 'Fixture draft.', expectedRevision: null });

    expect(codeOf(await run(asUser(A), PUBLISH, { documentId, expectedRevision: 1 }))).toBe(
      'FORBIDDEN',
    );
  });
});

describe('updateDocument', () => {
  it('answers the document with its new title and lede', async () => {
    const result = await run(asUser(E), UPDATE, {
      id: documentId,
      input: { title: 'Fixture Renamed', lede: 'What the renamed fixture disclaims.' },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      updateDocument: {
        id: documentId,
        title: 'Fixture Renamed',
        lede: 'What the renamed fixture disclaims.',
      },
    });
  });

  it('answers VALIDATION for a blank title', async () => {
    const result = await run(asUser(E), UPDATE, {
      id: documentId,
      input: { title: ' ', lede: 'What the fixture disclaims.' },
    });
    expect(codeOf(result)).toBe('VALIDATION');
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    const result = await run(asUser(A), UPDATE, {
      id: documentId,
      input: { title: 'Fixture Forged', lede: 'Forged.' },
    });
    expect(codeOf(result)).toBe('FORBIDDEN');
  });
});
