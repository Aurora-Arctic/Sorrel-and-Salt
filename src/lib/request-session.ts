import { headers } from 'next/headers';
import { forbidden, notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { type CovenMembership, membershipBySlug } from '@/modules/coven';
import {
  assertCurator,
  assertSiteAdmin,
  hasAgreedToTerms,
  standingAccessPause,
} from '@/modules/identity';
import { auth } from './auth';
import { ACCESS_PAUSED_PATH, covenPausedPath, isPausedViewPage } from './access-paused';
import { AccessPaused, Forbidden } from './errors';
import type { Session, SessionState } from './session';
import { isTermsPage, termsPagePath } from './account-terms';
import { emailPagePath, isEmailPage } from './account-email';
import { RETURN_PATH_HEADER, safeReturnPath, signInPath } from './sign-in';
import { isRosterProvider } from './social-providers';
import { toUserRole } from './session-role';
import { isFreshSession } from './session-fresh';
import type { AccountPasskey, LinkedAccount } from './types';

// Where the request becomes a service-level `Session`: server components and
// the GraphQL context call this, then hand the result to a service. A service
// never calls it — the import is banned there (claude-docs/auth/route-protection.md, "Route
// protection").

/**
 * Whether Better Auth would still call a session created at `createdAt` fresh (the `/unlink-account` check), so the account
 * page can withhold Remove rather than offer a refused press. The window is Better Auth's resolved `freshAge` (pinned in
 * tests/lib/auth.test.ts); 0 turns the check off, as there.
 */
async function isFresh(createdAt: Date | string): Promise<boolean> {
  return isFreshSession(createdAt, (await auth.$context).sessionConfig.freshAge);
}

/**
 * The pause standing on a session's user, which is the one check of a paused session: every page but support's sends it to
 * the paused page, and every API call but support's refuses it. Asked of every session, an impersonation's included, since
 * a paused account still signs in.
 */
async function accessPauseOf(userId: string): Promise<SessionState['accessPause']> {
  const pause = await standingAccessPause(userId);
  return pause && { until: pause.until };
}

/**
 * Everything Better Auth knows of the request's session, the standing pause included, read from the headers given. For
 * the GraphQL context, which has no `headers()`; a page reads it through the guards below.
 */
export async function sessionStateFromHeaders(requestHeaders: Headers): Promise<SessionState> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result)
    return { session: null, emailVerified: false, termsAgreed: false, sessionFresh: false };
  // Present only while the `admin` plugin is registered and this session is
  // an impersonation; the type holds the plugin in either way.
  const { impersonatedBy } = result.session as { impersonatedBy?: string | null };
  const accessPause = await accessPauseOf(result.user.id);
  return {
    session: {
      userId: result.user.id,
      role: toUserRole(result.user.role),
      ...(result.user.emailVerified !== true && { emailUnverified: true as const }),
      ...(impersonatedBy && { impersonatedBy }),
    },
    emailVerified: result.user.emailVerified === true,
    termsAgreed: hasAgreedToTerms(
      Reflect.get(result.user, 'termsVersion') as string | null | undefined,
    ),
    sessionFresh: await isFresh(result.session.createdAt),
    ...(accessPause && { accessPause }),
  };
}

/** The session a public page or the proxy acts as: none while a pause stands, so a paused session reads as signed out. */
function actingSession({ session, accessPause }: SessionState): Session | null {
  return accessPause ? null : session;
}

/**
 * The signed-in user for these request headers, or `null`. Asks the database through Better Auth, so an expired, revoked or
 * forged cookie is `null` though the proxy's cookie check passed it. For the proxy, which has no `headers()`; a page calls `getSession()`.
 */
export async function sessionFromHeaders(requestHeaders: Headers): Promise<Session | null> {
  return actingSession(await sessionStateFromHeaders(requestHeaders));
}

// Cached per request: a layout and a page asking both cost one query.
const getSessionState = cache(async (): Promise<SessionState> =>
  sessionStateFromHeaders(await headers()),
);

/** The signed-in user, or `null`, as a paused session is too on every page but support's. */
export async function getSession(): Promise<Session | null> {
  const state = await getSessionState();
  if (state.accessPause && isPausedViewPage((await forwardedReturnPath()) ?? '')) {
    return state.session;
  }
  return actingSession(state);
}

/**
 * The signed-in user with the pause standing on them, or `null` signed out: for the shell, which a paused account is drawn
 * on every page it reaches, with the notice that it is paused, while the page itself reads it as `getSession()` does.
 */
