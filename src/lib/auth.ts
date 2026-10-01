import { betterAuth, type BetterAuthOptions } from 'better-auth';
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
import { SOCIAL_PROVIDERS } from './social-providers';
// Server-only — see social-providers-config.ts's own header.
// oxlint-disable-next-line no-restricted-imports
import { clientCredentials } from './social-providers-config';
import type { UserRole, HookContext } from './session';
import { send } from './mail';
import { emailPagePath, returnPathOf, verifiedLanding } from './account-email';
import { LAST_USED_PROVIDER_COOKIE, SIGN_IN_TO_VERIFY_PATH, postSignInLanding } from './sign-in';
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

// Better Auth's own `validateSecret` is swallowed — with the secret unset it
// logs and still answers 200 on the well-known default. Production-only:
// `next dev` and Vitest have no use for it. See claude-docs/auth/config.md, "Config".
function authSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }
  return secret;
}

// Registered only when id and secret are both present, so `next dev` runs with
// neither. A sign-in earns an account and nothing else (CLAUDE.md invariants).
// The roster itself lives in social-providers.ts, shared with the sign-in
// page, so a provider added or removed there needs no second edit here.
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

function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};

  for (const provider of SOCIAL_PROVIDERS) {
    const credentials = clientCredentials(provider.id);
    if (!credentials) continue;

    // Each mapping is spread after the provider's own, so it wins. Facebook
    // and Microsoft never vouch for an address at sign-in (claude-docs/auth/admin-bootstrap.md,
    // "First-party verification"), so a true users.emailVerified means
    // Google, Discord or our own mail did. A link writes nothing to the row.
    switch (provider.id) {
      case 'google':
        providers.google = {
          ...credentials,
          mapProfileToUser: async (profile) => ({
            ...orPlaceholder('google', profile.sub, profile.email),
            ...(await vouchWhenLinking()),
          }),
        };
        break;
      case 'discord':
        providers.discord = {
          ...credentials,
          mapProfileToUser: async (profile) => ({
            ...orPlaceholder('discord', profile.id, profile.email),
            ...(await vouchWhenLinking()),
          }),
        };
        break;
      case 'facebook':
        providers.facebook = {
          ...credentials,
          mapProfileToUser: async (profile) => ({
            emailVerified: false,
            // An id-token profile names the account `sub`; the Graph one, `id`.
            ...orPlaceholder(
              'facebook',
              'sub' in profile ? profile.sub : profile.id,
              profile.email,
            ),
            ...(await vouchWhenLinking()),
          }),
        };
        break;
      case 'microsoft':
        // Personal Microsoft accounts must be able to sign in, so the tenant is
        // stated explicitly rather than left to Better Auth's own "common"
        // default — a dependency bump silently narrowing that default would
        // otherwise fail every personal-account sign-in with no code change
        // here to review. The app registration itself must also allow personal
        // accounts (claude-docs/secrets.md); the tenant alone can't grant that.
        providers.microsoft = {
          ...credentials,
          tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
          mapProfileToUser: async (profile) => ({
            emailVerified: false,
            ...orPlaceholder('microsoft', profile.oid, profile.email),
            ...(await vouchWhenLinking()),
          }),
        };
        break;
    }
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

// Names the primary admin (claude-docs/auth/admin-bootstrap.md, "Admin bootstrap"). Required
// wherever BETTER_AUTH_SECRET is, and for the same reason: every deploy runs at
// NODE_ENV=production. Unset elsewhere, it promotes nobody.
function primaryAdminEmail(): string | undefined {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (!email && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is not set');
  }
  return email || undefined;
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

/**
 * A link opened from no session at all: to the sign-in page, whose sentence
 * says to open the link again once signed in, and which sends the account on
 * to the email page. Nothing from the link travels with it.
 */
function refuseSignedOut(ctx: HookContext): APIError {
  if (typeof ctx.query?.callbackURL !== 'string') {
    return new APIError('FORBIDDEN', {
      code: 'SIGN_IN_TO_VERIFY',
      message: 'Open the link from a browser signed in to this account.',
    });
  }
  return new APIError('FOUND', undefined, { Location: SIGN_IN_TO_VERIFY_PATH });
}

/**
 * Better Auth mails a verification link to any address posted here, signed
 * in or not. Only the row's own session may ask: otherwise anyone could mail
 * someone else, and the stamp the mail sets would restart their window.
 */
async function requireOwnResend(ctx: HookContext): Promise<void> {
  const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
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

  const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
  if (!session) throw refuseSignedOut(ctx);
  if (session.user.email.toLowerCase() !== claims.email.toLowerCase()) {
    throw refuseVerification(
      ctx,
      'SIGN_IN_TO_VERIFY',
      'Open the link from a browser signed in to this account.',
    );
  }
  // A lapsed row holding the address goes first, as it would on a callback.
  try {
    await sweepProvisionalAccounts();
  } catch (error) {
    ctx.context.logger.error('provisional-account sweep failed', error);
  }
  if (await isEmailHeldByAnother(claims.updateTo, session.user.id)) {
    throw refuseVerification(ctx, 'EMAIL_TAKEN', 'That address is held by another account.');
  }
  await actingUser.set(session.user.id);
}

// /api/auth/* is the one exception to the GraphQL-only rule (CLAUDE.md rule 1).
export const auth = betterAuth({
  secret: authSecret(),
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
  plugins: [lastLoginMethod({ cookieName: LAST_USED_PROVIDER_COOKIE })],
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
      const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
      await send(
        await verifyEmailMessage({
          to: user.email,
          url: link.href,
          providers: accounts.map((account) => account.providerId as ProviderId),
        }),
      );
    },
    // Only from a browser signed in to this very account. Without it, a
    // stranger's sign-up carrying your address is verified by your click on a
    // mail you never asked for.
    beforeEmailVerification: async (user) => {
      const ctx = getCurrentAuthEndpointContext();
      const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
      if (!session) throw refuseSignedOut(ctx as HookContext);
      if (session.user.id !== user.id) {
        throw refuseVerification(
          ctx as HookContext,
          'SIGN_IN_TO_VERIFY',
          'Open the link from a browser signed in to this account.',
        );
      }
      await actingUser.set(user.id);
    },
    // Only for the row a gate admitted: this one's, or `gateEmailChange`'s for
    // a change link, which Better Auth calls it on without the check above.
    afterEmailVerification: async (user) => {
      if (!(await hasRequestState()) || (await actingUser.get()) !== user.id) return;
      // The adapter returns the whole row; the hook's type omits additionalFields.
      const { role } = user as typeof user & { role: UserRole };
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
      try {
        const swept = await sweepProvisionalAccounts();
        if (swept.length > 0) {
          ctx.context.logger.info(`provisional accounts swept: ${swept.join(', ')}`);
        }
      } catch (error) {
        ctx.context.logger.error('provisional-account sweep failed', error);
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;
      if (ctx.path !== '/callback/:id' || !newSession) return;

      const { user } = newSession;
      const outcome = await promotePrimaryAdmin(
        { userId: user.id, role: user.role as UserRole },
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
        const role: UserRole = outcome === 'promoted' ? 'admin' : (user.role as UserRole);
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
