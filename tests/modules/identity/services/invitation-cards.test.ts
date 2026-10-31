import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { CARDS_PER_SHEET, MAX_SHEETS_PER_BATCH } from '@/lib/invitation-cards/limits';
import type { PageRequest } from '@/lib/types';
import {
  cardArrivalsCsv,
  cardBatchTotals,
  cardState,
  countCardArrivals,
  countCardBatches,
  listCardArrivals,
  listCardBatches,
  mintInvitationCards,
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
  await sql`truncate card_invitation_attempts, invitations`;
});

describe('who may mint, list and revoke', () => {
  it('refuses a curator, a member and a non-admin each call, with a card there to be reached', async () => {
    const { batchId } = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const rows = await cards();
    expect(rows.every((row) => row.revoked_at === null)).toBe(true);
    // Filters that name the batch and an arrival it holds, so an admin's call would answer a row.
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${rows[0]!.id}`;
    const FILTERED_BATCHES = { batch: batchId.slice(0, 4), status: 'live' as const };
    const FILTERED_ARRIVALS = { query: B.email, batch: batchId.slice(0, 4) };
    expect(await listCardBatches(asUser(E), FILTERED_BATCHES, PAGE)).toHaveLength(1);
    expect(await listCardArrivals(asUser(E), FILTERED_ARRIVALS, PAGE)).toHaveLength(1);

    for (const who of [F, A, B]) {
      const session = asUser(who);
      await expect(mintInvitationCards(session, 1, NEXT_WEEK())).rejects.toBeInstanceOf(Forbidden);
      await expect(revokeInvitationCardBatch(session, batchId)).rejects.toBeInstanceOf(Forbidden);
      await expect(listCardBatches(session, FILTERED_BATCHES, PAGE)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(countCardBatches(session, FILTERED_BATCHES, undefined)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(cardBatchTotals(session, [batchId])).rejects.toBeInstanceOf(Forbidden);
      await expect(listCardArrivals(session, FILTERED_ARRIVALS, PAGE)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(countCardArrivals(session, FILTERED_ARRIVALS, undefined)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(cardArrivalsCsv(session, FILTERED_ARRIVALS)).rejects.toBeInstanceOf(Forbidden);
    }

    expect(await cards()).toHaveLength(CARDS_PER_SHEET);
    expect((await cards()).every((row) => row.revoked_at === null)).toBe(true);
  });
});

describe('mintInvitationCards', () => {
  it('writes nine pending cards a sheet sharing one batch and the chosen expiry, and returns each token once', async () => {
    const expiresAt = NEXT_WEEK();

    const minted = await mintInvitationCards(asUser(E), 2, expiresAt);

    const rows = await cards();
    expect(rows).toHaveLength(2 * CARDS_PER_SHEET);
    expect(new Set(minted.tokens).size).toBe(2 * CARDS_PER_SHEET);
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

  it('numbers each card by its place in the token list, which is the order the PDF lays the fronts out', async () => {
    const minted = await mintInvitationCards(asUser(E), 2, NEXT_WEEK());

    const rows =
      await sql`select token_hash, position from invitations where kind = 'card' order by position`;
    expect(rows.map((row) => row.position)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(rows.map((row) => row.token_hash)).toEqual(minted.tokens.map(sha256));
  });

  it('refuses a position on an address invitation and a position below 1 on a card', async () => {
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    await expect(sql`update invitations set position = 0 where kind = 'card'`).rejects.toThrow(
      /invitations_position_positive/,
    );
    await expect(
      sql`insert into invitations (email, token_hash, kind, site_role, position, created_by, updated_by) values ('x@example.test', 'h', 'address', 'curator', 1, ${E.id}, ${E.id})`,
    ).rejects.toThrow(/invitations_position_card_only/);
  });

  it(`mints ${MAX_SHEETS_PER_BATCH} sheets in one call and refuses one more`, async () => {
    const minted = await mintInvitationCards(asUser(E), MAX_SHEETS_PER_BATCH, NEXT_WEEK());
    expect(minted.tokens).toHaveLength(MAX_SHEETS_PER_BATCH * CARDS_PER_SHEET);
    expect(MAX_SHEETS_PER_BATCH * CARDS_PER_SHEET).toBe(495);
    expect(await cards()).toHaveLength(495);

    const refused = await mintInvitationCards(
      asUser(E),
      MAX_SHEETS_PER_BATCH + 1,
      NEXT_WEEK(),
    ).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ValidationError);
    expect((refused as ValidationError).issues[0]!.message).toMatch(/from 1 to 55 sheets/);
    expect(await cards()).toHaveLength(495);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses %s sheets, a part sheet included', async (sheets) => {
    await expect(mintInvitationCards(asUser(E), sheets, NEXT_WEEK())).rejects.toBeInstanceOf(
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
  it('revokes the pending cards of a batch and leaves an accepted card and another batch', async () => {
    const batch = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const rows = await cards();
    const inBatch = rows.filter((row) => row.batch_id === batch.batchId);
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${inBatch[0]!.id}`;

    const revoked = await revokeInvitationCardBatch(asUser(E), batch.batchId);

    expect(revoked).toHaveLength(CARDS_PER_SHEET - 1);
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
  });
});

