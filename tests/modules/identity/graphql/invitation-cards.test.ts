import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { CARDS_PER_SHEET, MAX_SHEETS_PER_BATCH } from '@/lib/invitation-cards/limits';
import { run } from '../../../support/graphql/run';

// The card operations' transport half: who may call each by direct request, the answer's shape, and that nothing but the
// mint answers a token. What a mint writes and refuses is services/invitation-cards.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const MINT = `mutation($sheets: Int!, $expiresAt: DateTime!) {
  createInvitationCards(sheets: $sheets, expiresAt: $expiresAt) { batchId expiresAt tokens }
}`;
const REVOKE_BATCH = `mutation($batchId: ID!) { revokeInvitationCardBatch(batchId: $batchId) { id state } }`;
const BATCHES = `query {
  invitationCardBatches(first: 50) {
    edges { node { batchId mintedAt expiresAt cards accepted pending } }
  }
}`;
const ARRIVALS = `query {
  cardArrivals(first: 50) {
    edges { node { id acceptedAt account { name email } ownedCovens { id name } } }
  }
}`;
const CSV = `query { cardArrivalsCsv }`;
const filteredBatches = (batchId: string) => `query {
  invitationCardBatches(first: 50, batch: "${batchId.slice(0, 4)}", status: live, mintedFrom: "2020-01-01", expiresTo: "2099-12-31") {
    edges { node { batchId } }
  }
}`;
const USED_UP_BATCHES = `query { invitationCardBatches(first: 50, status: usedUp) { edges { node { batchId } } } }`;
const filteredArrivals = (batchId: string) =>
  `query { cardArrivals(first: 50, query: "${batchId.slice(0, 4)}") { edges { node { id } } } }`;
const filteredCsv = (batchId: string) =>
  `query { cardArrivalsCsv(query: "${batchId.slice(0, 4)}") }`;

const nextWeek = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

interface Minted {
  createInvitationCards: { batchId: string; expiresAt: string; tokens: string[] };
}

beforeEach(async () => {
  await sql`truncate card_invitation_attempts, invitations`;
});

describe('the card operations', () => {
  it('refuses a curator, a member and an owner each one by direct request, with a card to reach', async () => {
    const minted = await run<Minted>(asUser(E), MINT, { sheets: 1, expiresAt: nextWeek() });
    const { batchId } = minted.data!.createInvitationCards;
    // An arrival the filters reach, so an admin's request answers a row.
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = (select id from invitations where kind = 'card' limit 1)`;
    const reached = await run<{ invitationCardBatches: { edges: unknown[] } }>(
      asUser(E),
      filteredBatches(batchId),
    );
    expect(JSON.stringify(reached.errors)).toBeUndefined();
    expect(reached.data!.invitationCardBatches.edges).toHaveLength(1);

    for (const who of [F, B, A]) {
      const session = asUser(who);
      const answers = [
        await run(session, MINT, { sheets: 1, expiresAt: nextWeek() }),
        await run(session, REVOKE_BATCH, { batchId }),
        await run(session, BATCHES),
        await run(session, ARRIVALS),
        await run(session, CSV),
        await run(session, filteredBatches(batchId)),
        await run(session, filteredArrivals(batchId)),
        await run(session, filteredCsv(batchId)),
      ];
      for (const answer of answers) {
        expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      }
    }

    const rows = await sql`select revoked_at from invitations where kind = 'card'`;
    expect(rows).toHaveLength(CARDS_PER_SHEET);
    expect(rows.every((row) => row.revoked_at === null)).toBe(true);
  });

  it('mints nine pending cards a sheet sharing one batch and the chosen expiry', async () => {
    const expiresAt = nextWeek();

    const minted = await run<Minted>(asUser(E), MINT, { sheets: 2, expiresAt });

    const { batchId, tokens } = minted.data!.createInvitationCards;
    expect(tokens).toHaveLength(2 * CARDS_PER_SHEET);
    const rows =
      await sql`select batch_id, expires_at, accepted_at, revoked_at from invitations where kind = 'card'`;
    expect(rows).toHaveLength(2 * CARDS_PER_SHEET);
    for (const row of rows) {
      expect(row.batch_id).toBe(batchId);
      expect(row.expires_at.toISOString()).toBe(expiresAt);
      expect(row.accepted_at).toBeNull();
      expect(row.revoked_at).toBeNull();
    }
  });

  it('answers a batch over the cap with a validation error naming the sheets', async () => {
    const answer = await run(asUser(E), MINT, {
      sheets: MAX_SHEETS_PER_BATCH + 1,
      expiresAt: nextWeek(),
    });

    expect(answer.errors?.[0]?.extensions?.code).toBe('VALIDATION');
    expect(JSON.stringify(answer.errors)).toContain('sheets');
    expect(await sql`select 1 from invitations where kind = 'card'`).toHaveLength(0);
  });

  it('revokes a batch, and no card by id', async () => {
    const other = await run<Minted>(asUser(E), MINT, { sheets: 1, expiresAt: nextWeek() });
    const kept = await run<Minted>(asUser(E), MINT, { sheets: 1, expiresAt: nextWeek() });

    const byBatch = await run<{ revokeInvitationCardBatch: unknown[] }>(asUser(E), REVOKE_BATCH, {
      batchId: other.data!.createInvitationCards.batchId,
    });
    const byId = await run(asUser(E), `mutation { revokeInvitationCard(id: "x") { id } }`);

    expect(byBatch.data!.revokeInvitationCardBatch).toHaveLength(CARDS_PER_SHEET);
    expect(byId.errors?.[0]?.message).toMatch(/Cannot query field "revokeInvitationCard"/);
    const live = await sql`
      select 1 from invitations where batch_id = ${kept.data!.createInvitationCards.batchId} and revoked_at is null`;
    expect(live).toHaveLength(CARDS_PER_SHEET);
  });

  it('lists one row per batch with its cards, accepted and pending counts, never a token', async () => {
    const minted = await run<Minted>(asUser(E), MINT, { sheets: 2, expiresAt: nextWeek() });
    const rows = await sql`select id from invitations where kind = 'card' order by id`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${rows[0]!.id}`;
    await sql`update invitations set revoked_at = now() where id = ${rows[1]!.id}`;
    await sql`update invitations set expires_at = now() - interval '1 day' where id = ${rows[2]!.id}`;

    const listed = await run<{
      invitationCardBatches: {
        edges: {
          node: { batchId: string; cards: number; accepted: number; pending: number };
        }[];
      };
    }>(asUser(E), BATCHES);

    expect(JSON.stringify(listed.errors)).toBeUndefined();
    const edges = listed.data!.invitationCardBatches.edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]!.node).toMatchObject({
      batchId: minted.data!.createInvitationCards.batchId,
      cards: 2 * CARDS_PER_SHEET,
      accepted: 1,
      pending: 2 * CARDS_PER_SHEET - 3,
    });
    expect(JSON.stringify(listed)).not.toContain(minted.data!.createInvitationCards.tokens[0]!);
  });

  it('narrows the batches by status and the arrivals by account or batch, in SQL', async () => {
    const minted = await run<Minted>(asUser(E), MINT, { sheets: 1, expiresAt: nextWeek() });
    const { batchId } = minted.data!.createInvitationCards;
    const [card] = await sql`select id from invitations where kind = 'card' limit 1`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${card!.id}`;

    const live = await run<{ invitationCardBatches: { edges: unknown[] } }>(
      asUser(E),
      `query { invitationCardBatches(first: 50, status: live, batch: "${batchId.slice(0, 4)}") { edges { node { batchId } } } }`,
    );
    const usedUp = await run<{ invitationCardBatches: { edges: unknown[] } }>(
      asUser(E),
      USED_UP_BATCHES,
    );
    const named = await run<{ cardArrivals: { edges: unknown[] } }>(
      asUser(E),
      `query { cardArrivals(first: 50, query: "${B.email}") { edges { node { id } } } }`,
    );
    const other = await run<{ cardArrivals: { edges: unknown[] } }>(
      asUser(E),
      `query { cardArrivals(first: 50, query: "${A.email}") { edges { node { id } } } }`,
    );
    const byBatch = await run<{ cardArrivals: { edges: unknown[] } }>(
      asUser(E),
      `query { cardArrivals(first: 50, query: "${batchId.slice(0, 8)}") { edges { node { id } } } }`,
    );
    const csv = await run<{ cardArrivalsCsv: string }>(
      asUser(E),
      `query { cardArrivalsCsv(query: "${A.email}") }`,
    );

    expect(live.data!.invitationCardBatches.edges).toHaveLength(1);
    expect(usedUp.data!.invitationCardBatches.edges).toHaveLength(0);
    expect(named.data!.cardArrivals.edges).toHaveLength(1);
    expect(other.data!.cardArrivals.edges).toHaveLength(0);
    expect(byBatch.data!.cardArrivals.edges).toHaveLength(1);
    expect(csv.data!.cardArrivalsCsv.trimEnd().split('\r\n')).toHaveLength(1);
  });

  it('lists an arrival with the covens its account owns, and not the covens it only belongs to', async () => {
    await run<Minted>(asUser(E), MINT, { sheets: 2, expiresAt: nextWeek() });
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
