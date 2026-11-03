import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { currentTermsVersion } from '@/modules/documents';
import { hasAgreedToTerms } from '@/modules/identity';
import { A, B, C, D, E, F } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';

// The standard seed's fixture accounts have agreed to the terms it seeds, version 1, so a test signed in as one of them reaches
// every page without first passing the acceptance page. This file reads its clone as the seed left it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

describe('the standard seed', () => {
  it('publishes the terms at version 1, and every fixture account has agreed to it', async () => {
    expect(await currentTermsVersion()).toBe(1);

    const ids = [A, B, C, D, E, F].map((user) => user.id);
    const rows = await sql<{ id: string; agreed_terms_version: number | null }[]>`
      select id, agreed_terms_version from users where id in ${sql(ids)}`;

    expect(rows).toHaveLength(ids.length);
    for (const { id, agreed_terms_version } of rows) {
      expect(agreed_terms_version, id).toBe(1);
      expect(hasAgreedToTerms(agreed_terms_version, 1), id).toBe(true);
    }
  });
});