describe('listing', () => {
  it('pages one entry per batch, newest first, and counts the batches', async () => {
    const first = await mintInvitationCards(asUser(E), 2, NEXT_WEEK());
    await sql`update invitations set created_at = created_at - interval '1 day' where batch_id = ${first.batchId}`;
    const second = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());

    const page = await listCardBatches(asUser(E), {}, PAGE);

    expect(page.map(({ node }) => node.batchId)).toEqual([second.batchId, first.batchId]);
    expect((await countCardBatches(asUser(E), {}, undefined)).totalCount).toBe(2);
    const turned = await listCardBatches(
      asUser(E),
      {},
      { ...PAGE, limit: 2, after: page[0]!.cursor },
    );
    expect(turned.map(({ node }) => node.batchId)).toEqual([first.batchId]);
  });

  it('totals each batch in SQL: its cards, the accepted and the ones still pending', async () => {
    const batch = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const other = await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const rows = (await cards()).filter((row) => row.batch_id === batch.batchId);
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${rows[0]!.id}`;
    await sql`update invitations set revoked_at = now() where id = ${rows[1]!.id}`;
    await sql`update invitations set expires_at = now() - interval '1 second' where id = ${rows[2]!.id}`;

    const totals = await cardBatchTotals(asUser(E), [batch.batchId, other.batchId]);

    expect(totals.find((t) => t.batchId === batch.batchId)).toEqual({
      batchId: batch.batchId,
      attempts: 0,
      cards: CARDS_PER_SHEET,
      accepted: 1,
      pending: CARDS_PER_SHEET - 3,
    });
    expect(totals.find((t) => t.batchId === other.batchId)).toMatchObject({
      cards: CARDS_PER_SHEET,
      accepted: 0,
      pending: CARDS_PER_SHEET,
    });
    expect(await cardBatchTotals(asUser(E), [])).toEqual([]);
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

  it('holds only the arrivals the filter keeps', async () => {
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    const [first, second] = await cards();
    await sql`update invitations set accepted_at = now(), accepted_by = ${A.id} where id = ${first!.id}`;
    await sql`update invitations set accepted_at = now(), accepted_by = ${B.id} where id = ${second!.id}`;

    const everyone = await cardArrivalsCsv(asUser(E));
    const byName = await cardArrivalsCsv(asUser(E), { query: B.email });
    const byBatch = await cardArrivalsCsv(asUser(E), { batch: 'ffffffff' });

    expect(everyone.trimEnd().split('\r\n')).toHaveLength(3);
    expect(byName.trimEnd().split('\r\n')).toHaveLength(2);
    expect(byName).toContain(B.email);
    expect(byName).not.toContain(A.email);
    expect(byBatch).toBe('Account Name,Email,Accepted,Batch\r\n');
  });

  it('is only a header when nobody arrived', async () => {
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());
    expect(await cardArrivalsCsv(asUser(E))).toBe('Account Name,Email,Accepted,Batch\r\n');
  });
});

describe('the filters', () => {
  it('reads a blank text part as no filter and refuses a day that is not one', async () => {
    await mintInvitationCards(asUser(E), 1, NEXT_WEEK());

    const blank = await listCardBatches(asUser(E), { batch: '  ' }, PAGE);

    expect(blank).toHaveLength(1);
    await expect(
      listCardBatches(asUser(E), { mintedFrom: 'yesterday' }, PAGE),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      countCardBatches(asUser(E), { expiresTo: '2026-02-31' }, undefined),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
