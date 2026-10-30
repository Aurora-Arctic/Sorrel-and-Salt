import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  MAX_CARDS_PER_BATCH,
  cardArrivalsCsv,
  cardState,
  countInvitationCards,
  listCardArrivals,
  listInvitationCards,
  mintInvitationCards,
  revokeInvitationCard,
  revokeInvitationCardBatch,
} from '@/modules/identity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// An admin mints a batch of cards, lists them and withdraws one or the batch; the token is returned once and the row holds its hash.
// The curator boundary is the first describe; what a card admits is invitation-acceptance-by-token.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const NEXT_WEEK = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const cards = () => sql`select * from invitations where kind = 'card' order by created_at, id`;

beforeEach(async () => {
  await sql`truncate invitations`;
});

describe('who may mint, list and revoke', () => {
  it('refuses a curator, a member and a non-admin each call, with a card there to be reached', async () => {
    const { batchId } = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const [card] = await cards();
    expect(card!.revoked_at).toBeNull();

    for (const who of [F, A, B]) {
      const session = asUser(who);
      await expect(mintInvitationCards(session, 1, NEXT_WEEK())).rejects.toBeInstanceOf(Forbidden);
      await expect(revokeInvitationCard(session, card!.id)).rejects.toBeInstanceOf(Forbidden);
      await expect(revokeInvitationCardBatch(session, batchId)).rejects.toBeInstanceOf(Forbidden);
      await expect(listInvitationCards(session, undefined, PAGE)).rejects.toBeInstanceOf(Forbidden);
      await expect(countInvitationCards(session, undefined, undefined)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(listCardArrivals(session, PAGE)).rejects.toBeInstanceOf(Forbidden);
      await expect(cardArrivalsCsv(session)).rejects.toBeInstanceOf(Forbidden);
    }

    expect(await cards()).toHaveLength(1);
    expect((await cards())[0]!.revoked_at).toBeNull();
  });
});

describe('mintInvitationCards', () => {
  it('writes N pending cards sharing one batch and the chosen expiry, and returns each token once', async () => {
    const expiresAt = NEXT_WEEK();

    const minted = await mintInvitationCards(asUser(E), 3, expiresAt);

    const rows = await cards();
    expect(rows).toHaveLength(3);
    expect(new Set(minted.tokens).size).toBe(3);
    expect(new Set(rows.map((row) => row.batch_id))).toEqual(new Set([minted.batchId]));
    for (const row of rows) {
      expect(row.expires_at.getTime()).toBe(expiresAt.getTime());
      expect(row.accepted_at).toBeNull();
      expect(row.revoked_at).toBeNull();
      expect(row.created_by).toBe(E.id);
    }
    // Only the hash is stored: no column holds a token.
    expect(rows.map((row) => row.token_hash).sort()).toEqual(minted.tokens.map(sha256).sort());
    expect(JSON.stringify(rows)).not.toContain(minted.tokens[0]);
  });

  it(`mints ${MAX_CARDS_PER_BATCH} in one call and refuses one more`, async () => {
    const minted = await mintInvitationCards(asUser(E), MAX_CARDS_PER_BATCH, NEXT_WEEK());
    expect(minted.tokens).toHaveLength(MAX_CARDS_PER_BATCH);
    expect(await cards()).toHaveLength(MAX_CARDS_PER_BATCH);

    const refused = await mintInvitationCards(
      asUser(E),
      MAX_CARDS_PER_BATCH + 1,
      NEXT_WEEK(),
    ).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ValidationError);
    expect((refused as ValidationError).issues[0]!.message).toMatch(/from 1 to 500/);
    expect(await cards()).toHaveLength(MAX_CARDS_PER_BATCH);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a count of %s', async (count) => {
    await expect(mintInvitationCards(asUser(E), count, NEXT_WEEK())).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await cards()).toHaveLength(0);
  });

  it('refuses an expiry that is past or not a date', async () => {
    await expect(
      mintInvitationCards(asUser(E), 1, new Date(Date.now() - 1000)),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(mintInvitationCards(asUser(E), 1, new Date('nope'))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await cards()).toHaveLength(0);
  });
});

