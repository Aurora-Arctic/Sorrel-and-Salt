import { randomBytes } from 'node:crypto';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import type { AuthContext } from '@better-auth/core';
import {
  isAPIError,
  APIError,
  createAuthMiddleware,
  getOAuthState,
  getSessionFromCtx,
} from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import {
  defineRequestState,
  getCurrentAuthEndpointContext,
  hasRequestState,
} from '@better-auth/core/context';
import { BASE_ERROR_CODES } from '@better-auth/core/error';
import { appendQueryParams } from '@better-auth/core/utils/url';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db/client-imports.md, "Who may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { workspaceMembers } from '../modules/coven/schema/workspaces';
import { users } from '../modules/identity/schema/users';
import { findDemoWorkspace } from '../db/repository';
import {
  sessions,
  accounts,
  verifications,
  rateLimits,
  passkeys,
} from '../modules/identity/schema/auth';
import { SOCIAL_PROVIDERS, isRosterProvider } from './social-providers';
// Server-only — see social-providers-config.ts's own header.
// oxlint-disable-next-line no-restricted-imports
import { PROFILE, clientCredentials } from './social-providers-config';
import type { HookContext } from './session';
import { toUserRole } from './session-role';
import { requiredInProduction } from './env';
import { send } from './mail';
import { runInBackground } from './background-tasks';
import { emailPagePath, returnPathOf, verifiedLanding } from './account-email';
import { LAST_USED_PROVIDER_COOKIE, SIGN_IN_TO_VERIFY_PATH } from './sign-in';
import { signedInLanding } from './landing';
import { e2eTrustedOrigins, plainSessionCookie } from './e2e-session-cookie';
import { impersonation, impersonationEnabled } from './impersonation';
import { breachedPasswordCheck } from './breached-password';
import { primaryAdminEmail } from './primary-admin';
import { verifyEmailMessage } from '../emails/verify-email';
import { accountExistsMessage } from '../emails/account-exists';
import { resetPasswordMessage } from '../emails/reset-password';
import { passwordLockedMessage } from '../emails/password-locked';
import { mailPasswordChanged } from './password-notice';
import {
  promotePrimaryAdmin,
  promotePrimaryAdminAtVerification,
  type PrimaryAdminOutcome,
  type SignInProfile,
} from '@/modules/identity';
import {
  VERIFICATION_LIFETIME_SECONDS,
  recordVerificationSent,
  verificationWaitFor,
  isEmailHeldByAnother,
  isPlaceholderEmail,
  placeholderEmail,
  sweepProvisionalAccounts,
  clearFailedPasswordSignIns,
  isPasswordSignInLocked,
  recordFailedPasswordSignIn,
} from '@/modules/identity';
import type { ProviderId } from './types';

// A provider that shared no address — Discord for an account without a
// verified one, Facebook under narrowed permissions — would end the callback
// at `email_not_found`. The placeholder lets the row and its session exist, so
// /account/email can ask for one (claude-docs/auth/admin-bootstrap.md, "The email page").
function orPlaceholder(providerId: ProviderId, accountId: unknown, email: unknown) {
  if (email) return {};
  return { email: placeholderEmail(providerId, String(accountId)), emailVerified: false };
}

// A callback finishing a flow /link-social began under a session. `link` is
// written into the state from that session, never from the request, and is
// absent on every sign-in.
async function isExplicitLink(): Promise<boolean> {
  return (await hasRequestState()) && (await getOAuthState())?.link !== undefined;
}

// Inside an explicit link every provider vouches: there the value feeds only
// Better Auth's link gate, and the account signs in by its id from then on.
// On a sign-in each provider keeps its own answer (claude-docs/auth/admin-bootstrap.md,
// "Linking a second provider").
async function vouchWhenLinking(): Promise<{ emailVerified?: true }> {
  return (await isExplicitLink()) ? { emailVerified: true } : {};
}

// A sign-in that asked for no return path (`NO_RETURN_PATH`), whose landing
// is then its role's. The flag is the client's `additionalData`, so it is
// trusted only to choose between two landings the account could open anyway.
async function asksNoReturnPath(): Promise<boolean> {
  return (await hasRequestState()) && (await getOAuthState())?.noReturnPath === true;
}

