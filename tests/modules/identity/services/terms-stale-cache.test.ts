import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import type { AgreementVersion } from '@/lib/types';
import { currentAgreementVersion } from '@/modules/documents';
import { agreeToTerms } from '@/modules/identity';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';
import { clearDataCache } from '../../../support/next-data-cache';

// The data cache can answer with the numbers from before a publish: Next serves a tag it reads as stale but not yet expired once
// more while it refreshes, which `next dev` does whenever the process's monotonic clock lags the wall clock. The agreement is
// checked against the database, so that answer cannot refuse the version the page showed. Against a cache that holds entries.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const BEFORE: AgreementVersion = { terms: 1, disclaimer: 1, ethics: 1 };
const AFTER: AgreementVersion = { terms: 1, disclaimer: 2, ethics: 1 };

let disclaimerId: string;

beforeEach(async () => {
  clearDataCache();
  await sql`truncate documents cascade`;
  for (const key of ['terms', 'code-of-ethics'] as const) {
    await insertDocumentVersion(sql, await insertDocument(sql, { key }, E.id), { number: 1 }, E.id);
  }
  disclaimerId = await insertDocument(sql, { key: 'disclaimer' }, E.id);
  await insertDocumentVersion(sql, disclaimerId, { number: 1 }, E.id);
});

describe('agreeToTerms, while the data cache still holds the numbers from before a publish', () => {
  it('records the version in force, and refuses the one before it', async () => {
    // The cache holds BEFORE, then a disclaimer version is published that the cache was not told of.
    expect(await currentAgreementVersion()).toEqual(BEFORE);
    await insertDocumentVersion(sql, disclaimerId, { number: 2 }, E.id);
    // Precondition: the cached read still answers BEFORE, so a check that trusted it would refuse AFTER.
    expect(await currentAgreementVersion()).toEqual(BEFORE);

    await expect(agreeToTerms(asUser(A), BEFORE)).rejects.toBeInstanceOf(ValidationError);
    const me = await agreeToTerms(asUser(A), AFTER);

    expect(me).toMatchObject({
      agreedTermsVersion: 1,
      agreedDisclaimerVersion: 2,
      agreedEthicsVersion: 1,
    });
  });
});
