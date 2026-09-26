import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  defineRequestState,
  getCurrentAuthEndpointContext,
  hasRequestState,
} from '@better-auth/core/context';
import { appendQueryParams } from '@better-auth/core/utils/url';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db.md, "Who may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { users } from '../db/schema/users';
import { sessions, accounts, verifications } from '../db/schema/auth';
import { SOCIAL_PROVIDERS, type ProviderId } from './social-providers';
// Server-only — see social-providers-config.ts's own header.
// oxlint-disable-next-line no-restricted-imports
import { clientCredentials } from './social-providers-config';
import type { UserRole } from './session';
import { send } from './mail';
import { verifyEmailMessage } from '../emails/verify-email';
import {
  promotePrimaryAdmin,
  type PrimaryAdminOutcome,
  type SignInProfile,
} from '../services/admin-role';
import {
  VERIFICATION_LIFETIME_SECONDS,
  extendVerificationWindow,
  sweepProvisionalAccounts,
} from '../services/provisional-accounts';

// Better Auth's own `validateSecret` is swallowed — with the secret unset it
// logs and still answers 200 on the well-known default. Production-only:
// `next dev` and Vitest have no use for it. See claude-docs/auth.md, "Config".
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
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};

  for (const provider of SOCIAL_PROVIDERS) {
    const credentials = clientCredentials(provider.id);
    if (!credentials) continue;

    // Neither vouches for an address (claude-docs/auth.md, "First-party
    // verification"), so a true users.emailVerified means Google, Discord or
    // our own mail did. Spread after the provider's own mapping, so it wins.
    if (provider.id === 'facebook') {
      providers.facebook = { ...credentials, mapProfileToUser: () => ({ emailVerified: false }) };
      continue;
    }

    if (provider.id === 'microsoft') {
      // Personal Microsoft accounts must be able to sign in, so the tenant is
      // stated explicitly rather than left to Better Auth's own "common"
      // default — a dependency bump silently narrowing that default would
      // otherwise fail every personal-account sign-in with no code change
      // here to review. The app registration itself must also allow personal
      // accounts (claude-docs/secrets.md); the tenant alone can't grant that.
      providers.microsoft = {
        ...credentials,
        tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
        mapProfileToUser: () => ({ emailVerified: false }),
      };
      continue;
    }

    providers[provider.id] = credentials;
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

// Names the primary admin (claude-docs/auth.md, "Admin bootstrap"). Required
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

// /api/auth/* is the one exception to the GraphQL-only rule (CLAUDE.md rule 1).
export const auth = betterAuth({
  secret: authSecret(),
  baseURL: baseURL(),
  socialProviders: socialProviders(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  // Matches users.id's uuid type so every FK lines up without a cast.
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  // Offered at sign-up, never required for a session: what needs a verified
  // address checks the column. claude-docs/auth.md, "First-party verification".
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: VERIFICATION_LIFETIME_SECONDS,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const ctx = getCurrentAuthEndpointContext();
      // A resend restarts the provisional window, but only from the row's own
      // session. A sign-up needs no touch: the insert has just set the clock.
      if (ctx.path === '/send-verification-email') {
        const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
        if (session?.user.id === user.id) await extendVerificationWindow({ userId: user.id });
      }
      const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
      await send(
        await verifyEmailMessage({
          to: user.email,
          url,
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
      if (session?.user.id !== user.id) {
        const callbackURL = ctx.query?.callbackURL;
        if (typeof callbackURL === 'string') {
          // Better Auth's own refusals on this endpoint redirect the same way.
          const params = new URLSearchParams({ error: 'SIGN_IN_TO_VERIFY' });
          throw new APIError('FOUND', undefined, {
            Location: appendQueryParams(callbackURL, params),
          });
        }
        throw new APIError('FORBIDDEN', {
          code: 'SIGN_IN_TO_VERIFY',
          message: 'Open the link from a browser signed in to this account.',
        });
      }
      await actingUser.set(user.id);
    },
  },
  user: {
    // Off, pinned by test: on, a user could move the primary admin's address
    // to another account. An email changes through MB.54's verified flow.
    changeEmail: { enabled: false },
    // Never refuses: it only records what the provider said, for the hook below.
    validateUserInfo: async ({ user, source }) => {
      if (source.method !== 'oauth' || !source.oauth) return;
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
        before: async (_patch, ctx) => {
          const actor =
            ((await hasRequestState()) ? await actingUser.get() : undefined) ??
            ctx?.context.session?.user.id;
          if (!actor) return;
          return { data: { updatedBy: actor } };
        },
      },
    },
  },
});
