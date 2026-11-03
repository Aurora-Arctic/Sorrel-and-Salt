import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { agreementIsCurrent } from '@/lib/agreement-version';
import { currentAgreementVersion } from '@/modules/documents';
import { A, B, C, D, E, F } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';

// The standard seed's fixture accounts have agreed to the documents it seeds, each at version 1, so a test signed in as one of them reaches
// every page without first passing the acceptance page. This file reads its clone as the seed left it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

describe('the standard seed', () => {
  it('publishes the agreed documents at version 1, and every fixture account has agreed to all three', async () => {
    const inForce = await currentAgreementVersion();
    expect(inForce).toEqual({ terms: 1, disclaimer: 1, ethics: 1 });

    const ids = [A, B, C, D, E, F].map((user) => user.id);
    const rows = await sql<
      { id: string; terms: number | null; disclaimer: number | null; ethics: number | null }[]
    >`
      select id, agreed_terms_version as terms, agreed_disclaimer_version as disclaimer, agreed_ethics_version as ethics
      from users where id in ${sql(ids)}`;

    expect(rows).toHaveLength(ids.length);
    for (const { id, ...agreed } of rows) {
      expect(agreed, id).toEqual(inForce);
      expect(agreementIsCurrent(agreed, inForce), id).toBe(true);
    }
  });
});
