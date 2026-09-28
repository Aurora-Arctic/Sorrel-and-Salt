import { membershipsByUser } from '@/modules/coven';
import { categoriesByIngredient, folkNamesByIngredient } from '@/modules/ingredients';
import type { Session } from '../../lib/session';
import type { LoaderFactory } from './define-loader';

// Every loader the context builds, by the name a resolver reads it as. Each
// is added by the task that adds its schema, off its module's index
// (claude-docs/graphql.md, "Loaders").
const LOADERS = {
  membershipsByUser,
  categoriesByIngredient,
  folkNamesByIngredient,
} satisfies Record<string, LoaderFactory<never, unknown>>;

type Built<F extends Record<string, LoaderFactory<never, unknown>>> = {
  [Name in keyof F]: ReturnType<F[Name]>;
};

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
