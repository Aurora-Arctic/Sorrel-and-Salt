import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';
import { assertSiteAdmin } from '@/modules/identity';
import { auth } from './auth';
import { Forbidden } from './errors';
import type { Session, SessionState } from './session';
import { emailPagePath, isEmailPage } from './account-email';
import { RETURN_PATH_HEADER, safeReturnPath, signInPath } from './sign-in';
import { isRosterProvider } from './social-providers';
import { toUserRole } from './session-role';
import type { LinkedAccount } from './types';

// Where the request becomes a service-level `Session`: server components and
// the GraphQL context call this, then hand the result to a service. A service
// never calls it — the import is banned there (claude-docs/auth/route-protection.md, "Route
// protection").

async function stateFromHeaders(requestHeaders: Headers): Promise<SessionState> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result) return { session: null, emailVerified: false };
  // Present only while the `admin` plugin is registered and this session is
  // an impersonation (MB.53); the type holds the plugin in either way.
  const { impersonatedBy } = result.session as { impersonatedBy?: string | null };
  return {
    session: {
      userId: result.user.id,
      role: toUserRole(result.user.role),
      ...(impersonatedBy && { impersonatedBy }),
    },
    emailVerified: result.user.emailVerified === true,
  };
}

/**
 * The signed-in user for these request headers, or `null`. Asks the database
 * through Better Auth, so an expired, revoked or forged cookie is `null` here
 * even though the proxy's cookie check let it through. For the proxy, which
 * has the request but no `headers()`; a page calls `getSession()`.
 */
export async function sessionFromHeaders(requestHeaders: Headers): Promise<Session | null> {
  return (await stateFromHeaders(requestHeaders)).session;
}

// Cached per request: a layout and a page asking both cost one query.
const getSessionState = cache(async (): Promise<SessionState> => stateFromHeaders(await headers()));

/** The signed-in user, or `null`. */
export async function getSession(): Promise<Session | null> {
  return (await getSessionState()).session;
}

/**
 * The signed-in user, or a redirect: to `/sign-in` carrying the page's own
 * path back as `?next=` when there is none, and to the email page, carrying
 * the same, while the account's address is unverified — a provisional account
 * can do nothing else, so no other page shows it anything
 * (claude-docs/auth/admin-bootstrap.md, "The email page"). The call every protected page
 * makes before it reads anything; the email page is the one it lets through.
 */
export async function requireSession(): Promise<Session> {
  const { session, emailVerified } = await getSessionState();
  const returnPath = (await headers()).get(RETURN_PATH_HEADER) ?? undefined;
  if (!session) redirect(signInPath(returnPath));
  if (!emailVerified && !isEmailPage(returnPath)) {
    redirect(emailPagePath(safeReturnPath(returnPath)));
  }
  return session;
}

/**
 * `requireSession()`, then the site-role check: a signed-in non-admin gets
 * Next's forbidden page, with a 403, rather than a redirect or a 404 —
 * `/admin` is a path everyone already knows (claude-docs/auth/admin-guard.md, "The admin
 * guard"). The layout under `/admin` calls it, and so does every page there,
 * because a layout does not re-run on client-side navigation.
 */
export async function requireAdminSession(): Promise<Session> {
  const session = await requireSession();
  try {
    assertSiteAdmin(session);
  } catch (error) {
    if (error instanceof Forbidden) forbidden();
    throw error;
  }
  return session;
}

/**
 * The signed-in user's provider accounts, asked of Better Auth, whose table
 * they are. For the account page, after `requireSession()`; Better Auth
 * refuses a request with no session.
 */
export const linkedAccounts = cache(async (): Promise<LinkedAccount[]> => {
  const accounts = await auth.api.listUserAccounts({ headers: await headers() });
  return accounts.flatMap(({ id, providerId }) =>
    isRosterProvider(providerId) ? [{ id, providerId }] : [],
  );
});
