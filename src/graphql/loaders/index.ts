import { memberEmailsByMember, membershipsByUser } from '@/modules/coven';
import {
  assignedCategoriesBySpell,
  derivedCategoriesBySpell,
  stepsBySpell,
  workingCountBySpell,
} from '@/modules/grimoire';
import {
  cardAttemptTotals,
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
import {
  categoryGroupsById,
  deityTraditionsById,
  ingredientFormGroupsById,
  ingredientFormsById,
  otherNamesByDeity,
} from '@/modules/vocabulary';
import type { Session } from '../../lib/session';
import type { Built, LoaderFactory } from './types';

// Every loader the context builds, by the name a resolver reads it as. Each
// is added by the task that adds its schema, off its module's index
// (claude-docs/graphql/loaders.md, "Loaders").
const LOADERS = {
  memberEmailsByMember,
  membershipsByUser,
  providersByUser,
  usersById,
  usersByIdForAdmin,
  cardAttemptTotals,
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
} satisfies Record<string, LoaderFactory<never, unknown>>;

export type Loaders = Built<typeof LOADERS>;

/** One request's instances of `factories`. */
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
