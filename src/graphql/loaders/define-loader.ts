// The one runtime import of `dataloader`: a loader's cache lives as long as its instance, so module-level
// loaders would leak across requests (claude-docs/graphql/loaders.md, "Loaders: one set per request, never at
// module level").
// oxlint-disable-next-line no-restricted-imports
import DataLoader from 'dataloader';
import { Forbidden } from '../../lib/errors';
import type { Session } from '../../lib/session';
import type { LoaderFactory } from './types';

/** `C` is the cache key for an object-keyed loader. */
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