export async function getShellSession(): Promise<{
  session: Session;
  accessPause?: { until: Date | null };
} | null> {
  const { session, accessPause } = await getSessionState();
  if (!session) return null;
  return accessPause ? { session, accessPause } : { session };
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
 * The signed-in user or a redirect to `/sign-in` carrying the page's path as `?next=`, or to the paused page while a pause
 * stands on the session's user, from every page but support's: `requireSession()` without its email
 * check, for the shell layout only. The shell is drawn round the email page, and a layout throwing the email redirect there
 * loops the router (claude-docs/auth/route-protection.md, "Where the email redirect is thrown").
 */
export async function requireSignedIn(): Promise<Session> {
  const { session, accessPause } = await getSessionState();
  const returnPath = await forwardedReturnPath();
  if (accessPause && !isPausedViewPage(returnPath ?? '')) {
    redirect(ACCESS_PAUSED_PATH);
  }
  if (!session) redirect(signInPath(returnPath));
  return session;
}

/**
 * The signed-in user, or a redirect to `/sign-in` with the page's path as `?next=`, or to the email page while the address is
 * unverified (a provisional account can do nothing else), or to the acceptance page until it has agreed to the current terms. Every protected page calls it before reading anything
 * (claude-docs/auth/admin-bootstrap.md, "The email page").
 */
export async function requireSession(): Promise<Session> {
  const session = await requireSignedIn();
  const { emailVerified, termsAgreed, accessPause } = await getSessionState();
  const returnPath = await forwardedReturnPath();
  if (!emailVerified && !isEmailPage(returnPath)) {
    redirect(emailPagePath(safeReturnPath(returnPath)));
  }
  // After the address check, so an unverified account proves its address first and agrees second; the acceptance page is exempt
  // from this check as the email page is from the one above. A paused account, which reaches only the support pages here, is
  // not sent: it cannot agree while paused, as the API refuses the agreement, so the acceptance page would send it back.
  if (!termsAgreed && !accessPause && !isTermsPage(returnPath) && !isEmailPage(returnPath)) {
    redirect(termsPagePath(safeReturnPath(returnPath)));
  }
  return session;
}

/**
 * `requireSession()` then the site-role check: a signed-in non-admin gets Next's forbidden page (403), not a redirect or 404,
 * as `/admin` is a known path (claude-docs/auth/admin-guard.md, "The admin guard"). The layout and every page call it,
 * since a layout does not re-run on client-side navigation.
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
 * `requireSession()` then the curation check: a curator or an admin passes, anyone else gets the forbidden page. The people
 * pages call `requireAdminSession()`, which a curator fails (claude-docs/auth/admin-guard.md, "The curator guard").
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
 * `requireSession()`, then the workspace the `/coven/[slug]` address names and the proof the user is a member. A refusal is
 * Next's 404, not 403: an unknown slug and a coven the user is not in must look the same (claude-docs/auth/coven-guard.md,
 * "The coven guard"). A member whose access to the coven is paused holds a seat, so is sent to the coven's paused page
 * instead. The layout and every page beneath it call it.
 */
export async function requireCovenMembership(slug: string): Promise<CovenMembership> {
  try {
    return await covenOf(slug);
  } catch (error) {
    // First, since AccessPaused is a Forbidden too.
    if (error instanceof AccessPaused) redirect(covenPausedPath(slug));
    if (error instanceof Forbidden) notFound();
    throw error;
  }
}

/** Every account row Better Auth holds for the signed-in user, provider and password alike. */
const userAccounts = cache(async () => auth.api.listUserAccounts({ headers: await headers() }));

/**
 * The signed-in user's provider accounts, asked of Better Auth, whose table
 * they are. For the account page, after `requireSession()`; Better Auth
 * refuses a request with no session.
 */
export const linkedAccounts = cache(async (): Promise<LinkedAccount[]> => {
  const accounts = await userAccounts();
  return accounts.flatMap(({ id, providerId }) =>
    isRosterProvider(providerId) ? [{ id, providerId }] : [],
  );
});

/** Whether the signed-in account has a password, which the account page then changes rather than sets. */
export const hasPassword = cache(async (): Promise<boolean> => {
  const accounts = await userAccounts();
  return accounts.some(({ providerId }) => providerId === 'credential');
});

/**
 * The signed-in user's passkeys, asked of the passkey plugin, whose table they are, and cut to what the account page
 * shows. For the account page, after `requireSession()`.
 */
export const accountPasskeys = cache(async (): Promise<AccountPasskey[]> => {
  const passkeys = await auth.api.listPasskeys({ headers: await headers() });
  return passkeys.map(({ id, name, createdAt }) => ({
    id,
    name: name ?? null,
    createdAt: new Date(createdAt).toISOString(),
  }));
});
