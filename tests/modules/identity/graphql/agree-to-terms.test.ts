import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';
import { run } from '../../../support/graphql/run';

// `agreeToTerms` over the real schema: the caller names the three versions their page showed, and gets their own row back with it
// recorded. Which numbers the service takes, and what it writes, is services/terms.test.ts's.

const AGREE = /* GraphQL */ `
  mutation AgreeToTerms($version: AgreementVersionInput!) {
    agreeToTerms(version: $version) {
      id
      agreedTermsVersion
      agreedDisclaimerVersion
      agreedEthicsVersion
    }
  }
`;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate documents cascade`;
  const termsId = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
  await insertDocumentVersion(sql, termsId, { number: 1 }, E.id);
  await insertDocumentVersion(sql, termsId, { number: 2 }, E.id);
  const ethicsId = await insertDocument(sql, { key: 'code-of-ethics' }, E.id);
  await insertDocumentVersion(sql, ethicsId, { number: 1 }, E.id);
  await sql`
    update users set agreed_terms_version = null, agreed_disclaimer_version = null, agreed_ethics_version = null,
      terms_accepted_at = null
    where id = ${A.id}`;
});

describe('the agreeToTerms mutation', () => {
  // No disclaimer is published, so its part in force is 0.
  it('answers the caller with the versions it recorded', async () => {
    const result = await run(asUser(A), AGREE, { version: { terms: 2, disclaimer: 0, ethics: 1 } });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      agreeToTerms: {
        id: A.id,
        agreedTermsVersion: 2,
        agreedDisclaimerVersion: 0,
        agreedEthicsVersion: 1,
      },
    });
    const [after] = await sql`
      select agreed_terms_version, agreed_ethics_version, terms_accepted_at from users where id = ${A.id}`;
    expect(after?.agreed_terms_version).toBe(2);
    expect(after?.agreed_ethics_version).toBe(1);
    expect(after?.terms_accepted_at).toBeInstanceOf(Date);
  });

  it('answers a version no longer in force with a validation error on the version', async () => {
    const result = await run(asUser(A), AGREE, { version: { terms: 1, disclaimer: 0, ethics: 1 } });

    expect(result.errors?.[0]?.extensions).toMatchObject({ code: 'VALIDATION' });
    const [after] = await sql`select agreed_terms_version from users where id = ${A.id}`;
    expect(after?.agreed_terms_version).toBeNull();
  });
});
