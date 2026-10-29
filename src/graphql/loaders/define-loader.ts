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
 * A loader as the factory that builds it per request; `batch` gets the session first, as the service it calls does. `C` is the cache key for an object-keyed loader.
 * For a service taking `Session | null`; `defineSignedInLoader` and `definePublicLoader` cover the other two.
 */
export function defineLoader<K, V, C = K>(
  batch: (session: Session | null, keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
  options?: DataLoader.Options<K, V, C>,
): LoaderFactory<K, V, C> {
  return (session) => new DataLoader<K, V, C>((keys) => batch(session, keys), options);
}

/** A loader over a service that takes a `Session`: a signed-out request's loads each answer `Forbidden`. */
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
