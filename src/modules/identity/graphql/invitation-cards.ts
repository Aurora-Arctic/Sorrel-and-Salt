import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { sessionOf } from '../../../graphql/context-helpers';
import type { CardRow } from '../../../db/repository';
import {
  cardArrivalsCsv,
  cardState,
  listCardArrivals,
  listInvitationCards,
  mintInvitationCards,
  revokeInvitationCard,
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

builder.queryField('invitationCards', (t) =>
  t.pagedConnection({
    type: InvitationCardRef,
    description: 'Every card in any state, newest first, optionally one batch. Site admins only.',
    args: { batchId: t.arg.id({ required: false }) },
    authScopes: { admin: true },
    resolve: (_root, { batchId }, page, context) =>
      listInvitationCards(sessionOf(context), batchId ?? undefined, page),
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
      'Mints `count` cards sharing one batch and one expiry, and answers each token once. Site admins only; a batch holds at most 500.',
    args: {
      count: t.arg.int({ required: true }),
      expiresAt: t.arg({ type: 'DateTime', required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { count, expiresAt }, context) =>
      mintInvitationCards(sessionOf(context), count, expiresAt),
  }),
);

builder.mutationField('revokeInvitationCard', (t) =>
  t.field({
    type: InvitationCardRef,
    description: 'Withdraws one pending card. Site admins only.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id }, context) => revokeInvitationCard(sessionOf(context), id),
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
