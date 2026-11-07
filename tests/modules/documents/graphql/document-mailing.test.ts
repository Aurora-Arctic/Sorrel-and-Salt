import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { documentMailing } from '@/modules/documents/jobs/document-mailing';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertDocument,
  insertDocumentMailing,
  insertDocumentVersion,
} from '../../../support/db/insert-document';
import { run } from '../../../support/graphql/run';

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive: vi.fn(async () => false) }));

const MAILING = /* GraphQL */ `
  fragment Mailing on DocumentMailing {
    id
    documents {
      key
      title
      versionNumber
    }
    state
    reached
    recipientCount
    startedAt
    finishedAt
  }
`;

const OVERVIEW = /* GraphQL */ `
  fragment Overview on DocumentMailingOverview {
    pending {
      documentId
      versionId
      key
      title
      versionNumber
      inMailing
    }
    accountCount
    days
    canSend
    open {
      ...Mailing
    }
    lastSent {
      ...Mailing
    }
  }
  ${MAILING}
`;

const READ = /* GraphQL */ `
  query DocumentMailings {
    documentMailings {
      ...Overview
    }
  }
  ${OVERVIEW}
`;

const EMAIL = /* GraphQL */ `
  mutation EmailDocumentsToEveryAccount($summaries: [DocumentMailingSummaryInput!]!) {
    emailDocumentsToEveryAccount(summaries: $summaries) {
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
  await insertDocumentVersion(sql, documentId, { number: 1 }, E.id);
  versionId = await insertDocumentVersion(sql, documentId, { number: 2 }, E.id);
});

const codeOf = (result: Awaited<ReturnType<typeof run>>) =>
  (result.errors?.[0]?.extensions as { code?: string } | undefined)?.code;

describe('documentMailings', () => {
  it('answers the pending documents, the accounts a mailing would reach, the days it would take, and no mailing yet', async () => {
    const result = await run(asUser(E), READ);

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      documentMailings: {
        pending: [
          {
            documentId,
            versionId,
            key: 'disclaimer',
            title: 'Fixture Disclaimer',
            versionNumber: 2,
            inMailing: false,
          },
        ],
        accountCount: expect.any(Number),
        days: expect.any(Number),
        canSend: true,
        open: [],
        lastSent: null,
      },
    });
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    expect(codeOf(await run(asUser(A), READ))).toBe('FORBIDDEN');
  });
});

describe('emailDocumentsToEveryAccount', () => {
  it('answers the mailing it started, sending and having reached no one, and starts its run on the context’s origin', async () => {
    const result = await run(
      asUser(E),
      EMAIL,
      { summaries: [{ versionId, summary: 'Fixture summary.' }] },
      { documents },
    );

    expect(result.errors).toBeUndefined();
    const overview = (result.data as { emailDocumentsToEveryAccount: Record<string, unknown> })
      .emailDocumentsToEveryAccount;
    expect(overview.open).toEqual([
      {
        id: expect.any(String),
        documents: [{ key: 'disclaimer', title: 'Fixture Disclaimer', versionNumber: 2 }],
        state: 'sending',
        reached: 0,
        recipientCount: overview.accountCount,
        startedAt: expect.any(String),
        finishedAt: null,
      },
    ]);
    const [{ id }] = overview.open as { id: string }[];
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [id, ORIGIN]);
  });

  it('answers VALIDATION for a blank summary', async () => {
    const result = await run(
      asUser(E),
      EMAIL,
      { summaries: [{ versionId, summary: ' ' }] },
      { documents },
    );

    expect(codeOf(result)).toBe('VALIDATION');
    expect(startJob).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to an account with no site role', async () => {
    const result = await run(
      asUser(A),
      EMAIL,
      { summaries: [{ versionId, summary: 'Fixture forged.' }] },
      { documents },
    );

    expect(codeOf(result)).toBe('FORBIDDEN');
    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('resumeDocumentMailing', () => {
  let pausedId: string;
  beforeEach(async () => {
    pausedId = await insertDocumentMailing(
      sql,
      { items: [{ versionId }], status: 'paused', recipient_count: 0 },
      E.id,
    );
  });

  it('answers the mailing sending again, and starts its run on the context’s origin', async () => {
    const result = await run(asUser(E), RESUME, { mailingId: pausedId }, { documents });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      resumeDocumentMailing: { open: [{ id: pausedId, state: 'sending' }] },
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