/**
 * A provider's `mapProfileToUser`, built from its `PROFILE` entry and spread after the provider's own, so it wins: a provider
 * that never vouches answers `emailVerified: false`, and a link writes nothing to the row.
 */
function mapProfile(id: ProviderId) {
  const { accountId, vouches } = PROFILE[id];
  return async (profile: { email?: unknown }) => ({
    ...(vouches ? {} : { emailVerified: false }),
    ...orPlaceholder(
      id,
      Reflect.get(profile, accountId.find((field) => field in profile) ?? accountId[0]),
      profile.email,
    ),
    ...(await vouchWhenLinking()),
  });
}

// Registered only when id and secret are both present, so `next dev` runs with neither. The roster is in
// social-providers.ts and what differs per provider in social-providers-config.ts's `PROFILE`; a sign-in earns an account only.
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};

  for (const { id } of SOCIAL_PROVIDERS) {
    const credentials = clientCredentials(id);
    if (!credentials) continue;
    providers[id] = {
      ...credentials,
      ...PROFILE[id].extra?.(),
      mapProfileToUser: mapProfile(id),
    };
  }

  return providers;
}

// Per request, not a `BETTER_AUTH_URL` variable: production spans three origins. Outside production the host is fixed
// (`next dev --hostname 0.0.0.0` would make every `redirect_uri` `0.0.0.0:8000`) and the port is the server's own
// (Next sets `PORT`), so a second dev server or an e2e slot is not refused as an invalid origin. The e2e servers are
// production builds that answer the browser at localhost, the one plain-http host it lets use a passkey, so they take the
// fixed host too, under the gate that keeps every deploy off it (claude-docs/testing/e2e.md, "Passkeys").
function baseURL(): BetterAuthOptions['baseURL'] {
  if (process.env.NODE_ENV === 'production' && !plainSessionCookie()) {
    return {
      allowedHosts: [
        'sorrelandsalt.com',
        'staging.sorrelandsalt.com',
        'hotfix-*.sorrelandsalt.com',
      ],
      fallback: 'https://sorrelandsalt.com',
      // Forced: `advanced.trustedProxyHeaders` is unset, so x-forwarded-proto is not read.
      protocol: 'https',
    };
  }
  return `http://localhost:${process.env.PORT || '8000'}`;
}

// The provider's fresh profile, carried from `validateUserInfo` — the one hook
// that sees it, on sign-up, link and sign-in alike — to the after-callback hook,
// which sees only the stored row. Per request, so nothing leaks between sign-ins.
const signInProfile = defineRequestState<SignInProfile | undefined>(() => undefined);

// Who a Better Auth write to `users` is made for, when no session names them:
// the user following their verification link, or signing in over their own
// row. Read by the update hook, which sees only the patch.
const actingUser = defineRequestState<string | undefined>(() => undefined);

// Refusals are logged by user id, never address: a sign-in page must not
// reveal that an address is special.
const UNQUALIFIED = new Set<PrimaryAdminOutcome>([
  'no-profile',
  'provider-does-not-vouch',
  'unverified',
  'profile-email-differs',
]);

// Checked at load, so a deploy without it fails its build rather than its first sign-in.
primaryAdminEmail();

/**
 * A refusal on /verify-email, the way Better Auth's own read: back to the
 * link's `callbackURL` with `?error=<code>`, or 403 for a link carrying none.
 */
function refuseVerification(ctx: HookContext, code: string, message: string): APIError {
  const callbackURL = ctx.query?.callbackURL;
  if (typeof callbackURL === 'string') {
    // The link's landing without its `verified` flag: the page must not read
    // a refusal as a confirmation.
    const landing = new URL(callbackURL, 'http://relative.invalid');
    landing.searchParams.delete('verified');
    const params = new URLSearchParams({ error: code });
    return new APIError('FOUND', undefined, {
      Location: appendQueryParams(landing.pathname + landing.search, params),
    });
  }
  return new APIError('FORBIDDEN', { code, message });
}

/** A link opened from a session that does not hold the row it names. */
function refuseWrongAccount(ctx: HookContext): APIError {
  return refuseVerification(
    ctx,
    'SIGN_IN_TO_VERIFY',
    'Open the link from a browser signed in to this account.',
  );
}

