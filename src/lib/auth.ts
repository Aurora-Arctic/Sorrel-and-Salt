import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db.md, "Who may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { users } from '../db/schema/users';
import { sessions, accounts, verifications } from '../db/schema/auth';

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
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
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

// DESIGN.md §5's admin bootstrap; case-insensitive, and unset promotes nobody.
function isAdminBootstrapEmail(email: string): boolean {
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  return !!bootstrapEmail && email.toLowerCase() === bootstrapEmail.toLowerCase();
}

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
  user: {
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
              ...(isAdminBootstrapEmail(user.email) ? { role: 'admin' } : {}),
            },
          };
        },
      },
    },
  },
});
