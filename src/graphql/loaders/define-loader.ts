// The one runtime import of `dataloader` (enforced by lint and pinned by
// tests/guards/lint-loader-boundary.test.ts): a loader's cache lives as long
// as its instance, so one built at module level would serve one request's
// answers to the next. This file hands out factories instead, and only the
// request context calls them.
// oxlint-disable-next-line no-restricted-imports
import DataLoader from 'dataloader';
import { Forbidden } from '../../lib/errors';
import type { Session } from '../../lib/session';
import type { LoaderFactory } from './types';

/**
 * A loader, as the factory that builds it for one request. `batch` receives
 * the request's session first, because the service it calls does too — a
 * loader batches a service call and never bypasses one.
 *
 * ```ts
 * export const categoriesByIngredient = defineLoader<IngredientKey, CategoryRow[], string>(
 *   categoriesOf,
 *   { cacheKeyFn: (ref) => ref.id },
 * );
 * ```
 *
 * This form is for a service taking `Session | null`, as the ingredient
 * children do; one taking a `Session` goes through `defineSignedInLoader`,
 * and one taking none through `definePublicLoader`.
 *
 * `C` is the cache key, for a loader keyed by an object: `cacheKeyFn` maps
 * each key to it, and two keys with the same one load once.
 */
export function defineLoader<K, V, C = K>(
  batch: (session: Session | null, keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
  options?: DataLoader.Options<K, V, C>,
): LoaderFactory<K, V, C> {
  return (session) => new DataLoader<K, V, C>((keys) => batch(session, keys), options);
}

/**
 * A loader over a service that takes a `Session`, not a null one: a
 * signed-out request's loads each answer `Forbidden`, the refusal the service
 * would give, and the service is never called without a caller.
 */
export function defineSignedInLoader<K, V, C = K>(
  batch: (session: Session, keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
  options?: DataLoader.Options<K, V, C>,
): LoaderFactory<K, V, C> {
  return defineLoader<K, V, C>(
    async (session, keys) => (session ? batch(session, keys) : keys.map(() => new Forbidden())),
    options,
  );
}

/**
 * A loader over public reference data, whose service takes no session: the
 * request's is taken and ignored, and anyone, signed in or not, is answered.
 */
export function definePublicLoader<K, V, C = K>(
  batch: (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
  options?: DataLoader.Options<K, V, C>,
): LoaderFactory<K, V, C> {
  return defineLoader<K, V, C>((_session, keys) => batch(keys), options);
}