/**
 * A link opened with no session: to the sign-in page, whose sentence says to open the link again once signed in, and which
 * forwards to the email page. Nothing from the link travels with it; one with no `callbackURL` gets the 403 a wrong account does.
 */
function refuseSignedOut(ctx: HookContext): APIError {
  if (typeof ctx.query?.callbackURL !== 'string') return refuseWrongAccount(ctx);
  return new APIError('FOUND', undefined, { Location: SIGN_IN_TO_VERIFY_PATH });
}

/**
 * The session the request carries, or `null`. Better Auth's helper is typed
 * for an endpoint's context, which a hook's holds everything of but is not
 * declared as.
 */
function sessionOf(ctx: HookContext) {
  return getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
}

/**
 * Deletes every lapsed provisional account, logging what went at `info`. A
 * failure is logged at `error` and never thrown: the sweep is housekeeping,
 * and must not fail the sign-in or verification it runs ahead of.
 */
async function sweepQuietly(ctx: HookContext): Promise<void> {
  try {
    const swept = await sweepProvisionalAccounts();
    if (swept.length > 0) {
      ctx.context.logger.info(`provisional accounts swept: ${swept.join(', ')}`);
    }
  } catch (error) {
    ctx.context.logger.error('provisional-account sweep failed', error);
  }
}

/**
 * The roster providers the user's accounts sign in with, for the mail that
 * names them. Better Auth types `providerId` as any string; one outside the
 * roster has no label to name it by, so it is left out.
 */
export async function linkedProviderIds(
  context: Pick<AuthContext, 'internalAdapter'>,
  userId: string,
): Promise<ProviderId[]> {
  const accounts = await context.internalAdapter.findAccounts(userId);
  return accounts.map((account) => account.providerId).filter(isRosterProvider);
}

/**
 * Better Auth mails a verification link to any address posted here, signed
 * in or not. Only the row's own session may ask: otherwise anyone could mail
 * someone else, and the stamp the mail sets would restart their window.
 */
async function requireOwnResend(ctx: HookContext): Promise<void> {
  const session = await sessionOf(ctx);
  const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : '';
  if (!session || session.user.email.toLowerCase() !== email) {
    throw new APIError('UNAUTHORIZED', {
      code: 'SIGN_IN_TO_RESEND',
      message: 'Sign in to this account to send its confirmation again.',
    });
  }
}

/** The passkey endpoints that verify a ceremony and act on it. */
const PASSKEY_VERIFY_PATHS = new Set([
  '/passkey/verify-authentication',
  '/passkey/verify-registration',
]);

/**
 * A passkey ceremony is verified only from a page on the host it is posted to. The plugin expects the request's own
 * Origin header, which any trusted origin passes, so a subdomain page could otherwise sign in to its parent domain.
 */
function pinPasskeyOrigin(ctx: HookContext): void {
  const origin = ctx.headers?.get('origin');
  if (origin !== new URL(ctx.context.baseURL).origin) {
    throw new APIError('FORBIDDEN', {
      code: 'PASSKEY_ORIGIN_MISMATCH',
      message: 'Use a passkey from a page on this site.',
    });
  }
}

