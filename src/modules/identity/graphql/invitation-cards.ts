import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import type { CardRow } from '../../../db/repository';
import {
  cardArrivalsCsv,
  cardState,
  listCardArrivals,
  listCardBatches,
  mintInvitationCards,
  revokeInvitationCardBatch,
} from '../services/invitation-cards';
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

export interface CardBatch {
  batchId: string;
  mintedAt: Date;
  expiresAt: Date;
}

const CardBatchRef = builder.objectRef<CardBatch>('InvitationCardBatch').implement({
  description: 'The cards minted together: one sheet count, one expiry. Counts are summed in SQL.',
  fields: (t) => ({
    batchId: t.exposeID('batchId'),
    mintedAt: t.expose('mintedAt', { type: 'DateTime' }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
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
    description: 'The batches of cards, newest first. Site admins only.',
    authScopes: { admin: true },
    resolve: async (_root, _args, page, context) =>
      (await listCardBatches(sessionOf(context), page)).map((entry) => ({
        ...entry,
        node: {
          batchId: entry.node.batchId,
          mintedAt: entry.node.createdAt,
          expiresAt: entry.node.expiresAt,
        },
      })),
  }),
);

builder.queryField('cardArrivals', (t) =>
  t.pagedConnection({
    type: InvitationCardRef,
    description:
      'The accepted cards, newest first: each with the account that arrived by it. Site admins only.',
    authScopes: { admin: true },
    resolve: (_root, _args, page, context) => listCardArrivals(sessionOf(context), page),
  }),
);

builder.queryField('cardArrivalsCsv', (t) =>
  t.string({
    description:
      'Every arrival as CSV text: account name, email, accepted date and batch. Site admins only.',
    authScopes: { admin: true },
    resolve: (_root, _args, context) => cardArrivalsCsv(sessionOf(context)),
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
    },
    authScopes: { admin: true },
    resolve: (_root, { sheets, expiresAt }, context) =>
      mintInvitationCards(sessionOf(context), sheets, expiresAt),
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
