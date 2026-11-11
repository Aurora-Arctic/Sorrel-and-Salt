import { randomBytes } from 'node:crypto';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import {
  isAPIError,
  APIError,
  createAuthMiddleware,
  getOAuthState,
  getSessionFromCtx,
} from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod } from 'better-auth/plugins';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { passkey } from '@better-auth/passkey';
import {
  defineRequestState,
  getCurrentAuthEndpointContext,
  hasRequestState,
} from '@better-auth/core/context';
import { BASE_ERROR_CODES } from '@better-auth/core/error';
import { appendQueryParams } from '@better-auth/core/utils/url';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db/repository-files.md, "Who
// may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { workspaceMembers } from '../modules/coven/schema/workspaces';
import { users } from '../modules/identity/schema/users';
import { defaultPasskeyName } from './passkey-name';
import { findDemoWorkspace, removePasskeyKeepingAWayIn } from '../db/repository';
import {
  sessions,
  accounts,
  verifications,
  rateLimits,
  passkeys,
  twoFactors,
} from '../modules/identity/schema/auth';
import { SOCIAL_PROVIDERS } from './social-providers';
// Server-only — see social-providers-config.ts's own header.
// oxlint-disable-next-line no-restricted-imports
import { PROFILE, clientCredentials } from './social-providers-config';
import type { HookContext } from './session';
import { toUserRole } from './session-role';
import { requiredInProduction } from './env';
import { authSecrets } from './auth-secrets';
import { SITE_NAME } from './site';
import { runInBackground } from './background-tasks';
import { emailPagePath, returnPathOf } from './account-email';
import { LAST_USED_PROVIDER_COOKIE, SIGN_IN_TO_VERIFY_PATH } from './sign-in';
import { signedInLanding } from './landing';
import { e2eTrustedOrigins, plainSessionCookie } from './e2e-session-cookie';
import { impersonation, impersonationEnabled } from './impersonation';
import { breachedPasswordCheck } from './breached-password';
import { HELD_PASSWORD_FIELDS } from './held-password-paths';
import { isFreshSession } from './session-fresh';
import { primaryAdminEmail } from './primary-admin';
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
  addressBeingLeft,
  emailChangeStanding,
  isEmailHeldByAnother,
  isPlaceholderEmail,
  placeholderEmail,
  scheduleProvisionalExpiry,
  clearFailedPasswordSignIns,
  isPasswordSignInLocked,
  recordFailedPasswordSignIn,
  scheduleSecretLinkMail,
  scheduleAccountNotice,
} from '@/modules/identity';
import type { ProviderId } from './types';

// A provider sharing no address would end the callback at `email_not_found`; the placeholder lets /account/email ask
// for one (claude-docs/auth/admin-bootstrap.md, "The email page").
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

// Inside an explicit link every provider vouches; on a sign-in each keeps its own answer
// (claude-docs/auth/admin-bootstrap.md, "Linking a second provider").
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

// Registered only when id and secret are both present, so `next dev` runs with neither.
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

// Per request, not a `BETTER_AUTH_URL` variable: production spans three origins. The e2e servers take a fixed localhost
// host under a gate that keeps every deploy off it (claude-docs/auth/config.md, "Base URL").
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