/** The verification token's claims, decoded and not verified: a caller may only refuse on them. */
function tokenClaims(token: unknown): { email?: string; updateTo?: string } | undefined {
  const payload = typeof token === 'string' ? token.split('.')[1] : undefined;
  if (!payload) return undefined;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

// The change branch of /verify-email (a token carrying `updateTo`) calls no `beforeEmailVerification` and mints a session
// for whoever opened the link, so the rule is applied here first: only a session holding the row may follow it, and the
// address must still be free or the unique index fails the write (claude-docs/auth/admin-bootstrap.md, "The email page").
async function gateEmailChange(ctx: HookContext): Promise<void> {
  const claims = tokenClaims(ctx.query?.token);
  if (!claims?.email || !claims.updateTo) return;

  const session = await sessionOf(ctx);
  if (!session) throw refuseSignedOut(ctx);
  if (session.user.email.toLowerCase() !== claims.email.toLowerCase()) {
    throw refuseWrongAccount(ctx);
  }
  // A lapsed row holding the address goes first, as it would on a callback.
  await sweepQuietly(ctx);
  if (await isEmailHeldByAnother(claims.updateTo, session.user.id)) {
    throw refuseVerification(ctx, 'EMAIL_TAKEN', 'That address is held by another account.');
  }
  await actingUser.set(session.user.id);
}

// Email and password: the policy is DESIGN.md §8, "Passwords", and the wiring claude-docs/auth/passwords.md.

/** Why a breached password is refused, rather than only that it is. */
const PASSWORD_BREACHED_MESSAGE =
  'This password appears in a known data breach, so someone could guess it. Choose another.';

/**
 * Mails the holder of an address a sign-up arrived with, in place of the second account Better Auth does not
 * make. The sign-up answers as a new one does, so only the mailbox learns the address is taken.
 */
async function mailExistingHolder({ user }: { user: { id: string; email: string } }) {
  if (isPlaceholderEmail(user.email)) return;
  const ctx = getCurrentAuthEndpointContext();
  const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
  await send(
    await accountExistsMessage({
      to: user.email,
      url: `${new URL(ctx.context.baseURL).origin}/sign-in`,
      providers: accounts.map((account) => account.providerId).filter(isRosterProvider),
      hasPassword: accounts.some((account) => account.providerId === 'credential'),
    }),
  );
}

/** The page a reset link opens, whatever page the request for it named. */
const RESET_PASSWORD_PAGE = '/reset-password';

/** How long a reset link lasts. Short, because Better Auth stores the reset token unhashed in `verifications`. */
const RESET_TOKEN_SECONDS = 15 * 60;

/** This request's site origin, for a link in a mail sent from inside one of Better Auth's endpoints. */
function endpointOrigin(): string {
  return new URL(getCurrentAuthEndpointContext().context.baseURL).origin;
}

/**
 * Mails a reset link to a verified address. An unverified one gets nothing, so a reset never reaches an
 * inbox the account has not proved; the request answers the same either way. The link always opens the
 * reset page, so a request cannot point it anywhere else.
 */
async function mailResetLink({
  user,
  url,
}: {
  user: { email: string; emailVerified: boolean };
  url: string;
}) {
  if (!user.emailVerified || isPlaceholderEmail(user.email)) return;
  const link = new URL(url);
  link.searchParams.set('callbackURL', RESET_PASSWORD_PAGE);
  await send(await resetPasswordMessage({ to: user.email, url: link.toString() }));
}

// The account a password sign-in or change names, and whether its lock was on when the attempt arrived, carried from the
// before hook to the after hook so the after hook does no second lookup.
const passwordAttempt = defineRequestState<{ userId?: string; locked: boolean }>(() => ({
  locked: false,
}));

/**
 * Changes `/change-password` to sign out every other session whatever the request asks, so a change always
 * shuts out whoever else held the old password. While the account's password lock is on, it also swaps the
 * current password for one no hash can match, so the change is refused as a wrong current password.
 */
async function holdChange(ctx: HookContext) {
  const userId = (await sessionOf(ctx))?.user.id;
  const locked = userId !== undefined && (await isPasswordSignInLocked(userId));
  await passwordAttempt.set({ userId, locked });
  const body = { ...ctx.body, revokeOtherSessions: true };
  if (locked) body.currentPassword = randomBytes(32).toString('hex');
  return { context: { body } };
}

/**
 * Counts a wrong current password against an unlocked account as a failed sign-in, since it is a guess at the
 * same password, and clears the count once a change proves the password.
 */
async function countChange(ctx: HookContext) {
  const { userId, locked } = await passwordAttempt.get();
  if (!userId) return;
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return clearFailedPasswordSignIns(userId);
  if (returned.body?.code !== BASE_ERROR_CODES.INVALID_PASSWORD.code) return;
  if (!locked) await countFailure(ctx, userId);
}

/**
 * Counts one failure and, when it starts the first lock of a series, mails the account's owner; a later lock in the same
 * series sends nothing, so guessing on cannot mail the owner every hour. The mail carries a reset link made the way
 * Better Auth makes its own, so the owner can choose a new password at once rather than wait out the lock. Like the
 * reset mail, it goes only to a verified address, and runs after the answer, so the answer shows nothing.
 */
async function countFailure(ctx: HookContext, userId: string) {
  const lock = await recordFailedPasswordSignIn(userId);
  if (!lock?.firstOfSeries) return;
  await ctx.context.runInBackgroundOrAwait(mailLockNotice(ctx, userId, lock.length));
}

async function mailLockNotice(ctx: HookContext, userId: string, length: number) {
  const user = await ctx.context.internalAdapter.findUserById(userId);
  if (!user?.emailVerified || isPlaceholderEmail(user.email)) return;
  const token = randomBytes(18).toString('base64url');
  await ctx.context.internalAdapter.createVerificationValue({
    value: user.id,
    identifier: `reset-password:${token}`,
    expiresAt: new Date(Date.now() + RESET_TOKEN_SECONDS * 1000),
  });
  const link = new URL(`${ctx.context.baseURL}/reset-password/${token}`);
  link.searchParams.set('callbackURL', RESET_PASSWORD_PAGE);
  await send(
    await passwordLockedMessage({ to: user.email, url: link.toString(), minutes: length / 60_000 }),
  );
}

/** Tells the account a change on its account page replaced its password. */
async function mailChangeNotice(ctx: HookContext) {
  const returned = ctx.context.returned;
  if (isAPIError(returned) || returned instanceof Response) return;
  const email = ctx.context.session?.user.email;
  if (email) await mailPasswordChanged(email, new URL(ctx.context.baseURL).origin, 'change');
}

function emailAndPassword(): BetterAuthOptions['emailAndPassword'] {
  return {
    enabled: true,
    minPasswordLength: 15,
    maxPasswordLength: 128,
    // Off: on, an unverified account gets no session, and the link verifies only from the row's own session, so it
    // could never be followed. The unverified account signs in and `requireSession()` holds it at the email page.
    requireEmailVerification: false,
    // On: a new account lands signed in, and `requireSession()` holds it at the email page until the address is proven.
    // Better Auth then refuses a held address outright, so the before hook mails the holder and answers it first.
    autoSignIn: true,
    resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: mailResetLink,
    onPasswordReset: async ({ user }) => {
      await clearFailedPasswordSignIns(user.id);
      await mailPasswordChanged(user.email, endpointOrigin(), 'reset');
    },
  };
}

/**
 * A sign-up for an address already held mails the holder and answers 200 as a new account would, without making a
 * second row. Better Auth would refuse it with a 422 that names the address as taken.
 */
async function answerHeldSignUp(ctx: HookContext) {
  const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : undefined;
  const holder = email ? await ctx.context.internalAdapter.findUserByEmail(email) : null;
  if (!holder) return;
  await mailExistingHolder({ user: holder.user });
  return ctx.json({ status: true });
}

/**
 * The id of the account at this address when it holds a password, found as Better Auth's own sign-in finds it. An
 * account with none has nothing to guess, so its wrong passwords are not counted.
 */
async function passwordHolderId(ctx: HookContext, email: string): Promise<string | undefined> {
  const found = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase(), {
    includeAccounts: true,
  });
  const credential = found?.accounts.find(
    (account) => account.providerId === 'credential' && account.accountId === found.user.id,
  );
  return credential?.password ? found?.user.id : undefined;
}

