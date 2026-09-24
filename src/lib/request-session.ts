import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './auth';
import type { Session, UserRole } from './session';
import { RETURN_PATH_HEADER, signInPath } from './sign-in';

// Where the request becomes a service-level `Session`: server components and
// the GraphQL context call this, then hand the result to a service. A service
// never calls it — the import is banned there (claude-docs/auth.md, "Route
// protection").

const USER_ROLES: readonly UserRole[] = ['user', 'admin'];

function toUserRole(role: unknown): UserRole {
  if (USER_ROLES.includes(role as UserRole)) return role as UserRole;
  // Better Auth types the additional field as a plain string. Reading an
  // unknown value as 'user' would hide whatever wrote it.
  throw new Error(`Unrecognised user role: ${String(role)}`);
}

/**
 * The signed-in user, or `null`. Asks the database through Better Auth, so an
 * expired, revoked or forged cookie is `null` here even though the proxy let
 * it through. Cached per request: a layout and a page asking both cost one query.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  return { userId: result.user.id, role: toUserRole(result.user.role) };
});

/**
 * The signed-in user, or a redirect to `/sign-in` carrying the page's own path
 * back as `?next=`. The call every protected page makes before it reads anything.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (session) return session;

  const returnPath = (await headers()).get(RETURN_PATH_HEADER) ?? undefined;
  redirect(signInPath(returnPath));
}
