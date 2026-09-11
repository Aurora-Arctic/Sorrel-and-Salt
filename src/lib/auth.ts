import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/connection';
import { users } from '../db/schema/users';
import { sessions, accounts, verifications } from '../db/schema/auth';

// Better Auth's own "throw if this is unset in production" check
// (validateSecret in its context module) runs inside an async context
// builder that something swallows rather than surfacing — verified by
// building and serving this route with BETTER_AUTH_SECRET unset: it logs
// `[Error [BetterAuthError]: You are using the default secret...]` but the
// server still answers 200 with the well-known default secret live. Not
// safe to depend on, so this enforces it ourselves, synchronously, before
// betterAuth() is ever called — same "no default, no silent fallback" rule
// src/db/connection.ts applies to DATABASE_URL. Scoped to `NODE_ENV ===
// 'production'` (true for any `next build`/`next start`, not just a real
// deploy) rather than always, so `next dev` and Vitest (NODE_ENV=test)
// don't need it set at all.
function authSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }
  return secret;
}

// M2.4/M2.5: Google/GitHub are only registered when their client id+secret
// are both present, never with an empty string — matching M0.27's "no
// credentials required to run tests locally" and letting `next dev` run
// with neither provider configured (no sign-in works, but nothing throws).
// The site is invite-gated on top of this regardless (CLAUDE.md's Domain
// invariants) — a successful OAuth sign-in only ever earns an account, not
// workspace access.
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

// Production spans three actual origins — sorrelandsalt.com, the fixed
// staging.sorrelandsalt.com alias, and one hotfix-<slug>.sorrelandsalt.com
// per open hotfix PR (deploy.yml) — so a single BETTER_AUTH_URL env var
// can't cover all of them: Vercel's Preview scope applies uniformly, and
// staging's own value would leak into every hotfix preview's OAuth
// callbacks. `allowedHosts` (wildcards supported) is Better Auth's own
// answer to exactly this; `fallback` only matters if a request arrives
// with a Host outside all three patterns.
//
// Outside production, an explicit `http://localhost:8000` — not left
// unset for Better Auth's own per-request derivation — because `next dev
// --hostname 0.0.0.0` (this repo's fixed `dev` script, every environment)
// computes the request's origin from its own bind address rather than the
// client's `Host` header: confirmed by curling a running dev server with
// `localhost`, `127.0.0.1`, and a spoofed `Host` header and getting
// `http://0.0.0.0:8000` back every time. Left as Better Auth's default,
// every local OAuth `redirect_uri` would be `0.0.0.0:8000`, which doesn't
// match `http://localhost:8000/...` — what's actually registered with
// Google/GitHub (`claude-docs/secrets.md`) — and sign-in would fail with
// `redirect_uri_mismatch`. `next dev`'s port is fixed at 8000 (no `PORT`
// override in that script, unlike `start`), so this is safe to hardcode.
function baseURL(): BetterAuthOptions['baseURL'] {
  if (process.env.NODE_ENV === 'production') {
    return {
      allowedHosts: [
        'sorrelandsalt.com',
        'staging.sorrelandsalt.com',
        'hotfix-*.sorrelandsalt.com',
      ],
      fallback: 'https://sorrelandsalt.com',
      // Every real deployment is Vercel-fronted HTTPS; forcing this avoids
      // depending on x-forwarded-proto / advanced.trustedProxyHeaders
      // (unset here) to get the scheme right, rather than trusting 'auto'.
      protocol: 'https',
    };
  }
  return 'http://localhost:8000';
}

// M2.3: DESIGN.md §5's admin bootstrap. Compared case-insensitively since
// email providers don't treat casing as significant; unset means no sign-in
// is ever promoted, which is the correct state for `next dev` and tests.
function isAdminBootstrapEmail(email: string): boolean {
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  return !!bootstrapEmail && email.toLowerCase() === bootstrapEmail.toLowerCase();
}

// The OAuth handshake this mounts at /api/auth/* is the one exception to the
// GraphQL-only access rule (CLAUDE.md rule 1) — see claude-docs/auth.md for
// the boundary.
export const auth = betterAuth({
  secret: authSecret(),
  baseURL: baseURL(),
  socialProviders: socialProviders(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  // Matches users.id's uuid type (src/db/schema/users.ts) so every FK this
  // schema and later tables add lines up without a type cast.
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  user: {
    additionalFields: {
      // `input: false` on all four — CLAUDE.md's "No API or UI path
      // grants admin" and "Nothing in the OAuth flow sets the flag":
      // Better Auth drops any client-supplied value for a field with
      // input disabled, so only the server-side hook below can set them.
      // No `defaultValue` here on purpose — an unset value is omitted
      // from the INSERT entirely, leaving Postgres's own column default
      // (`user`/`false`, src/db/schema/users.ts) to apply for the
      // ordinary case instead of duplicating it in two places.
      role: { type: 'string', input: false },
      canCreateWorkspace: { type: 'boolean', input: false },
      // NOT NULL with no database default (src/db/audit.ts) — every
      // insert must supply these, so unlike role/canCreateWorkspace they
      // can't be left for Postgres to default.
      createdBy: { type: 'string', input: false, returned: false },
      updatedBy: { type: 'string', input: false, returned: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // A new user has no pre-existing creator to stamp createdBy/
        // updatedBy with — there is no session yet, because this *is* how
        // one comes to exist, so it can't go through withAudit(session,
        // fn) like every other write (CLAUDE.md rule 3). It's its own
        // creator instead, the same self-satisfying pattern MB.5 uses for
        // the seed bootstrap row. `forceAllowId` (Better Auth's own
        // createWithHooks) lets a uuid generated here become the row's
        // real id instead of Postgres's default, so createdBy/updatedBy
        // can reference it before the row exists.
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