/** Better Auth's helper is typed for an endpoint's context, which a hook's holds everything of. */
function sessionOf(ctx: HookContext) {
  return getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
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

/**
 * Removes the account's own passkey here, not in the plugin, so the repository's locked check can refuse the last way
 * in (claude-docs/auth/plugins.md, "Passkeys").
 */
async function keepAWayIn(ctx: HookContext) {
  const session = await sessionOf(ctx);
  const id = ctx.body?.id;
  if (!session || typeof id !== 'string') return;
  const outcome = await removePasskeyKeepingAWayIn(
    session.user.id,
    id,
    SOCIAL_PROVIDERS.map((provider) => provider.id),
  );
  // Another account's id falls through to the plugin, which refuses it as not this account's.
  if (outcome === 'not-held') return;
  if (outcome === 'last-way-in') {
    throw new APIError('BAD_REQUEST', {
      code: 'LAST_SIGN_IN_METHOD',
      message: 'This passkey is the only way to sign in to this account, so it cannot be removed.',
    });
  }
  return ctx.json({ status: true });
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
// address must still be free or the unique index fails the write
// (claude-docs/auth/admin-bootstrap.md, "The email page").
async function gateEmailChange(ctx: HookContext): Promise<void> {
  const claims = tokenClaims(ctx.query?.token);
  if (!claims?.email || !claims.updateTo) return;

  const session = await sessionOf(ctx);
  if (!session) throw refuseSignedOut(ctx);
  if (session.user.email.toLowerCase() !== claims.email.toLowerCase()) {
    throw refuseWrongAccount(ctx);
  }
  // Only the newest change's link is honoured: a later change replaced the row's pending address, and a lapsed one cleared it.
  const standing = await emailChangeStanding(session.user.id, claims.updateTo);
  if (standing === 'replaced') {
    throw refuseVerification(ctx, 'CHANGE_REPLACED', 'A newer change link replaced this one.');
  }
  if (standing === 'lapsed') {
    throw refuseVerification(ctx, 'TOKEN_EXPIRED', 'This change link has expired.');
  }
  if (await isEmailHeldByAnother(claims.updateTo, session.user.id)) {
    throw refuseVerification(ctx, 'EMAIL_TAKEN', 'That address is held by another account.');
  }
  await actingUser.set(session.user.id);
}

// Email and password: the policy is DESIGN.md §8, "Passwords", and the wiring
// claude-docs/auth/passwords.md.

const PASSWORD_BREACHED_MESSAGE =
  'This password appears in a known data breach, so someone could guess it. Choose another.';

/** Answers as a new sign-up does, so only the mailbox learns the address is taken. */
async function mailExistingHolder({ user }: { user: { id: string } }) {
  await scheduleAccountNotice({
    kind: 'account-exists',
    userId: user.id,
    origin: endpointOrigin(),
  });
}

/** How long a reset link lasts. Short, because Better Auth stores the reset token unhashed in `verifications`. */
const RESET_TOKEN_SECONDS = 15 * 60;

function endpointOrigin(): string {
  return new URL(getCurrentAuthEndpointContext().context.baseURL).origin;
}

/**
 * Mails a reset link to a verified address only, and answers the same either
 * way (claude-docs/auth/passwords.md, "Reset and change").
 */
async function mailResetLink({
  user,
}: {
  user: { id: string; email: string; emailVerified: boolean };
}) {
  if (!user.emailVerified || isPlaceholderEmail(user.email)) return;
  const authBase = getCurrentAuthEndpointContext().context.baseURL;
  await scheduleSecretLinkMail({ kind: 'reset', userId: user.id, authBase });
}

const PASSWORD_SIGN_IN_PAUSED = {
  code: 'PASSWORD_SIGN_IN_PAUSED',
  message: 'Password sign-in is paused for this account.',
};

// The account a password sign-in, or an endpoint checking a held password, names, and whether its lock was on when the
// attempt arrived, carried from the before hook to the after hook so the after hook does no second lookup.
const passwordAttempt = defineRequestState<{ userId?: string; locked: boolean }>(() => ({
  locked: false,
}));

async function holdsPassword(ctx: HookContext, userId: string): Promise<boolean> {
  const accounts = await ctx.context.internalAdapter.findAccounts(userId);
  return accounts.some(
    (account) =>
      account.providerId === 'credential' && account.accountId === userId && !!account.password,
  );
}

/**
 * Holds an endpoint that checks the account's own password while its password lock is on
 * (claude-docs/auth/passwords.md, "Lockout").
 */
async function holdHeldPassword(ctx: HookContext, field: string) {
  const session = await sessionOf(ctx);
  if (ctx.path === '/two-factor/disable' && session) {
    if (!isFreshSession(session.session.createdAt, ctx.context.sessionConfig.freshAge)) {
      throw APIError.from('FORBIDDEN', BASE_ERROR_CODES.SESSION_NOT_FRESH);
    }
  }
  const userId =
    session && (await holdsPassword(ctx, session.user.id)) ? session.user.id : undefined;
  const locked = userId !== undefined && (await isPasswordSignInLocked(userId));
  await passwordAttempt.set({ userId, locked });
  const body = { ...ctx.body };
  if (ctx.path === '/change-password') body.revokeOtherSessions = true;
  // The two-factor paths are the account page's own, so the signed-in owner is told the lock is why a right password
  // is refused; the other paths keep answering as a wrong password.
  if (locked && ctx.path.startsWith('/two-factor/')) {
    throw APIError.from('BAD_REQUEST', PASSWORD_SIGN_IN_PAUSED);
  }
  if (locked && typeof body[field] === 'string') body[field] = randomBytes(32).toString('hex');
  return { context: { body } };
}

/**
 * Counts a wrong password against an unlocked account as a failed sign-in, since it is a guess at the same password,
 * and clears the count once the endpoint accepts a password it was given.
 */
async function countHeldPassword(ctx: HookContext, field: string) {
  const { userId, locked } = await passwordAttempt.get();
  if (!userId || typeof ctx.body?.[field] !== 'string') return;
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return clearFailedPasswordSignIns(userId);
  if (returned.body?.code !== BASE_ERROR_CODES.INVALID_PASSWORD.code) return;
  if (!locked) await countFailure(ctx, userId);
}

/**
 * Counts one failure and mails the owner only when it starts the first lock of
 * a series (claude-docs/auth/passwords.md, "Lockout").
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
  // The job reads this token back when it sends, so the run carries the account id alone.
  await scheduleSecretLinkMail({
    kind: 'lockout',
    userId: user.id,
    authBase: ctx.context.baseURL,
    minutes: length / 60_000,
  });
}

async function mailChangeNotice(ctx: HookContext) {
  const returned = ctx.context.returned;
  if (isAPIError(returned) || returned instanceof Response) return;
  const userId = ctx.context.session?.user.id;
  if (!userId) return;
  const origin = new URL(ctx.context.baseURL).origin;
  await scheduleAccountNotice({ kind: 'password-changed', userId, origin, how: 'change' });
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
      await scheduleAccountNotice({
        kind: 'password-changed',
        userId: user.id,
        origin: endpointOrigin(),
        how: 'reset',
      });
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

async function countPasswordSignIn(ctx: HookContext) {
  const newSession = ctx.context.newSession;
  if (newSession) return clearFailedPasswordSignIns(newSession.user.id);
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return;
  if (returned.body?.code !== BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code) return;
  const { userId, locked } = await passwordAttempt.get();
  if (userId && !locked) await countFailure(ctx, userId);
}

// Once a change link's swap is written, the address it left is told. The swap held that address in `former_email`, so the
// notice's job carries the account id alone and its step reads the address when it sends.
async function noticeCompletedChange(userId: string, request: Request | undefined): Promise<void> {
  const claims = tokenClaims(request && new URL(request.url).searchParams.get('token'));
  if (!claims?.email || !claims.updateTo) return;
  await scheduleAccountNotice({ kind: 'change-completed', userId, origin: endpointOrigin() });
}

// /api/auth/* is the one exception to the GraphQL-only rule (CLAUDE.md rule 1).
/** A failure is logged, as the sign-in stands either way. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth's logger takes any
async function claimForVerifiedAccount(
  user: { id: string; email: string; emailVerified: boolean },
  ctx:
    | { context?: { logger?: { error: (message: string, ...args: any[]) => void } } }
    | null
    | undefined,
): Promise<void> {
  if (!user.emailVerified) return;
  try {
    const { claimSignedOutRequests } = await import('@/modules/support');
    await claimSignedOutRequests(user);
  } catch (error) {
    (ctx?.context?.logger ?? console).error(`support claim failed: user ${user.id}`, error);
  }
}

export const auth = betterAuth({
  // Better Auth's own `validateSecret` is swallowed — with the secret unset it
  // logs and still answers 200 on the well-known default (claude-docs/auth/config.md, "Config").
  secret: requiredInProduction('BETTER_AUTH_SECRET'),
  // Versioned, so a new key leaves what the old one encrypted readable; `secret` above is read only for values written
  // before versions existed (claude-docs/auth/config.md, "Rotating the secret").
  secrets: authSecrets(),
  baseURL: baseURL(),
  // Empty but on the e2e servers, whose browsers post from localhost or
  // devcontainer (claude-docs/testing/e2e.md).
  trustedOrigins: e2eTrustedOrigins(),
  socialProviders: socialProviders(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications, rateLimits, passkeys, twoFactors },
  }),
  // Better Auth's default, stated so a bump cannot move it; counted in the database, as each instance would otherwise
  // count alone (claude-docs/auth/rate-limiting.md, "Rate limiting").
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
    // Sign-in's own rule, for the passkey ceremonies, which ship none. A custom rule replaces every other on its paths,
    // so the passkey list, rename and remove are held to it too (claude-docs/auth/rate-limiting.md,
    // "Rate limiting").
    customRules: {
      '/passkey/*': { window: 10, max: 3 },
    },
  },
  // Cookie only: `storeInDatabase` would add a users column nothing reads
  // (claude-docs/auth/plugins.md, "Plugins"). Impersonation is never constructed at production, nor
  // where the flag is unset, so its endpoints are absent.
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
      // A passkey the person did not name is called after the browser and platform that made it, read from this
      // request's own header; a name the client sends wins.
      registration: {
        afterVerification: ({ ctx }) => ({
          name: defaultPasskeyName(ctx.headers?.get('user-agent')),
        }),
      },
    }),
    // An authenticator-app step after a right password, offered, never required. It answers only the password sign-in,
    // so a provider or passkey sign-in is never asked (claude-docs/auth/two-factor.md).
    twoFactor({ issuer: SITE_NAME }),
  ],
  advanced: {
    // Absent leaves Better Auth's `__Secure-` rule; only the e2e servers set it
    // false (claude-docs/testing/e2e.md, "A signed-in browser without a
    // provider").
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
      // The job signs a link of its own when it sends, so the run carries the account id and the destination alone.
      await scheduleSecretLinkMail({
        kind: 'verification',
        userId: user.id,
        authBase: ctx.context.baseURL,
        next: next ?? null,
      });
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
    afterEmailVerification: async (user, request) => {
      if (!(await hasRequestState()) || (await actingUser.get()) !== user.id) return;
      await noticeCompletedChange(user.id, request);
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
  // `/update-user` writes outside `withAudit`, so the router refuses it with a 404
  // (claude-docs/auth/admin-bootstrap.md, "The account page").
  disabledPaths: ['/update-user'],
  user: {
    // Off, pinned by test: on, a user could move the primary keeper's address
    // to another account. An email changes through the verified flow.
    changeEmail: { enabled: false },
    // Never refuses: it only records what the provider said. Not on an explicit link, which must not reach promotion;
    // the state tells the two apart, not `source.action`.
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
      // The versions of the terms, disclaimer and code of ethics the account agreed to: read into the session so the page gate can
      // compare them with the versions in force, written only by the `agreeToTerms` service.
      agreedTermsVersion: { type: 'number', required: false, input: false },
      agreedDisclaimerVersion: { type: 'number', required: false, input: false },
      agreedEthicsVersion: { type: 'number', required: false, input: false },
      termsAcceptedAt: { type: 'date', required: false, input: false, returned: false },
      // Declared so the update hook below can clear it; nothing reads it here.
      verificationSentAt: { type: 'date', required: false, input: false, returned: false },
      // Declared so the update hook below can clear it at the swap; the email service writes it.
      pendingEmail: { type: 'string', required: false, input: false, returned: false },
      // Declared so the update hook below can set it at the swap; the account notice job clears it.
      formerEmail: { type: 'string', required: false, input: false, returned: false },
      // NOT NULL with no database default, so every insert must supply these.
      createdBy: { type: 'string', input: false, returned: false },
      updatedBy: { type: 'string', input: false, returned: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/verify-email') return gateEmailChange(ctx);
      if (ctx.path === '/send-verification-email') return requireOwnResend(ctx);
      if (ctx.path in HELD_PASSWORD_FIELDS)
        return holdHeldPassword(ctx, HELD_PASSWORD_FIELDS[ctx.path]);
      if (ctx.path === '/sign-in/email') return holdLockedSignIn(ctx);
      if (PASSKEY_VERIFY_PATHS.has(ctx.path)) return pinPasskeyOrigin(ctx);
      if (ctx.path === '/passkey/delete-passkey') return keepAWayIn(ctx);
      if (ctx.path === '/sign-up/email') return answerHeldSignUp(ctx);
    }),
    after: createAuthMiddleware(async (ctx) => {
      // A new account answers with the same body a held address does; only its session cookie differs.
      if (ctx.path === '/sign-up/email' && !isAPIError(ctx.context.returned))
        return ctx.json({ status: true });
      if (ctx.path in HELD_PASSWORD_FIELDS) {
        await countHeldPassword(ctx, HELD_PASSWORD_FIELDS[ctx.path]);
        if (ctx.path === '/change-password') return mailChangeNotice(ctx);
        return;
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

      // With no return path the landing is the role's after any promotion (`signedInLanding`).
      if (noReturnPath) {
        const role = outcome === 'promoted' ? 'admin' : toUserRole(user.role);
        throw new APIError('FOUND', undefined, {
          Location: await signedInLanding({ userId: user.id, role }),
        });
      }
    }),
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          const user = await ctx?.context.internalAdapter.findUserById(session.userId);
          if (!user) return;
          await claimForVerifiedAccount(user, ctx);
        },
      },
    },
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
        // The sign-up hook's second write, outside `withAudit` for the same reason: an observer seat in the demo coven, stamped by the
        // new user as their own row is. It never throws, as Better Auth cannot roll the user row back and a half-failed sign-up is
        // worse than a missing seat; the demo coven seed's backfill repairs it.
        after: async (user, ctx) => {
          // One run per unverified sign-up removes the row once its window lapses. A failed start is logged, as the sign-up stands
          // either way and the account then holds its address until a keeper removes it.
          if (!user.emailVerified) {
            try {
              await scheduleProvisionalExpiry(user.id);
            } catch (error) {
              (ctx?.context.logger ?? console).error(
                `provisional expiry not scheduled: user ${user.id}`,
                error,
              );
            }
          }
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
        after: async (user, ctx) => {
          if (!user || !user.emailVerified) return;
          await claimForVerifiedAccount(user, ctx);
        },
        // The same self-stamp as the create hook, outside `withAudit` for the
        // same reason: the verify write is the identity completing. Merged into
        // Better Auth's own UPDATE, so the row says who and the trigger says when.
        before: async (patch, ctx) => {
          const actor =
            ((await hasRequestState()) ? await actingUser.get() : undefined) ??
            ctx?.context.session?.user.id;
          const data: {
            updatedBy?: string;
            verificationSentAt?: null;
            pendingEmail?: null;
            formerEmail?: string;
          } = {};
          if (actor) data.updatedBy = actor;
          // The mail was answered: the clock that spaces mails to the row starts over.
          if (patch.emailVerified === true) data.verificationSentAt = null;
          // The change link's swap: the pending address is now the row's, cleared in the same write.
          if (typeof patch.email === 'string') data.pendingEmail = null;
          // And the address being left is held for its notice, which reads it from the row.
          const leaving =
            typeof patch.email === 'string' && actor
              ? await addressBeingLeft(actor, patch.email)
              : null;
          if (leaving) data.formerEmail = leaving;
          if (Object.keys(data).length === 0) return;
          return { data };
        },
      },
    },
  },
});
