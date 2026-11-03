import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { documentMailing } from '@/modules/documents/jobs/document-mailing';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';
import { run } from '../../../support/graphql/run';

// Emailing every account about a document, over the wire. This is the transport's half (claude-docs/testing/layer-ownership.md):
// each field's shape, that a write hands the context's origin to the run it starts, and per field one refusal per error code.
// Which roles are refused, and why, is services/document-mailing.test.ts's; the signed-out caller and the curator are refused at
// the scope in tests/db/graphql-query-scopes.test.ts.

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive: vi.fn(async () => false) }));

const MAILING = /* GraphQL */ `
  fragment Mailing on DocumentMailing {
    id
    versionNumber
    state
    reached
    recipientCount
    startedAt
    finishedAt
  }
`;

const OVERVIEW = /* GraphQL */ `
  fragment Overview on DocumentMailingOverview {
    versionNumber
    accountCount
    days
    current {
      ...Mailing
    }
    inProgress {
      ...Mailing
    }
  }
  ${MAILING}
`;

const READ = /* GraphQL */ `
  query DocumentMailing($key: String!) {
    documentMailing(key: $key) {
      ...Overview
    }
  }
  ${OVERVIEW}
`;

const EMAIL = /* GraphQL */ `
  mutation EmailDocumentToEveryAccount($documentId: ID!, $summary: String!) {
    emailDocumentToEveryAccount(documentId: $documentId, summary: $summary) {
      ...Overview
    }
  }
  ${OVERVIEW}
`;

const RESUME = /* GraphQL */ `
  mutation ResumeDocumentMailing($mailingId: ID!) {
    resumeDocumentMailing(mailingId: $mailingId) {
      ...Overview
    }
  }
  ${OVERVIEW}
`;

const ORIGIN = 'https://origin.example.test';
const documents = { origin: async () => ORIGIN };

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let documentId: string;
let versionId: string;

beforeEach(async () => {
  startJob.mockClear();
  await sql`truncate documents cascade`;
  documentId = await insertDocument(sql, { key: 'disclaimer', title: 'Fixture Disclaimer' }, E.id);
  versionId = await insertDocumentVersion(sql, documentId, { number: 1 }, E.id);
});

const codeOf = (result: Awaited<ReturnType<typeof run>>) =>
  (result.errors?.[0]?.extensions as { code?: string } | undefined)?.code;

describe('documentMailing', () => {
  it('answers the published version, the accounts a mailing would reach, the days it would take, and no mailing yet', async () => {
    const result = await run(asUser(E), READ, { key: 'disclaimer' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      documentMailing: {
        versionNumber: 1,
        accountCount: expect.any(Number),
        days: expect.any(Number),
        current: null,
        inProgress: null,
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

describe('emailDocumentToEveryAccount', () => {
  it('answers the mailing it started, sending and having reached no one, and starts its run on the context’s origin', async () => {
    const result = await run(
      asUser(E),
      EMAIL,
      { documentId, summary: 'Fixture summary.' },
      { documents },
    );

    expect(result.errors).toBeUndefined();
    const overview = (result.data as { emailDocumentToEveryAccount: Record<string, unknown> })
      .emailDocumentToEveryAccount;
    expect(overview.current).toEqual({
      id: expect.any(String),
      versionNumber: 1,
      state: 'sending',
      reached: 0,
      recipientCount: overview.accountCount,
      startedAt: expect.any(String),
      finishedAt: null,
    });
    const id = (overview.current as { id: string }).id;
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [id, ORIGIN]);
  });

  it('answers VALIDATION for a blank summary', async () => {
    const result = await run(asUser(E), EMAIL, { documentId, summary: ' ' }, { documents });

    expect(codeOf(result)).toBe('VALIDATION');
    expect(startJob).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    const result = await run(
      asUser(A),
      EMAIL,
      { documentId, summary: 'Fixture forged.' },
      { documents },
    );

    expect(codeOf(result)).toBe('FORBIDDEN');
    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('resumeDocumentMailing', () => {
  let pausedId: string;
  beforeEach(async () => {
    const [row] = await sql`
      insert into document_mailings (document_version_id, summary, status, recipient_count, created_by, updated_by)
      values (${versionId}, 'Fixture summary.', 'paused', 0, ${E.id}, ${E.id})
      returning id`;
    pausedId = row!.id as string;
  });

  it('answers the mailing sending again, and starts its run on the context’s origin', async () => {
    const result = await run(asUser(E), RESUME, { mailingId: pausedId }, { documents });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      resumeDocumentMailing: { current: { id: pausedId, state: 'sending' } },
    });
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [pausedId, ORIGIN]);
  });

  it('answers NOT_FOUND for an id with no mailing', async () => {
    const result = await run(
      asUser(E),
      RESUME,
      { mailingId: '00000000-0000-4000-8000-000000000000' },
      { documents },
    );

    expect(codeOf(result)).toBe('NOT_FOUND');
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    expect(codeOf(await run(asUser(A), RESUME, { mailingId: pausedId }, { documents }))).toBe(
      'FORBIDDEN',
    );
  });
});
