import { betterAuth, type BetterAuthOptions } from 'better-auth';
import type { AuthContext } from '@better-auth/core';
import { APIError, createAuthMiddleware, getOAuthState, getSessionFromCtx } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod } from 'better-auth/plugins';
import {
  defineRequestState,
  getCurrentAuthEndpointContext,
  hasRequestState,
} from '@better-auth/core/context';
import { appendQueryParams } from '@better-auth/core/utils/url';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db/client-imports.md, "Who may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { users } from '../modules/identity/schema/users';
import { sessions, accounts, verifications, rateLimits } from '../modules/identity/schema/auth';
import { SOCIAL_PROVIDERS, isRosterProvider } from './social-providers';
// Server-only — see social-providers-config.ts's own header.
// oxlint-disable-next-line no-restricted-imports
import { PROFILE, clientCredentials } from './social-providers-config';
import type { HookContext } from './session';
import { toUserRole } from './session-role';
import { requiredInProduction } from './env';
import { send } from './mail';
import { emailPagePath, returnPathOf, verifiedLanding } from './account-email';
import { LAST_USED_PROVIDER_COOKIE, SIGN_IN_TO_VERIFY_PATH, postSignInLanding } from './sign-in';
import { impersonation, impersonationEnabled } from './impersonation';
import { primaryAdminEmail } from './primary-admin';
import { verifyEmailMessage } from '../emails/verify-email';
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
 * A provider's `mapProfileToUser`, built from its `PROFILE` entry. Each
 * mapping is spread after the provider's own, so it wins: one that never
 * vouches answers `emailVerified: false`, and a link writes nothing to the
 * row. Typed for any profile, since Better Auth types each provider's apart.
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

// Registered only when id and secret are both present, so `next dev` runs with
// neither. A sign-in earns an account and nothing else (CLAUDE.md invariants).
// The roster lives in social-providers.ts, shared with the sign-in page, and
// what differs between providers in social-providers-config.ts's `PROFILE`,
// so a provider added there needs no edit here.
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

// Per request rather than a `BETTER_AUTH_URL` env var: production spans three
// origins, and one Preview-scoped variable cannot tell staging from a hotfix.
// Outside production the origin is fixed: `next dev --hostname 0.0.0.0` derives
// it from its bind address, so every `redirect_uri` would be `0.0.0.0:8000`.
function baseURL(): BetterAuthOptions['baseURL'] {
  if (process.env.NODE_ENV === 'production') {
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
  return 'http://localhost:8000';
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
 * A link opened from no session at all: to the sign-in page, whose sentence
 * says to open the link again once signed in, and which sends the account on
 * to the email page. Nothing from the link travels with it. A link carrying
 * no `callbackURL` has no page to go back to, and gets the 403 a wrong
 * account does.
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

// The change branch of /verify-email — a token carrying `updateTo` — calls no
// `beforeEmailVerification` and, given no session, mints one for whoever
// opened the link. So MB.66's rule is applied here, before the endpoint: only
// a session holding the row may follow it, and the address must still be free,
// or the unique index would fail the write. The plain branch is gated by
// `beforeEmailVerification` as before (claude-docs/auth/admin-bootstrap.md, "The email page").
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

// /api/auth/* is the one exception to the GraphQL-only rule (CLAUDE.md rule 1).
export const auth = betterAuth({
  // Better Auth's own `validateSecret` is swallowed — with the secret unset it
  // logs and still answers 200 on the well-known default (claude-docs/auth/config.md, "Config").
  secret: requiredInProduction('BETTER_AUTH_SECRET'),
  baseURL: baseURL(),
  socialProviders: socialProviders(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications, rateLimits },
  }),
  // Better Auth's own default, stated so a bump cannot move it: on in every
  // deploy, off under `next dev` and the test suites. In the database because
  // each Fluid Compute instance would otherwise count alone
  // (claude-docs/auth/rate-limiting.md, "Rate limiting").
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
  },
  // Cookie only: `storeInDatabase` would add a users column nothing reads.
  // The sign-in page marks the provider this browser last used, and the
  // server says nothing about an address (claude-docs/auth/plugins.md, "Plugins").
  // Impersonation is never constructed at production, nor anywhere the flag
  // is unset, so its endpoints are absent rather than refusing (MB.53).
  plugins: [
    lastLoginMethod({ cookieName: LAST_USED_PROVIDER_COOKIE }),
    ...(impersonationEnabled() ? [impersonation()] : []),
  ],
  advanced: {
    // Matches users.id's uuid type so every FK lines up without a cast.
    database: {
      generateId: 'uuid',
    },
    // Vercel sets this one itself, and no client or proxy in front can.
    // Absent, as off Vercel, every request at production shares the `no-trusted-ip` bucket.
    ipAddress: {
      ipAddressHeaders: ['x-vercel-forwarded-for'],
    },
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
      // Better Auth lands a sign-up's link where the sign-in asked to go; every
      // link lands on the email page's confirmed view instead, carrying that
      // destination on to Continue — none for a sign-up that asked for none,
      // whose `callbackURL` only stands in. A resend's `callbackURL` is already
      // the landing, and passes the same guard as a sign-up's.
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
  // `/update-user` writes `name` and `image` outside `withAudit`; the name
  // is `setName`'s, the audited write (MB.88). Refused at the router, before
  // the endpoint or any hook runs, with a 404 (claude-docs/auth/admin-bootstrap.md,
  // "The account page").
  disabledPaths: ['/update-user'],
  user: {
    // Off, pinned by test: on, a user could move the primary admin's address
    // to another account. An email changes through MB.54's verified flow.
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
    // Before the code exchange, so a lapsed account holding the arriving
    // address is gone before Better Auth looks it up. Nothing yet knows which
    // address that is, so it sweeps every lapsed row. A failure is logged and
    // never fails the sign-in: the sweep is housekeeping.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/verify-email') return gateEmailChange(ctx);
      if (ctx.path === '/send-verification-email') return requireOwnResend(ctx);
      if (ctx.path !== '/callback/:id') return;
      await sweepQuietly(ctx);
    }),
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;
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
      // where the sign-in asked, `/coven` included.
      if (noReturnPath) {
        const role = outcome === 'promoted' ? 'admin' : toUserRole(user.role);
        throw new APIError('FOUND', undefined, { Location: postSignInLanding(role) });
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