describe('revoking', () => {
  it('revokes one pending card by id, and not twice', async () => {
    await mintInvitationCards(asUser(E), 2, NEXT_WEEK());
    const [first, second] = await cards();

    const row = await revokeInvitationCard(asUser(E), first!.id);

    expect(row.revokedAt).toBeInstanceOf(Date);
    expect((await cards()).map((card) => card.revoked_at !== null)).toEqual([true, false]);
    await expect(revokeInvitationCard(asUser(E), first!.id)).rejects.toBeInstanceOf(NotFound);
    expect(second!.revoked_at).toBeNull();
  });

  it('revokes the pending cards of a batch and leaves an accepted card and another batch', async () => {
    const batch = await mintInvitationCards(asUser(E), 3, NEXT_WEEK());
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const rows = await cards();
    const inBatch = rows.filter((row) => row.batch_id === batch.batchId);
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${inBatch[0]!.id}`;

    const revoked = await revokeInvitationCardBatch(asUser(E), batch.batchId);

    expect(revoked).toHaveLength(2);
    const after = await cards();
    expect(after.filter((row) => row.revoked_at).map((row) => row.id)).toEqual(
      inBatch
        .slice(1)
        .map((row) => row.id)
        .sort(),
    );
    expect(after.find((row) => row.id === inBatch[0]!.id)!.revoked_at).toBeNull();
  });

  it('says so for a batch no card belongs to, and for a malformed id', async () => {
    await expect(
      revokeInvitationCardBatch(asUser(E), '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(revokeInvitationCardBatch(asUser(E), 'nope')).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(revokeInvitationCard(asUser(E), 'nope')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('listing', () => {
  it('pages every card, narrowed to a batch, and counts them', async () => {
    const one = await mintInvitationCards(asUser(E), 2, NEXT_WEEK());
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());

    expect(await listInvitationCards(asUser(E), undefined, PAGE)).toHaveLength(3);
    const narrowed = await listInvitationCards(asUser(E), one.batchId, PAGE);
    expect(narrowed.map(({ node }) => node.batchId)).toEqual([one.batchId, one.batchId]);
    expect((await countInvitationCards(asUser(E), one.batchId, undefined)).totalCount).toBe(2);
  });

  it('names the four states, an accepted card staying accepted past its date', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000);
    const future = new Date(now.getTime() + 1000);
    expect(cardState({ acceptedAt: null, revokedAt: null, expiresAt: future }, now)).toBe(
      'pending',
    );
    expect(cardState({ acceptedAt: null, revokedAt: null, expiresAt: past }, now)).toBe('expired');
    expect(cardState({ acceptedAt: null, revokedAt: past, expiresAt: future }, now)).toBe(
      'revoked',
    );
    expect(cardState({ acceptedAt: past, revokedAt: null, expiresAt: past }, now)).toBe('accepted');
  });
});

describe('the arrivals CSV', () => {
  it('lists an account that accepted a card, with a header, and guards a formula', async () => {
    const { batchId } = await mintInvitationCards(asUser(E), 2, NEXT_WEEK());
    const [first] = await cards();
    await sql`update users set name = '=Hyperlink, "Q"' where id = ${B.id}`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${first!.id}`;

    const csv = await cardArrivalsCsv(asUser(E));

    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('Account Name,Email,Accepted,Batch');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      `"'=Hyperlink, ""Q""",${B.email},${new Date().toISOString().slice(0, 10)},${batchId}`,
    );
  });

  it('is only a header when nobody arrived', async () => {
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    expect(await cardArrivalsCsv(asUser(E))).toBe('Account Name,Email,Accepted,Batch\r\n');
  });
});
