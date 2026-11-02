import type { Route } from 'next';

// The site access pause as sign-in sees it: the refusal's code, which the sign-in panel turns into a visit to the paused
// page, and that page's address. Pure, so the server's session hook and the browser's panel share one spelling.

/** The code a sign-in refused for a standing pause answers with, beside the pause's end as `until`. */
export const ACCESS_PAUSED_CODE = 'ACCESS_PAUSED';

/** The refusal's sentence, for a client that reads the message rather than the code. */
export const ACCESS_PAUSED_MESSAGE = 'Access to this account is paused.';

/** The public page a paused sign-in lands on. */
export const ACCESS_PAUSED_PATH = '/access-paused' satisfies Route;

/** The paused page, carrying the pause's end as `?until=` when it has one; an open-ended pause carries nothing. */
export function accessPausedPath(until: Date | string | null | undefined): Route {
  const at = until == null ? undefined : new Date(until);
  if (!at || Number.isNaN(at.getTime())) return ACCESS_PAUSED_PATH;
  return `${ACCESS_PAUSED_PATH}?${new URLSearchParams({ until: at.toISOString() })}` as Route;
}

/** The end a paused page's `?until=` names, or `undefined` for none or a malformed one. */
export function pausedUntil(raw: string | string[] | undefined): Date | undefined {
  if (typeof raw !== 'string' || raw === '') return undefined;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/** Whether a sign-in's refusal is a standing pause: what the panel leaves for the paused page on. */
export function isAccessPaused(
  failure: unknown,
): failure is { code: typeof ACCESS_PAUSED_CODE; until?: string | null } {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    (failure as { code?: unknown }).code === ACCESS_PAUSED_CODE
  );
}

/**
 * Where a member whose access to one coven is paused is sent from that coven's pages. Outside `/coven/[slug]`, whose layout
 * refuses them, and keyed by the slug so the page reads the pause itself rather than trusting the address.
 */
export function covenPausedPath(slug: string): Route {
  return `/coven-paused/${encodeURIComponent(slug)}` as Route;
}

/** The coven slug a page's path sits under, `/coven/<slug>/…`, or `undefined` for a page outside every coven. */
export function covenSlugOf(pathname: string): string | undefined {
  const match = /^\/coven\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : undefined;
}
