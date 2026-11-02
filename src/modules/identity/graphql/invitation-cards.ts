import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { MAX_NOTE_LENGTH } from '../../../lib/invitation-cards/limits';
import { definedArgs, sessionOf } from '../../../graphql/context-helpers';
import type { CardAttemptRow, CardBatchStatus, CardRow } from '../../../db/repository';
import {
  cardState,
  listCardAttempts,
  listCardArrivals,
  listCardBatches,
  mintInvitationCards,
  revokeInvitationCardBatch,
} from '../services/invitation-cards';
import { recordCardAttempt } from '../services/invitation-acceptance';
import type { CardState, MintedCards } from '../types';
import { UserRef } from './user';

// The invitation cards an admin mints. A card answers its state and who arrived by it, never its token or a link: the
// token is returned once, by the mint mutation, and the row holds its hash (claude-docs/auth/admin-bootstrap.md, "Invitation cards").

const CARD_STATES = [
  'pending',
  'accepted',
  'expired',
  'revoked',
] as const satisfies readonly CardState[];

const CardStateEnum = builder.enumType('InvitationCardState', {
  description:
    'Where a card stands now: an accepted card stays accepted whatever became of its date.',
  values: CARD_STATES,
});

export const InvitationCardRef = builder.objectRef<CardRow>('InvitationCard').implement({
  description:
    'An invitation card bound to no address, coven or role. Its token is never answered.',
  fields: (t) => ({
    id: t.exposeID('id'),
    batchId: t.exposeID('batchId', {
      description: 'The mint that made it, shared by the whole batch.',
    }),
    state: t.field({ type: CardStateEnum, resolve: (row) => cardState(row) }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    acceptedAt: t.expose('acceptedAt', { type: 'DateTime', nullable: true }),
    revokedAt: t.expose('revokedAt', { type: 'DateTime', nullable: true }),
    account: t.field({
      type: UserRef,
      nullable: true,
      description:
        'The account that accepted it; null while it is unaccepted or the account is gone.',
      resolve: (row, _args, { loaders }) =>
        row.acceptedBy ? loaders.usersByIdForAdmin.load(row.acceptedBy) : null,
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

const ATTEMPT_REASONS = ['revoked', 'expired', 'accepted'] as const;

const AttemptReasonEnum = builder.enumType('InvitationCardAttemptReason', {
  description: 'Why a card link was refused: withdrawn, past its date, or used by another account.',
  values: ATTEMPT_REASONS,
});

const CardAttemptRef = builder.objectRef<CardAttemptRow>('InvitationCardAttempt').implement({
  description: "One account's refused opens of one card for one reason.",
  fields: (t) => ({
    id: t.exposeID('id'),
    reason: t.field({ type: AttemptReasonEnum, resolve: (row) => row.reason }),
    attempts: t.exposeInt('attempts', {
      description: 'How many times this account was refused for this reason.',
    }),
    firstAttemptedAt: t.expose('createdAt', { type: 'DateTime' }),
    lastAttemptedAt: t.expose('lastAttemptedAt', { type: 'DateTime' }),
    cardPosition: t.int({
      nullable: true,
      description:
        "The card's place in its batch from 1, in the order the print PDF lays the fronts out; null for a card minted before places were kept.",
      resolve: (row, _args, { loaders }) => loaders.cardPositionById.load(row.invitationId),
    }),
    account: t.field({
      type: UserRef,
      nullable: true,
      description: 'The account that opened the link; null if it is gone.',
      resolve: (row, _args, { loaders }) => loaders.usersByIdForAdmin.load(row.userId),
    }),
  }),
});

const MintedCardsRef = builder.objectRef<MintedCards>('MintedInvitationCards').implement({
  description:
    'A batch just minted. The tokens are answered this once, to the admin who minted it, and are stored nowhere.',
  fields: (t) => ({
    batchId: t.exposeID('batchId'),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    tokens: t.exposeStringList('tokens', {
      description: 'One token per card, in no order that matters.',
    }),
  }),
});

const CardBatchStatusEnum = builder.enumType('InvitationCardBatchStatus', {
  description:
    'Where a batch stands: live while a card can still be accepted; else used up, expired or revoked.',
  values: {
    live: { value: 'live' },
    revoked: { value: 'revoked' },
    expired: { value: 'expired' },
    usedUp: { value: 'used-up' },
  } satisfies Record<string, { value: CardBatchStatus }>,
});

export interface CardBatch {
  batchId: string;
  mintedAt: Date;
  expiresAt: Date;
  note: string | null;
}

const CardBatchRef = builder.objectRef<CardBatch>('InvitationCardBatch').implement({
  description: 'The cards minted together: one sheet count, one expiry. Counts are summed in SQL.',
  fields: (t) => ({
    batchId: t.exposeID('batchId'),
    mintedAt: t.expose('mintedAt', { type: 'DateTime' }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
    note: t.exposeString('note', {
      nullable: true,
      description: "The admin's note written when the batch was minted; null for none.",
    }),
    cards: t.int({
      description: 'How many cards the batch holds.',
      resolve: async (batch, _args, { loaders }) =>
        (await loaders.cardTotalsByBatch.load(batch.batchId)).cards,
    }),
    accepted: t.int({
      description: 'How many of its cards were accepted.',
      resolve: async (batch, _args, { loaders }) =>
        (await loaders.cardTotalsByBatch.load(batch.batchId)).accepted,
    }),
    refusedOpens: t.int({
      description:
        'How many times signed-in accounts opened a link of the batch and were refused, all cards, accounts and reasons added.',
      resolve: async (batch, _args, { loaders }) =>
        (await loaders.cardTotalsByBatch.load(batch.batchId)).attempts,
    }),
    pending: t.int({
      description: 'How many of its cards can still be accepted: not accepted, revoked or expired.',
      resolve: async (batch, _args, { loaders }) =>
        (await loaders.cardTotalsByBatch.load(batch.batchId)).pending,
    }),
  }),
});

builder.queryField('invitationCardBatches', (t) =>
  t.pagedConnection({
    type: CardBatchRef,
    description:
      'The batches of cards, newest first, narrowed by every filter given. Site admins only.',
    args: {
      batch: t.arg.string({
        required: false,
        description:
          'The start of the batch number, or text anywhere in its note, case-insensitively.',
      }),
      status: t.arg({ type: CardBatchStatusEnum, required: false }),
      mintedFrom: t.arg({
        type: 'LocalDate',
        required: false,
        description: 'First day minted, in UTC.',
      }),
      mintedTo: t.arg({
        type: 'LocalDate',
        required: false,
        description: 'Last day minted, in UTC.',
      }),
      expiresFrom: t.arg({
        type: 'LocalDate',
        required: false,
        description: 'First day of expiry, in UTC.',
      }),
      expiresTo: t.arg({
        type: 'LocalDate',
        required: false,
        description: 'Last day of expiry, in UTC.',
      }),
    },
    authScopes: { admin: true },
    resolve: async (
      _root,
      { batch, status, mintedFrom, mintedTo, expiresFrom, expiresTo },
      page,
      context,
    ) =>
      (
        await listCardBatches(
          sessionOf(context),
          definedArgs({ batch, status, mintedFrom, mintedTo, expiresFrom, expiresTo }),
          page,
        )
      ).map((entry) => ({
        ...entry,
        node: {
          batchId: entry.node.batchId,
          mintedAt: entry.node.createdAt,
          expiresAt: entry.node.expiresAt,
          note: entry.node.note,
        },
      })),
  }),
);

builder.queryField('cardArrivals', (t) =>
  t.pagedConnection({
    type: InvitationCardRef,
    description:
      'The accepted cards, newest first: each with the account that arrived by it, narrowed by every filter given. Site admins only.',
    args: {
      query: t.arg.string({
        required: false,
        description:
          "Part of the account's name or email, or the start of the batch number, case-insensitively.",
      }),
    },
    authScopes: { admin: true },
    resolve: (_root, { query }, page, context) =>
      listCardArrivals(sessionOf(context), definedArgs({ query }), page),
  }),
);

builder.queryField('invitationCardAttempts', (t) =>
  t.pagedConnection({
    type: CardAttemptRef,
    description: "A batch's refused opens, latest first. Site admins only.",
    args: { batchId: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { batchId }, page, context) =>
      listCardAttempts(sessionOf(context), batchId, page),
  }),
);

builder.mutationField('createInvitationCards', (t) =>
  t.field({
    type: MintedCardsRef,
    description:
      'Mints `sheets` sheets of nine cards sharing one batch and one expiry, and answers each token once. Site admins only; a batch is at most 55 sheets.',
    args: {
      sheets: t.arg.int({ required: true }),
      expiresAt: t.arg({ type: 'DateTime', required: true }),
      note: t.arg.string({
        required: false,
        description: `Plain text for the admins to track the batch by, at most ${MAX_NOTE_LENGTH} characters; blank is none.`,
      }),
    },
    authScopes: { admin: true },
    resolve: (_root, { sheets, expiresAt, note }, context) =>
      mintInvitationCards(sessionOf(context), sheets, expiresAt, note),
  }),
);

builder.mutationField('revokeInvitationCardBatch', (t) =>
  t.field({
    type: [InvitationCardRef],
    description:
      'Withdraws every pending card of a batch, answering the cards it withdrew. Site admins only.',
    args: { batchId: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { batchId }, context) =>
      revokeInvitationCardBatch(sessionOf(context), batchId),
  }),
);

builder.mutationField('recordCardAttempt', (t) =>
  t.boolean({
    description:
      "Notes that the signed-in account opened this card link and was refused. Takes the token alone: the account is the session's and the reason is worked out here. Answers true whether or not anything was recorded.",
    args: { token: t.arg.string({ required: true }) },
    authScopes: { signedIn: true },
    resolve: async (_root, { token }, context) => {
      await recordCardAttempt(sessionOf(context), token);
      return true;
    },
  }),
);
