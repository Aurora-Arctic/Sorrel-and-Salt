import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { schema } from '@/graphql/schema';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import {
  AS_STRANGER,
  CARD_BATCH,
  STRANGER,
  TOKEN,
  setUpInvitationAcceptance,
} from '../../../support/db/invitation-acceptance';

// The attempts operations' transport half: who may call each by direct request, and that the recording takes a token alone.
// What is recorded and what is not is services/card-attempts.test.ts's.

let sql: postgres.Sql;
const { invite } = setUpInvitationAcceptance((client) => {
  sql = client;
});

const RECORD = `mutation($token: String!) { recordCardAttempt(token: $token) }`;
const ATTEMPTS = `query($id: ID!) {
  invitationCardAttempts(first: 50, batchId: $id) {
    edges { node { reason attempts firstAttemptedAt lastAttemptedAt account { name } } }
  }
}`;
const BATCHES = `query { invitationCardBatches(first: 50) { edges { node { batchId refusedOpens } } } }`;

describe('recordCardAttempt, by request', () => {
  it('takes the token alone, with no argument that could carry a reason, a card or an account', () => {
    const args = schema.getMutationType()!.getFields().recordCardAttempt!.args;
    expect(args.map((arg) => arg.name)).toEqual(['token']);
  });

  it('refuses a signed-out caller and records nothing, with an expired card there to be refused', async () => {
    await invite({ card: true, expired: true });

    const answer = await run(null, RECORD, { token: TOKEN });

    expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await sql`select 1 from card_invitation_attempts`).toHaveLength(0);
  });

  it('records for a signed-in account and answers true, naming nothing of the card', async () => {
    await invite({ card: true, expired: true });

    const answer = await run(asUser(AS_STRANGER), RECORD, { token: TOKEN });

    expect(answer).toMatchObject({ data: { recordCardAttempt: true } });
    expect(await sql`select user_id from card_invitation_attempts`).toEqual([
      { user_id: STRANGER },
    ]);
  });
});

describe('the attempts reads, by request', () => {
  it('refuses a curator, a member and a signed-out caller the connection and the batch count, and shows both to an admin', async () => {
    await invite({ card: true, expired: true });
    await run(asUser(AS_STRANGER), RECORD, { token: TOKEN });
    await run(asUser(AS_STRANGER), RECORD, { token: TOKEN });
    expect(await sql`select attempts from card_invitation_attempts`).toEqual([{ attempts: 2 }]);

    for (const who of [asUser(F), asUser(B), asUser(A), null]) {
      const list = await run(who, ATTEMPTS, { id: CARD_BATCH });
      const batches = await run(who, BATCHES);
      expect(list.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(batches.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }

    const list = await run<{
      invitationCardAttempts: { edges: { node: Record<string, unknown> }[] };
    }>(asUser(E), ATTEMPTS, { id: CARD_BATCH });
    expect(list.data!.invitationCardAttempts.edges[0]!.node).toMatchObject({
      reason: 'expired',
      attempts: 2,
      account: { name: 'Fixture Person' },
    });
    const batches = await run(asUser(E), BATCHES);
    expect(batches.data).toMatchObject({
      invitationCardBatches: { edges: [{ node: { batchId: CARD_BATCH, refusedOpens: 2 } }] },
    });
  });
});
