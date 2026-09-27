// The one runtime import of `dataloader` (enforced by lint and pinned by
// tests/guards/lint-loader-boundary.test.ts): a loader's cache lives as long
// as its instance, so one built at module level would serve one request's
// answers to the next. This file hands out factories instead, and only the
// request context calls them.
// oxlint-disable-next-line no-restricted-imports
import DataLoader from 'dataloader';
import type { Session } from '../../lib/session';

export type LoaderFactory<K, V> = (session: Session | null) => DataLoader<K, V>;

/**
 * A loader, as the factory that builds it for one request. `batch` receives
 * the request's session first, because the service it calls does too — a
 * loader batches a service call and never bypasses one.
 *
 * ```ts
 * export const categoriesByIngredient = defineLoader((session, ids: readonly string[]) =>
 *   categoryService.forIngredients(session, ids),
 * );
 * ```
 */
export function defineLoader<K, V>(
  batch: (session: Session | null, keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
  options?: DataLoader.Options<K, V>,
): LoaderFactory<K, V> {
  return (session) => new DataLoader<K, V>((keys) => batch(session, keys), options);
}
