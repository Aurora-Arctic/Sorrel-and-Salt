import { and, eq, inArray } from 'drizzle-orm';
import { CARDS_PER_SHEET } from '../../lib/invitation-cards/limits';
import { newCardToken } from '../../lib/invitation-token';
import { cardInvitationAttempts } from '../../modules/coven/schema/card-invitation-attempts';
import { invitations } from '../../modules/coven/schema/invitations';
import { users } from '../../modules/identity/schema/users';
import { createHash } from 'node:crypto';
import { insertMissingBy } from './idempotent';
import { FIXTURE_USERS } from './standard';
import type { SeedTransaction } from './types';

// Fake invitation cards for the `demo` scenario, so the admin Invitation Cards and Card Sign-Ups tabs have rows to show.
// Never in `standard` (cloned for every db test) nor in a reference seed (those run on staging and production). Tokens are
// random and thrown away: only the hash is stored, so these cards cannot be redeemed.

const DAY = 24 * 60 * 60 * 1000;

type CardState = 'live' | 'revoked' | 'expired';

interface SeedCardBatch {
  /** Fixed, so a second run finds the batch; a batch has no table of its own. */
  id: string;
  state: CardState;
  sheets: number;
  /** Days from the first run: negative is in the past. */
  expiresInDays: number;
}

export const CARD_BATCHES: readonly SeedCardBatch[] = [
  { id: '00000000-0000-0000-0004-000000000001', state: 'live', sheets: 2, expiresInDays: 21 },
  { id: '00000000-0000-0000-0004-000000000002', state: 'revoked', sheets: 1, expiresInDays: 14 },
  { id: '00000000-0000-0000-0004-000000000003', state: 'expired', sheets: 1, expiresInDays: -10 },
];

const [LIVE, REVOKED, EXPIRED] = CARD_BATCHES;

interface SeedCardSignUp {
  batchId: string;
  position: number;
  userId: string;
  /** Days before the first run. */
  daysAgo: number;
}

/** A owns W, so the Covens Owned column shows one; B and D hold seats; C accepted a card before its batch expired. */
export const CARD_SIGN_UPS: readonly SeedCardSignUp[] = [
  { batchId: LIVE.id, position: 1, userId: FIXTURE_USERS.A.id, daysAgo: 6 },
  { batchId: LIVE.id, position: 5, userId: FIXTURE_USERS.B.id, daysAgo: 3 },
  { batchId: LIVE.id, position: 12, userId: FIXTURE_USERS.D.id, daysAgo: 1 },
  { batchId: EXPIRED.id, position: 4, userId: FIXTURE_USERS.C.id, daysAgo: 20 },
];

interface SeedCardRefusal {
  batchId: string;
  position: number;
  userId: string;
  reason: 'revoked' | 'expired' | 'accepted';
  attempts: number;
  /** Days before the first run; fractions give an hour of the day. */
  daysAgo: number;
}

export const CARD_REFUSALS: readonly SeedCardRefusal[] = [
  {
    batchId: REVOKED.id,
    position: 2,
    userId: FIXTURE_USERS.C.id,
    reason: 'revoked',
    attempts: 1,
    daysAgo: 0.1,
  },
  {
    batchId: REVOKED.id,
    position: 2,
    userId: FIXTURE_USERS.D.id,
    reason: 'revoked',
    attempts: 4,
    daysAgo: 2.5,
  },
  {
    batchId: REVOKED.id,
    position: 7,
    userId: FIXTURE_USERS.B.id,
    reason: 'revoked',
    attempts: 2,
    daysAgo: 5,
  },
  {
    batchId: EXPIRED.id,
    position: 4,
    userId: FIXTURE_USERS.D.id,
    reason: 'accepted',
    attempts: 3,
    daysAgo: 9,
  },
  {
    batchId: EXPIRED.id,
    position: 6,
    userId: FIXTURE_USERS.A.id,
    reason: 'expired',
    attempts: 7,
    daysAgo: 1.2,
  },
  {
    batchId: EXPIRED.id,
    position: 9,
    userId: FIXTURE_USERS.B.id,
    reason: 'expired',
    attempts: 1,
    daysAgo: 8,
  },
  {
    batchId: LIVE.id,
    position: 1,
    userId: FIXTURE_USERS.B.id,
    reason: 'accepted',
    attempts: 2,
    daysAgo: 2,
  },
  {
    batchId: LIVE.id,
    position: 5,
    userId: FIXTURE_USERS.C.id,
    reason: 'accepted',
    attempts: 12,
    daysAgo: 0.02,
  },
];

