import { headers } from 'next/headers';
import { forbidden, notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { type CovenMembership, membershipBySlug } from '@/modules/coven';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';
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

/**
 * Whether Better Auth would still call a session created at `createdAt`
 * fresh: the check its `/unlink-account` makes, restated so the account page
 * can withhold Remove rather than offer a press that is refused. The window
 * is Better Auth's own resolved `freshAge` (a day by default, pinned in
 * tests/lib/auth.test.ts), not a copy of its default; 0 turns the check off,
 * as it does there.
 */
async function isFresh(createdAt: Date | string): Promise<boolean> {
  const { freshAge } = (await auth.$context).sessionConfig;
  if (freshAge === 0) return true;
  return Date.now() - new Date(createdAt).getTime() < freshAge * 1000;
}

async function stateFromHeaders(requestHeaders: Headers): Promise<SessionState> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result) return { session: null, emailVerified: false, sessionFresh: false };
  // Present only while the `admin` plugin is registered and this session is
  // an impersonation; the type holds the plugin in either way.
  const { impersonatedBy } = result.session as { impersonatedBy?: string | null };
  return {
    session: {
      userId: result.user.id,
      role: toUserRole(result.user.role),
      ...(impersonatedBy && { impersonatedBy }),
    },
    emailVerified: result.user.emailVerified === true,
    sessionFresh: await isFresh(result.session.createdAt),
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
 * Whether the signed-in account's address is verified; `false` with no session.
 * For the front page, which offers an unverified account the email page rather
 * than a page that would send it there. From the same per-request lookup.
 */
export async function sessionIsVerified(): Promise<boolean> {
  return (await getSessionState()).emailVerified;
}

/**
 * Whether this request's session is recent enough for Better Auth to remove a
 * sign-in method; `false` with no session. For the account page, after
 * `requireSession()`, from the same per-request lookup.
 */
export async function sessionIsFresh(): Promise<boolean> {
  return (await getSessionState()).sessionFresh;
}

/** The page's own path, which the proxy forwarded, since a page cannot read its URL. */
async function forwardedReturnPath(): Promise<string | undefined> {
  return (await headers()).get(RETURN_PATH_HEADER) ?? undefined;
}

/**
 * The signed-in user, or a redirect to `/sign-in` carrying the page's own path
 * back as `?next=`: `requireSession()` without its email check. For the shell
 * layout and what it draws, never a page. The shell is drawn round the email
 * page too, and a layout that throws the email redirect while the browser is
 * navigating into it leaves the router refetching that page without end
 * (claude-docs/auth/route-protection.md, "Where the email redirect is
 * thrown").
 */
export async function requireSignedIn(): Promise<Session> {
  const { session } = await getSessionState();
  if (!session) redirect(signInPath(await forwardedReturnPath()));
  return session;
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
  const session = await requireSignedIn();
  const { emailVerified } = await getSessionState();
  const returnPath = await forwardedReturnPath();
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
 * `requireSession()`, then the curation check: a curator or an admin
 * passes, and anyone else gets the forbidden page, as at
 * `requireAdminSession()`. The layout under `/admin` calls it, and so does every
 * curation page there; the people pages call `requireAdminSession()`, which a
 * curator fails (claude-docs/auth/admin-guard.md, "The curator guard").
 */
export async function requireCuratorSession(): Promise<Session> {
  const session = await requireSession();
  try {
    assertCurator(session);
  } catch (error) {
    if (error instanceof Forbidden) forbidden();
    throw error;
  }
  return session;
}

// One lookup per slug per request, however many layouts and pages ask.
const covenOf = cache(async (slug: string) => membershipBySlug(await requireSession(), slug));

/**
 * `requireSession()`, then the workspace the `/coven/[slug]` address names
 * and the proof the user is a member of it. A refusal is Next's 404,
 * not the 403 `/admin` answers: a slug is a guess at someone's private data,
 * so an unknown slug and a coven the user is not in must look the same
 * (claude-docs/auth/coven-guard.md, "The coven guard"). The layout calls it,
 * and so does every page beneath it, for the reason the admin pages do.
 */
export async function requireCovenMembership(slug: string): Promise<CovenMembership> {
  try {
    return await covenOf(slug);
  } catch (error) {
    if (error instanceof Forbidden) notFound();
    throw error;
  }
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
