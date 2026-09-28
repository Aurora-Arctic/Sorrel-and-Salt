import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './auth';
import type { Session, UserRole } from './session';
import { emailPagePath, isEmailPage } from './account-email';
import { RETURN_PATH_HEADER, safeReturnPath, signInPath } from './sign-in';
import { SOCIAL_PROVIDERS, type LinkedAccount, type ProviderId } from './social-providers';

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

// `emailVerified` stays off the service-level session: only `requireSession`
// reads it, to keep an unverified account on the email page.
interface SessionState {
  session: Session | null;
  emailVerified: boolean;
}

async function stateFromHeaders(requestHeaders: Headers): Promise<SessionState> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result) return { session: null, emailVerified: false };
  return {
    session: { userId: result.user.id, role: toUserRole(result.user.role) },
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
 * (claude-docs/auth.md, "The email page"). The call every protected page
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

function isRosterProvider(providerId: string): providerId is ProviderId {
  return SOCIAL_PROVIDERS.some((provider) => provider.id === providerId);
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