/**
 * Writes the batches, their accepted cards and the refused opens, each only when missing: a card is keyed on its batch and
 * position, an attempt on its card, account and reason. Assumes the actor is published and the fixture users exist.
 */
export async function seedInvitationCards(tx: SeedTransaction): Promise<void> {
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * DAY);

  const signUpOf = new Map(CARD_SIGN_UPS.map((s) => [`${s.batchId}|${s.position}`, s]));
  const cards = CARD_BATCHES.flatMap((batch) =>
    Array.from({ length: batch.sheets * CARDS_PER_SHEET }, (_, index) => {
      const position = index + 1;
      const signUp = signUpOf.get(`${batch.id}|${position}`);
      return { batch, position, signUp };
    }),
  );

  await insertMissingBy(
    tx,
    invitations,
    cards.map(({ batch, position, signUp }) => ({
      batchId: batch.id,
      position,
      signUp,
      state: batch.state,
      expiresAt: new Date(now + batch.expiresInDays * DAY),
    })),
    {
      columns: ['batchId', 'position'],
      where: inArray(
        invitations.batchId,
        CARD_BATCHES.map((batch) => batch.id),
      ),
      toRow: ({ batchId, position, signUp, state, expiresAt }) => ({
        kind: 'card',
        batchId,
        position,
        tokenHash: sha256Hex(newCardToken()),
        expiresAt,
        revokedAt: state === 'revoked' ? ago(3) : null,
        acceptedBy: signUp?.userId ?? null,
        acceptedAt: signUp ? ago(signUp.daysAgo) : null,
      }),
    },
  );

  const seeded = await tx
    .select({ id: invitations.id, batchId: invitations.batchId, position: invitations.position })
    .from(invitations)
    .where(
      and(
        eq(invitations.kind, 'card'),
        inArray(
          invitations.batchId,
          CARD_BATCHES.map((batch) => batch.id),
        ),
      ),
    );
  const cardId = new Map(seeded.map((card) => [`${card.batchId}|${card.position}`, card.id]));

  const wanted = CARD_REFUSALS.map((refusal) => {
    const invitationId = cardId.get(`${refusal.batchId}|${refusal.position}`);
    if (!invitationId) throw new Error(`No seeded card at position ${refusal.position}.`);
    return { ...refusal, invitationId };
  });
  const people = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(
        users.id,
        wanted.map((w) => w.userId),
      ),
    );
  if (people.length < new Set(wanted.map((w) => w.userId)).size) {
    throw new Error('The card seed needs the standard fixture users.');
  }

  await insertMissingBy(tx, cardInvitationAttempts, wanted, {
    columns: ['invitationId', 'userId', 'reason'],
    where: inArray(
      cardInvitationAttempts.invitationId,
      wanted.map((w) => w.invitationId),
    ),
    toRow: ({ invitationId, userId, reason, attempts, daysAgo }) => ({
      invitationId,
      userId,
      reason,
      attempts,
      lastAttemptedAt: ago(daysAgo),
    }),
  });
}

// The repository's `hashToken` (hex SHA-256) is not exported from its index, and the seed may not import past the index.
const sha256Hex = (token: string) => createHash('sha256').update(token).digest('hex');
