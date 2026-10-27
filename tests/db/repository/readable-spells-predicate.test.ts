import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
// The predicate is internal to the repository, deliberately absent from its index,
// so this test reaches past the index to the one file that exports it.
// oxlint-disable-next-line no-restricted-imports
import { readableSpells } from '@/db/repository/spells';
import type { Membership } from '@/modules/coven';

// M10.6: the readable-spells predicate builds the condition the finders run
// and touches no database (claude-docs/db/spell-visibility.md, "Reading").
// The client is replaced by one that throws on any use, so building the
// condition while reaching for a connection fails here rather than passing
// quietly. The file runs in `unit`, which clones no database (DB_FREE in
// vitest.config.mts).

vi.mock('@/db/connection', () => ({
  db: new Proxy(
    {},
    {
      get(_target, key) {
        throw new Error(`readableSpells reached the database client (${String(key)})`);
      },
    },
  ),
}));

// A proof only `assertMembership` mints, and minting one reads the database;
// the double cast is the price of asking the predicate without one.
const proof = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  role: 'member',
} as unknown as Membership;

describe('readableSpells', () => {
  it('builds the coven, live and shared-or-authored condition from the proof alone', () => {
    const condition = readableSpells(proof);

    expect(condition).toBeDefined();
    const { sql, params } = new PgDialect().sqlToQuery(condition!);
    expect(sql).toBe(
      '("spells"."workspace_id" = $1 and "spells"."deleted_at" is null and ' +
        '("spells"."visibility" = $2 or "spells"."created_by" = $3))',
    );
    expect(params).toEqual([proof.workspaceId, 'workspace', proof.userId]);
  });
});
