import { memberEmailsByMember, membershipsByUser } from '@/modules/coven';
import {
  assignedCategoriesBySpell,
  derivedCategoriesBySpell,
  stepsBySpell,
  workingCountBySpell,
} from '@/modules/grimoire';
import {
  cardPositionById,
  cardTotalsByBatch,
  providersByUser,
  usersById,
  usersByIdForAdmin,
} from '@/modules/identity';
import {
  categoriesByIngredient,
  categoriesByVariant,
  cupboardEntryByIngredient,
  deitiesByIngredient,
  folkNamesByIngredient,
  ingredientsById,
  referencesByIngredient,
  referencesByVariant,
  stockByIngredient,
  substitutesByIngredient,
  substitutesByVariant,
  variantsByIngredient,
} from '@/modules/ingredients';
import { helpChildrenByParent } from '@/modules/help';
import {
  repliesByRequest,
  tierBySender,
  timeoutsByAddress,
  timeoutsBySender,
  usersOnRequests,
} from '@/modules/support';
import {
  categoryGroupsById,
  deityTraditionsById,
  ingredientFormGroupsById,
  ingredientFormsById,
  otherNamesByDeity,
} from '@/modules/vocabulary';
import type { Session } from '../../lib/session';
import type { Built, LoaderFactory } from './types';

// Built per request, never at module level (claude-docs/graphql/loaders.md, "Loaders: one set per request, never at module level").
const LOADERS = {
  memberEmailsByMember,
  membershipsByUser,
  providersByUser,
  usersById,
  usersByIdForAdmin,
  repliesByRequest,
  tierBySender,
  timeoutsByAddress,
  timeoutsBySender,
  usersOnRequests,
  cardPositionById,
  cardTotalsByBatch,
  categoriesByIngredient,
  folkNamesByIngredient,
  ingredientsById,
  substitutesByIngredient,
  deitiesByIngredient,
  referencesByIngredient,
  variantsByIngredient,
  categoriesByVariant,
  substitutesByVariant,
  referencesByVariant,
  stockByIngredient,
  cupboardEntryByIngredient,
  categoryGroupsById,
  ingredientFormGroupsById,
  ingredientFormsById,
  deityTraditionsById,
  otherNamesByDeity,
  stepsBySpell,
  workingCountBySpell,
  assignedCategoriesBySpell,
  derivedCategoriesBySpell,
  helpChildrenByParent,
} satisfies Record<string, LoaderFactory<never, unknown>>;

export type Loaders = Built<typeof LOADERS>;

export function buildLoaders<F extends Record<string, LoaderFactory<never, unknown>>>(
  factories: F,
  session: Session | null,
): Built<F> {
  return Object.fromEntries(
    Object.entries(factories).map(([name, factory]) => [name, factory(session)]),
  ) as Built<F>;
}

/** The request's loaders: a fresh set every call, never shared. */
export function createLoaders(session: Session | null): Loaders {
  return buildLoaders(LOADERS, session);
}
