import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  countCardAttempts,
  listCardAttempts,
  recordCardAttempt,
  revokeInvitationCard,
  revokeInvitationCardBatch,
  totalCardAttempts,
} from '@/modules/identity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import {
  AS_GRANTEE,
  AS_STRANGER,
  CARD_BATCH,
  GRANTEE,
  STRANGER,
  TOKEN,
  setUpInvitationAcceptance,
} from '../../../support/db/invitation-acceptance';

// A signed-in, verified account that opens a card link the service refuses for a recordable reason leaves one row per card, account and reason, with a count.
// Every other open leaves none; the admin reads are at the foot.

let sql: postgres.Sql;
const { invite, invitation } = setUpInvitationAcceptance((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const rows = () =>
  sql`select invitation_id, user_id, reason, attempts, last_attempted_at, created_by from card_invitation_attempts order by reason, user_id`;

describe('recordCardAttempt, on a refused card', () => {
  it('records a revoked card revoked by id, under the account that opened it', async () => {
    const id = await invite({ card: true });
    await revokeInvitationCard(asUser(E), id);

    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);

    expect(await rows()).toEqual([
      expect.objectContaining({
        invitation_id: id,
        user_id: STRANGER,
        reason: 'revoked',
        attempts: 1,
        created_by: STRANGER,
      }),
    ]);
  });

  it('records a card revoked with its batch as revoked', async () => {
    const id = await invite({ card: true });
    await revokeInvitationCardBatch(asUser(E), CARD_BATCH);

    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);

    expect(await rows()).toEqual([
      expect.objectContaining({ invitation_id: id, reason: 'revoked', attempts: 1 }),
    ]);
  });

  it('records an expired card as expired', async () => {
    await invite({ card: true, expired: true });

    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);

    expect(await rows()).toEqual([expect.objectContaining({ reason: 'expired', attempts: 1 })]);
  });

  it('records a card another account accepted as accepted', async () => {
    await invite({ card: true, accepted: true });
    expect((await invitation()).accepted_by).toBe(STRANGER);

    await recordCardAttempt(asUser(AS_GRANTEE), TOKEN);

    expect(await rows()).toEqual([
      expect.objectContaining({ user_id: GRANTEE, reason: 'accepted', attempts: 1 }),
    ]);
  });

  it('adds one to the count and moves the latest time on a second open for the same reason, and keeps a different reason as a row of its own', async () => {
    await invite({ card: true, expired: true });
    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);
    const [first] = await rows();

    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);

    const [second] = await rows();
    expect(await rows()).toHaveLength(1);
    expect(second!.attempts).toBe(2);
    expect(second!.last_attempted_at.getTime()).toBeGreaterThan(first!.last_attempted_at.getTime());

    await sql`update invitations set revoked_at = now()`;
    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);
    expect((await rows()).map((row) => [row.reason, row.attempts])).toEqual([
      ['expired', 2],
      ['revoked', 1],
    ]);
  });

  it('keeps one row per account', async () => {
    await invite({ card: true, expired: true });

    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);
    await recordCardAttempt(asUser(AS_GRANTEE), TOKEN);

    expect((await rows()).map((row) => row.user_id).sort()).toEqual([GRANTEE, STRANGER].sort());
  });
});

// Each case below would be recorded, bar the one thing it changes: the control row in each test shows that.
describe('recordCardAttempt, on an open it does not record', () => {
  async function recordsFor(session = asUser(AS_STRANGER), token = TOKEN) {
    await sql`truncate card_invitation_attempts`;
    await recordCardAttempt(session, token);
    return rows();
  }

  it('records nothing for an unverified account', async () => {
    await invite({ card: true, expired: true });
    expect(await recordsFor()).toHaveLength(1);

    await sql`update users set email_verified = false where id = ${STRANGER}`;
    expect(await recordsFor()).toEqual([]);
  });

  it('records nothing for a token naming no card, nor for an address invitation', async () => {
    await invite({ card: true, expired: true });
    expect(await recordsFor()).toHaveLength(1);

    expect(
      await recordsFor(asUser(AS_STRANGER), 'not-a-token-dddddddddddddddddddddddddddd'),
    ).toEqual([]);
    await sql`truncate card_invitation_attempts, invitations`;
    await invite({ expired: true });
    expect(await recordsFor()).toEqual([]);
  });

  it('records nothing for a pending card', async () => {
    await invite({ card: true, expired: true });
    expect(await recordsFor()).toHaveLength(1);

    await sql`update invitations set expires_at = now() + interval '1 day'`;
    expect(await recordsFor()).toEqual([]);
  });

  it('records nothing for the account that accepted the card', async () => {
    await invite({ card: true, accepted: true });
    expect(await recordsFor(asUser(AS_GRANTEE))).toHaveLength(1);

    expect(await recordsFor(asUser(AS_STRANGER))).toEqual([]);
  });
});

describe('the attempts reads', () => {
  async function twoCards() {
    const first = await invite({ card: true, expired: true });
    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);
    await recordCardAttempt(asUser(AS_STRANGER), TOKEN);
    await recordCardAttempt(asUser(AS_GRANTEE), TOKEN);
    const second = await invite({
      card: true,
      expired: true,
      token: 'other-card-token-eeeeeeeeeeeeeeeeeeeeeeeeee',
    });
    await recordCardAttempt(asUser(AS_GRANTEE), 'other-card-token-eeeeeeeeeeeeeeeeeeeeeeeeee');
    return { first, second };
  }

  it('refuses a curator and a member the list, the count and the totals by direct call, with attempts there to be read', async () => {
    const { first } = await twoCards();
    expect(await rows()).toHaveLength(3);

    for (const who of [asUser(F), asUser(A), asUser(B)]) {
      await expect(listCardAttempts(who, first, PAGE)).rejects.toBeInstanceOf(Forbidden);
      await expect(countCardAttempts(who, first, undefined)).rejects.toBeInstanceOf(Forbidden);
      await expect(totalCardAttempts(who, [first])).rejects.toBeInstanceOf(Forbidden);
    }
    expect(await totalCardAttempts(asUser(E), [first])).toEqual([
      { invitationId: first, total: 3 },
    ]);
  });

  it("lists one card's attempts alone, latest first, and totals each card", async () => {
    const { first, second } = await twoCards();

    const list = await listCardAttempts(asUser(E), first, PAGE);
    expect(
      list.map((entry) => [entry.node.userId, entry.node.reason, entry.node.attempts]),
    ).toEqual(
      expect.arrayContaining([
        [STRANGER, 'expired', 2],
        [GRANTEE, 'expired', 1],
      ]),
    );
    expect(list).toHaveLength(2);
    expect(list.every((entry) => entry.node.invitationId === first)).toBe(true);
    expect(await countCardAttempts(asUser(E), first, undefined)).toMatchObject({ totalCount: 2 });
    expect(await totalCardAttempts(asUser(E), [first, second])).toEqual(
      expect.arrayContaining([
        { invitationId: first, total: 3 },
        { invitationId: second, total: 1 },
      ]),
    );
  });
});
