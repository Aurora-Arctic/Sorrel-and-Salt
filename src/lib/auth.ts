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
// with a Host outside all three patterns. Scoped to production only, same
// as `authSecret()` above — `next dev`/Vitest keep Better Auth's default
// permissive per-request origin, no allowlist friction locally.
function baseURL(): BetterAuthOptions['baseURL'] {
  if (process.env.NODE_ENV !== 'production') return undefined;
  return {
    allowedHosts: ['sorrelandsalt.com', 'staging.sorrelandsalt.com', 'hotfix-*.sorrelandsalt.com'],
    fallback: 'https://sorrelandsalt.com',
    // Every real deployment is Vercel-fronted HTTPS; forcing this avoids
    // depending on x-forwarded-proto / advanced.trustedProxyHeaders (unset
    // here) to get the scheme right, rather than trusting 'auto'.
    protocol: 'https',
  };
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
});
