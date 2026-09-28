// The one runtime import of `dataloader` (enforced by lint and pinned by
// tests/guards/lint-loader-boundary.test.ts): a loader's cache lives as long
// as its instance, so one built at module level would serve one request's
// answers to the next. This file hands out factories instead, and only the
// request context calls them.
// oxlint-disable-next-line no-restricted-imports
import DataLoader from 'dataloader';
import type { Session } from '../../lib/session';

export type LoaderFactory<K, V, C = K> = (session: Session | null) => DataLoader<K, V, C>;

/**
 * A loader, as the factory that builds it for one request. `batch` receives
 * the request's session first, because the service it calls does too — a
 * loader batches a service call and never bypasses one.
 *
 * ```ts
 * export const membershipsByUser = defineLoader<string, MembershipWithWorkspace[]>(
 *   async (session, userIds) =>
 *     session ? membershipsOf(session, userIds) : userIds.map(() => new Forbidden()),
 * );
 * ```
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
