import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// Better Auth's drizzleAdapter takes the client itself rather than a writer, so
// this cannot go through withAudit — claude-docs/db.md, "Who may import the client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../db/connection';
import { users } from '../db/schema/users';
import { sessions, accounts, verifications } from '../db/schema/auth';

// Enforced here rather than left to Better Auth's own `validateSecret`, whose
// rejection is swallowed: with the secret unset it logs a BetterAuthError and
// still answers 200 using the well-known default. Production-only, since
// `next dev` and Vitest have no use for it.
// See claude-docs/auth.md, "Config".
function authSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }
  return secret;
}

// Registered only when id and secret are both present, never with an empty
// string, so `next dev` runs with neither provider configured. The site is
// invite-gated regardless: a successful sign-in earns an account and nothing
// else (CLAUDE.md's domain invariants).
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

// Resolved per request rather than from a `BETTER_AUTH_URL` env var: production
// spans three origins, and a single Preview-scoped variable would leak
// staging's URL into every hotfix preview's OAuth callbacks.
//
// Outside production the origin is fixed rather than derived, because
// `next dev --hostname 0.0.0.0` computes it from its own bind address and every
// local `redirect_uri` would come out as `0.0.0.0:8000` — not what is
// registered with Google/GitHub, so sign-in fails with `redirect_uri_mismatch`.
// See claude-docs/auth.md, "Config".
function baseURL(): BetterAuthOptions['baseURL'] {
  if (process.env.NODE_ENV === 'production') {
    return {
      allowedHosts: [
        'sorrelandsalt.com',
        'staging.sorrelandsalt.com',
        'hotfix-*.sorrelandsalt.com',
      ],
      fallback: 'https://sorrelandsalt.com',
      // Forced rather than trusting x-forwarded-proto: every real deployment is
      // Vercel-fronted HTTPS and `advanced.trustedProxyHeaders` is unset.
      protocol: 'https',
    };
  }
  return 'http://localhost:8000';
}

// DESIGN.md §5's admin bootstrap. Case-insensitive, since email providers do
// not treat casing as significant; unset means no sign-in is ever promoted.
function isAdminBootstrapEmail(email: string): boolean {
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  return !!bootstrapEmail && email.toLowerCase() === bootstrapEmail.toLowerCase();
}

// The OAuth handshake mounted at /api/auth/* is the one exception to the
// GraphQL-only access rule (CLAUDE.md rule 1) — claude-docs/auth.md states the
// boundary.
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
      // `input: false` on all four: Better Auth drops any client-supplied value
      // for such a field, so only the hook below can set them — CLAUDE.md's
      // "nothing in the OAuth flow sets the flag". No `defaultValue`, so an
      // unset value is omitted from the INSERT and Postgres's own column
      // default applies rather than being duplicated here.
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
        // One of the two identity bootstraps that write outside `withAudit`:
        // there is no session yet because this is how one comes to exist, so
        // the row stamps itself as its own creator (CLAUDE.md rule 3).
        // `forceAllowId` lets the uuid generated here become the row's real id,
        // so createdBy/updatedBy can reference it before the row exists.
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
