import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { beginSeedTransaction } from '@/db/seed/idempotent';
import { seedInvitationCards } from '@/db/seed/invitation-cards';
import { batchName } from '@/components/AdminCards/batches';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// The fake invitation cards the `demo` scenario seeds for the admin Invitation Cards and Card Sign-Ups tabs, run against the `standard` cast.

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const run = () => beginSeedTransaction(drizzle(sql), seedInvitationCards);

const counts = async () => {
  const [row] = await sql<{ cards: number; attempts: number }[]>`
    select (select count(*) from invitations where kind = 'card')::int as cards,
           (select count(*) from card_invitation_attempts)::int as attempts
  `;
  return row;
};

describe('the invitation card seed', () => {
  it('starts from a database with no cards, as the production-bound scenarios leave it', async () => {
    expect(await counts()).toEqual({ cards: 0, attempts: 0 });
  });

  describe('once run', () => {
    beforeAll(run);

    it('seeds a live, a revoked and an expired batch, each whole sheets with every position', async () => {
      const batches = await sql<
        { state: string; cards: number; low: number; high: number; distinct: number }[]
      >`
        select case when bool_or(revoked_at is not null) then 'revoked'
                    when bool_or(expires_at < now()) then 'expired' else 'live' end as state,
               count(*)::int as cards, min(position)::int as low, max(position)::int as high,
               count(distinct position)::int as distinct
        from invitations where kind = 'card' group by batch_id order by cards desc, state
      `;
      expect(batches.map((b) => b.state).sort()).toEqual(['expired', 'live', 'revoked']);
      for (const batch of batches) {
        expect(batch.cards % 9).toBe(0);
        expect([batch.low, batch.high, batch.distinct]).toEqual([1, batch.cards, batch.cards]);
      }
      const live = batches.find((b) => b.state === 'live');
      expect(live?.cards).toBe(18);
    });

    it('gives the three batches distinct batchNames, as the admin screen names them', async () => {
      const rows = await sql<
        { batch_id: string }[]
      >`select distinct batch_id from invitations where kind = 'card'`;
      expect(new Set(rows.map((r) => batchName(r.batch_id))).size).toBe(3);
    });

    it('stores only hashes, all different', async () => {
      const [row] = await sql<{ bad: number; distinct: number; total: number }[]>`
        select count(*) filter (where token_hash !~ '^[0-9a-f]{64}$')::int as bad,
               count(distinct token_hash)::int as distinct, count(*)::int as total
        from invitations where kind = 'card'
      `;
      expect(row.bad).toBe(0);
      expect(row.distinct).toBe(row.total);
    });

    it('records four sign-ups by fixture accounts that may create a coven, one of them a coven owner', async () => {
      const accepted = await sql<{ id: string; can: boolean }[]>`
        select i.accepted_by as id, u.can_create_workspace as can
        from invitations i join users u on u.id = i.accepted_by
        where i.kind = 'card' and i.accepted_at is not null
      `;
      expect(accepted).toHaveLength(4);
      expect(accepted.every((a) => a.can)).toBe(true);
      const owners = await sql`
        select 1 from workspace_members
        where workspace_id = ${WORKSPACE_W_ID} and role = 'owner' and user_id = ${FIXTURE_USERS.A.id}
      `;
      expect(owners).toHaveLength(1);
      expect(accepted.map((a) => a.id)).toContain(FIXTURE_USERS.A.id);
    });

    it('records refused opens for all three reasons, with a spread of counts and times', async () => {
      const rows = await sql<{ reason: string; attempts: number; at: Date }[]>`
        select reason, attempts, last_attempted_at as at from card_invitation_attempts
      `;
      expect(new Set(rows.map((r) => r.reason))).toEqual(
        new Set(['revoked', 'expired', 'accepted']),
      );
      expect(new Set(rows.map((r) => r.attempts)).size).toBeGreaterThan(3);
      expect(new Set(rows.map((r) => String(r.at))).size).toBe(rows.length);
    });

    it('adds nothing on a second run', async () => {
      const before = await counts();
      const hashes =
        await sql`select token_hash from invitations where kind = 'card' order by token_hash`;
      await run();
      expect(await counts()).toEqual(before);
      expect(
        await sql`select token_hash from invitations where kind = 'card' order by token_hash`,
      ).toEqual(hashes);
    });
  });
});

describe('where the card seed runs', () => {
  const source = (file: string) => readFileSync(fromRoot('src/db/seed', file), 'utf8');

  it('is called by the demo scenario and by no other scenario nor reference seed', () => {
    expect(source('demo.ts')).toContain('seedInvitationCards');
    for (const file of ['minimal.ts', 'standard.ts', 'reference-data.ts', 'index.ts']) {
      expect(source(file), file).not.toContain('invitation-cards');
    }
    expect(readFileSync(fromRoot('scripts/db-seed.ts'), 'utf8')).not.toContain('invitation-cards');
  });
});