/**
 * While the account is locked, swaps the submitted password for a random one no hash can match. Better Auth then
 * runs its own lookup and verify and refuses with its own wrong-password error, so a locked attempt answers and
 * takes as long as a wrong password, where a refusal here would skip the verify and show the lock.
 */
async function holdLockedSignIn(ctx: HookContext) {
  const email = (ctx.body as { email?: unknown } | undefined)?.email;
  if (typeof email !== 'string') return;
  const userId = await passwordHolderId(ctx, email);
  const locked = userId !== undefined && (await isPasswordSignInLocked(userId));
  await passwordAttempt.set({ userId, locked });
  if (locked) {
    return { context: { body: { ...ctx.body, password: randomBytes(32).toString('hex') } } };
  }
}

/** Counts a wrong password against an unlocked account, and clears the count on a successful sign-in. */
async function countPasswordSignIn(ctx: HookContext) {
  const newSession = ctx.context.newSession;
  if (newSession) return clearFailedPasswordSignIns(newSession.user.id);
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return;
  if (returned.body?.code !== BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code) return;
  const { userId, locked } = await passwordAttempt.get();
  if (userId && !locked) await countFailure(ctx, userId);
}

// /api/auth/* is the one exception to the GraphQL-only rule (CLAUDE.md rule 1).
export const auth = betterAuth({
  // Better Auth's own `validateSecret` is swallowed — with the secret unset it
  // logs and still answers 200 on the well-known default (claude-docs/auth/config.md, "Config").
  secret: requiredInProduction('BETTER_AUTH_SECRET'),
  baseURL: baseURL(),
  // Empty but on the e2e servers, whose browsers post from localhost or devcontainer (claude-docs/testing/e2e.md).
  trustedOrigins: e2eTrustedOrigins(),
  socialProviders: socialProviders(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications, rateLimits, passkeys },
  }),
  // Better Auth's own default, stated so a bump cannot move it: on in every
  // deploy, off under `next dev` and the test suites. In the database because
  // each Fluid Compute instance would otherwise count alone
  // (claude-docs/auth/rate-limiting.md, "Rate limiting").
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
    // Sign-in's own rule, for the passkey ceremonies, which ship none. A custom rule replaces every other on its paths,
    // so the passkey list, rename and remove are held to it too (claude-docs/auth/rate-limiting.md, "Rate limiting").
    customRules: {
      '/passkey/*': { window: 10, max: 3 },
    },
  },
  // Cookie only: `storeInDatabase` would add a users column nothing reads (claude-docs/auth/plugins.md, "Plugins").
  // Impersonation is never constructed at production, nor where the flag is unset, so its endpoints are absent.
  plugins: [
    lastLoginMethod({ cookieName: LAST_USED_PROVIDER_COOKIE }),
    // Fails closed: an unreachable or silent service refuses the password, never waves it through.
    breachedPasswordCheck({ message: PASSWORD_BREACHED_MESSAGE }),
    ...(impersonationEnabled() ? [impersonation()] : []),
    // rpID and origin are left to the plugin, which reads them from the request's own base URL and Origin header,
    // so a passkey belongs to the host it was made on (claude-docs/auth/plugins.md, "Passkeys").
    passkey({
      rpName: 'Sorrel & Salt',
      schema: { passkey: { fields: { credentialID: 'credentialId' } } },
    }),
  ],
  advanced: {
    // Absent leaves Better Auth's own rule: `__Secure-` names wherever the base
    // URL is https, which a production build forces. The audit's e2e servers alone
    // set it false, so a WebKit page on a plain-http origin sends the cookie it holds
    // (claude-docs/testing/e2e.md, "A signed-in browser without a provider").
    ...(plainSessionCookie() && { useSecureCookies: false }),
    // Matches users.id's uuid type so every FK lines up without a cast.
    database: {
      generateId: 'uuid',
    },
    // Vercel sets this one itself, and no client or proxy in front can.
    // Absent, as off Vercel, every request at production shares the `no-trusted-ip` bucket.
    ipAddress: {
      ipAddressHeaders: ['x-vercel-forwarded-for'],
    },
    // Mails, and the rate limiter's sweep, run after the response, so no answer waits on them.
    backgroundTasks: { handler: runInBackground },
  },
  // Offered at sign-up, never required for a session: what needs a verified
  // address checks the column. claude-docs/auth/admin-bootstrap.md, "First-party verification".
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: VERIFICATION_LIFETIME_SECONDS,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      // Nothing is there to receive it; the page asks for an address instead.
      if (isPlaceholderEmail(user.email)) return;
      const ctx = getCurrentAuthEndpointContext();
      // One mail a minute per row, whoever asks; the endpoint answers the
      // same either way, so a stranger learns nothing from the refusal.
      if ((await verificationWaitFor(user.id)) > 0) return;
      // Reached only at sign-up or from the row's own session (`requireOwnResend`),
      // so the stamp, which restarts the provisional window too, is the row's own.
      await recordVerificationSent({ userId: user.id });
      // Every link lands on the email page's confirmed view, carrying the sign-in's destination on to Continue (none for a
      // sign-up that asked for none). A resend's `callbackURL` is already the landing and passes the same guard.
      const link = new URL(url);
      const next = (await asksNoReturnPath())
        ? undefined
        : returnPathOf(link.searchParams.get('callbackURL'));
      link.searchParams.set('callbackURL', verifiedLanding(next));
      await send(
        await verifyEmailMessage({
          to: user.email,
          url: link.href,
          providers: await linkedProviderIds(ctx.context, user.id),
        }),
      );
    },
    // Only from a browser signed in to this very account. Without it, a
    // stranger's sign-up carrying your address is verified by your click on a
    // mail you never asked for.
    beforeEmailVerification: async (user) => {
      const ctx = getCurrentAuthEndpointContext() as HookContext;
      const session = await sessionOf(ctx);
      if (!session) throw refuseSignedOut(ctx);
      if (session.user.id !== user.id) throw refuseWrongAccount(ctx);
      await actingUser.set(user.id);
    },
    // Only for the row a gate admitted: this one's, or `gateEmailChange`'s for
    // a change link, which Better Auth calls it on without the check above.
    afterEmailVerification: async (user) => {
      if (!(await hasRequestState()) || (await actingUser.get()) !== user.id) return;
      // The adapter returns the whole row; the hook's type omits additionalFields.
      const role = toUserRole(Reflect.get(user, 'role'));
      await promotePrimaryAdminAtVerification(
        { userId: user.id, role },
        { accountEmail: user.email, primaryAdminEmail: primaryAdminEmail() },
      );
    },
  },
  account: {
    // Under BETTER_AUTH_SECRET. A row written before this reads as it is:
    // Better Auth decrypts only a value that looks encrypted.
    encryptOAuthTokens: true,
    accountLinking: {
      // A second provider's address is usually another mailbox. Read only by
      // the explicit link, never at sign-in; the row keeps its own address.
      allowDifferentEmails: true,
    },
  },
  emailAndPassword: emailAndPassword(),
  // `/update-user` writes `name` and `image` outside `withAudit`; the name
  // is `setName`'s, the audited write. Refused at the router, before
  // the endpoint or any hook runs, with a 404 (claude-docs/auth/admin-bootstrap.md,
  // "The account page").
  disabledPaths: ['/update-user'],
  user: {
    // Off, pinned by test: on, a user could move the primary admin's address
    // to another account. An email changes through the verified flow.
    changeEmail: { enabled: false },
    // Never refuses: it only records what the provider said, for the hook below.
    // Not on an explicit link, whose vouch `vouchWhenLinking` lent and which
    // must not reach promotion. Better Auth names an implicit link at sign-in
    // `link-account` too, so the state, not `source.action`, tells them apart.
    validateUserInfo: async ({ user, source }) => {
      if (source.method !== 'oauth' || !source.oauth) return;
      if (await isExplicitLink()) return;
      // Absent on a create, which the create hook stamps; present on a sign-in
      // or link, which may mark the row verified.
      if (user.id) await actingUser.set(String(user.id));
      await signInProfile.set({
        providerId: source.oauth.providerId,
        email: String(user.email ?? ''),
        emailVerified: user.emailVerified === true,
      });
    },
    additionalFields: {
      // `input: false`: Better Auth drops any client-supplied value, so only the
      // hook below can set these. No `defaultValue`, so Postgres's own applies.
      role: { type: 'string', input: false },
      canCreateWorkspace: { type: 'boolean', input: false },
      // Declared so the update hook below can clear it; nothing reads it here.
      verificationSentAt: { type: 'date', required: false, input: false, returned: false },
      // NOT NULL with no database default, so every insert must supply these.
      createdBy: { type: 'string', input: false, returned: false },
      updatedBy: { type: 'string', input: false, returned: false },
    },
  },
  hooks: {
    // Before the code exchange or a password sign-up, so a lapsed account
    // holding the arriving address is gone before Better Auth looks it up. A
    // callback does not yet know which address that is, so it sweeps every lapsed row. A failure is logged and
    // never fails the sign-in: the sweep is housekeeping.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/verify-email') return gateEmailChange(ctx);
      if (ctx.path === '/send-verification-email') return requireOwnResend(ctx);
      if (ctx.path === '/change-password') return holdChange(ctx);
      if (ctx.path === '/sign-in/email') return holdLockedSignIn(ctx);
      if (PASSKEY_VERIFY_PATHS.has(ctx.path)) return pinPasskeyOrigin(ctx);
      if (ctx.path !== '/callback/:id' && ctx.path !== '/sign-up/email') return;
      await sweepQuietly(ctx);
      if (ctx.path === '/sign-up/email') return answerHeldSignUp(ctx);
    }),
    after: createAuthMiddleware(async (ctx) => {
      // A new account answers with the same body a held address does; only its session cookie differs.
      if (ctx.path === '/sign-up/email' && !isAPIError(ctx.context.returned))
        return ctx.json({ status: true });
      if (ctx.path === '/change-password') {
        await countChange(ctx);
        return mailChangeNotice(ctx);
      }
      if (ctx.path === '/sign-in/email') return countPasswordSignIn(ctx);
      const newSession = ctx.context.newSession;
      // A passkey proves the account's owner as a password would, so it forgets the failures too.
      if (ctx.path === '/passkey/verify-authentication' && newSession) {
        return clearFailedPasswordSignIns(newSession.user.id);
      }
      if (ctx.path !== '/callback/:id' || !newSession) return;

      const { user } = newSession;
      const outcome = await promotePrimaryAdmin(
        { userId: user.id, role: toUserRole(user.role) },
        {
          accountEmail: user.email,
          profile: await signInProfile.get(),
          primaryAdminEmail: primaryAdminEmail(),
        },
      );
      if (UNQUALIFIED.has(outcome)) {
        ctx.context.logger.warn(`primary admin not promoted: user ${user.id} (${outcome})`);
      }

      const noReturnPath = await asksNoReturnPath();

      // An unverified account can do nothing else, so it lands on the email
      // page, address prefilled, until the address is proven; where the
      // sign-in was going rides along. The endpoint's own redirect is the
      // `location` already in the response headers, and its cookies stay.
      if (!user.emailVerified) {
        const landing = new URL(
          ctx.context.responseHeaders?.get('location') ?? '/',
          ctx.context.baseURL,
        );
        throw new APIError('FOUND', undefined, {
          Location: emailPagePath(
            noReturnPath ? undefined : `${landing.pathname}${landing.search}`,
          ),
        });
      }

      // With no return path, the landing is the role's as it stands after any
      // promotion just now; otherwise the endpoint's redirect already goes
      // where the sign-in asked, `/coven` included. A member goes into their
      // first coven (`signedInLanding`).
      if (noReturnPath) {
        const role = outcome === 'promoted' ? 'admin' : toUserRole(user.role);
        throw new APIError('FOUND', undefined, {
          Location: await signedInLanding({ userId: user.id, role }),
        });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        // Writes outside `withAudit` (CLAUDE.md rule 3): there is no session yet,
        // so the row stamps itself as its creator. `forceAllowId` makes the uuid
        // generated here the row's real id, so createdBy/updatedBy can name it.
        before: async (user) => {
          const id = crypto.randomUUID();
          return {
            data: {
              ...user,
              id,
              createdBy: id,
              updatedBy: id,
            },
          };
        },
        // The sign-up hook's second write, outside `withAudit` for the same reason: a viewer seat in the demo coven, stamped by the
        // new user as their own row is. It never throws, as Better Auth cannot roll the user row back and a half-failed sign-up is
        // worse than a missing seat; the demo coven seed's backfill repairs it.
        after: async (user, ctx) => {
          try {
            const demo = await findDemoWorkspace();
            if (!demo) return;
            await db.insert(workspaceMembers).values({
              workspaceId: demo.id,
              userId: user.id,
              role: 'viewer',
              invitedBy: null,
              createdBy: user.id,
              updatedBy: user.id,
            });
          } catch (error) {
            (ctx?.context.logger ?? console).error(
              `demo coven seat failed: user ${user.id}`,
              error,
            );
          }
        },
      },
      update: {
        // The same self-stamp as the create hook, outside `withAudit` for the
        // same reason: the verify write is the identity completing. Merged into
        // Better Auth's own UPDATE, so the row says who and the trigger says when.
        before: async (patch, ctx) => {
          const actor =
            ((await hasRequestState()) ? await actingUser.get() : undefined) ??
            ctx?.context.session?.user.id;
          const data: { updatedBy?: string; verificationSentAt?: null } = {};
          if (actor) data.updatedBy = actor;
          // The mail was answered: the clock that spaces mails to the row starts over.
          if (patch.emailVerified === true) data.verificationSentAt = null;
          if (Object.keys(data).length === 0) return;
          return { data };
        },
      },
    },
  },
});
