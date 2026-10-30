import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { run } from '../../../support/graphql/run';

// The card operations' transport half: who may call each by direct request, the answer's shape, and that nothing but the
// mint answers a token. What a mint writes and refuses is services/invitation-cards.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const MINT = `mutation($count: Int!, $expiresAt: DateTime!) {
  createInvitationCards(count: $count, expiresAt: $expiresAt) { batchId expiresAt tokens }
}`;
const REVOKE = `mutation($id: ID!) { revokeInvitationCard(id: $id) { id state revokedAt } }`;
const REVOKE_BATCH = `mutation($batchId: ID!) { revokeInvitationCardBatch(batchId: $batchId) { id state } }`;
const LIST = `query($batchId: ID) {
  invitationCards(first: 50, batchId: $batchId) {
    edges { node { id batchId state expiresAt account { name } } }
  }
}`;
const ARRIVALS = `query {
  cardArrivals(first: 50) {
    edges { node { id acceptedAt account { name email } ownedCovens { id name } } }
  }
}`;
const CSV = `query { cardArrivalsCsv }`;

const nextWeek = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

interface Minted {
  createInvitationCards: { batchId: string; expiresAt: string; tokens: string[] };
}

beforeEach(async () => {
  await sql`truncate invitations`;
});

describe('the card operations', () => {
  it('refuses a curator, a member and an owner each one by direct request, with a card to reach', async () => {
    const minted = await run<Minted>(asUser(E), MINT, { count: 1, expiresAt: nextWeek() });
    const { batchId } = minted.data!.createInvitationCards;
    const [card] = await sql`select id, revoked_at from invitations where kind = 'card'`;
    expect(card!.revoked_at).toBeNull();

    for (const who of [F, B, A]) {
      const session = asUser(who);
      const answers = [
        await run(session, MINT, { count: 1, expiresAt: nextWeek() }),
        await run(session, REVOKE, { id: card!.id }),
        await run(session, REVOKE_BATCH, { batchId }),
        await run(session, LIST),
        await run(session, ARRIVALS),
        await run(session, CSV),
      ];
      for (const answer of answers) {
        expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      }
    }

    const rows = await sql`select revoked_at from invitations where kind = 'card'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revoked_at).toBeNull();
  });

  it('mints N pending cards sharing one batch and the chosen expiry', async () => {
    const expiresAt = nextWeek();

    const minted = await run<Minted>(asUser(E), MINT, { count: 3, expiresAt });

    const { batchId, tokens } = minted.data!.createInvitationCards;
    expect(tokens).toHaveLength(3);
    const rows =
      await sql`select batch_id, expires_at, accepted_at, revoked_at from invitations where kind = 'card'`;
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.batch_id).toBe(batchId);
      expect(row.expires_at.toISOString()).toBe(expiresAt);
      expect(row.accepted_at).toBeNull();
      expect(row.revoked_at).toBeNull();
    }
  });

  it('answers a batch over the cap with a validation error naming the count', async () => {
    const answer = await run(asUser(E), MINT, { count: 501, expiresAt: nextWeek() });

    expect(answer.errors?.[0]?.extensions?.code).toBe('VALIDATION');
    expect(JSON.stringify(answer.errors)).toContain('count');
    expect(await sql`select 1 from invitations where kind = 'card'`).toHaveLength(0);
  });

  it('revokes by id and by batch', async () => {
    const one = await run<Minted>(asUser(E), MINT, { count: 2, expiresAt: nextWeek() });
    const other = await run<Minted>(asUser(E), MINT, { count: 2, expiresAt: nextWeek() });
    const [first] = await sql`
      select id from invitations where batch_id = ${one.data!.createInvitationCards.batchId} limit 1`;

    const byId = await run<{ revokeInvitationCard: { state: string } }>(asUser(E), REVOKE, {
      id: first!.id,
    });
    const byBatch = await run<{ revokeInvitationCardBatch: unknown[] }>(asUser(E), REVOKE_BATCH, {
      batchId: other.data!.createInvitationCards.batchId,
    });

    expect(byId.data!.revokeInvitationCard.state).toBe('revoked');
    expect(byBatch.data!.revokeInvitationCardBatch).toHaveLength(2);
    const revoked =
      await sql`select 1 from invitations where kind = 'card' and revoked_at is not null`;
    expect(revoked).toHaveLength(3);
  });

  it('lists each state and names the accepting account, never a token', async () => {
    const minted = await run<Minted>(asUser(E), MINT, { count: 4, expiresAt: nextWeek() });
    const rows = await sql`select id from invitations where kind = 'card' order by id`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${rows[0]!.id}`;
    await sql`update invitations set revoked_at = now() where id = ${rows[1]!.id}`;
    await sql`update invitations set expires_at = now() - interval '1 day' where id = ${rows[2]!.id}`;

    const listed = await run<{
      invitationCards: {
        edges: { node: { id: string; state: string; account: { name: string } | null } }[];
      };
    }>(asUser(E), LIST, { batchId: minted.data!.createInvitationCards.batchId });

    const byId = new Map(listed.data!.invitationCards.edges.map(({ node }) => [node.id, node]));
    expect(byId.get(rows[0]!.id)!.state).toBe('accepted');
    expect(byId.get(rows[0]!.id)!.account!.name).toBe(B.name);
    expect(byId.get(rows[1]!.id)!.state).toBe('revoked');
    expect(byId.get(rows[2]!.id)!.state).toBe('expired');
    expect(byId.get(rows[3]!.id)!.state).toBe('pending');
    expect(byId.get(rows[3]!.id)!.account).toBeNull();
    expect(JSON.stringify(listed)).not.toMatch(
      new RegExp(minted.data!.createInvitationCards.tokens[0]!),
    );
  });

  it('lists an arrival with the covens its account owns, and not the covens it only belongs to', async () => {
    await run<Minted>(asUser(E), MINT, { count: 2, expiresAt: nextWeek() });
    const [card] = await sql`select id from invitations where kind = 'card' limit 1`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${A.id} where id = ${card!.id}`;
    const [owned] = await sql`
      select role from workspace_members where user_id = ${A.id} and workspace_id = ${WORKSPACE_W_ID}`;
    expect(owned!.role).toBe('owner');

    const arrivals = await run<{
      cardArrivals: {
        edges: { node: { account: { name: string }; ownedCovens: { id: string }[] } }[];
      };
    }>(asUser(E), ARRIVALS);

    const edges = arrivals.data!.cardArrivals.edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]!.node.account.name).toBe(A.name);
    expect(edges[0]!.node.ownedCovens.map((coven) => coven.id)).toEqual([WORKSPACE_W_ID]);
  });
});
