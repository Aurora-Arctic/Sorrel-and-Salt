import { describe, expect, it, beforeAll } from 'vitest';

// GraphQL is the only application-data path (CLAUDE.md rule 1); /api/auth/*
// is the one deliberate exception, for the OAuth handshake itself — see
// claude-docs/auth.md. `/ok` is Better Auth's own built-in health endpoint
// and never touches the database, so this exercises real route mounting
// without needing Postgres.
describe('GET /api/auth/*', () => {
  beforeAll(() => {
    process.env.DATABASE_URL ??= 'postgres://sorrel:sorrel@localhost:5432/sorrel';
    process.env.BETTER_AUTH_SECRET ??= 'unit-test-secret';
  });

  it('responds at /api/auth/ok instead of 404ing', async () => {
    const { GET } = await import('@/app/api/auth/[...all]/route');
    const response = await GET(new Request('http://localhost/api/auth/ok'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

// A `POST /api/auth/sign-in/social` test lived here briefly and broke CI.
// Unlike `/ok`, that endpoint persists a `verifications` row (PKCE state)
// before redirecting, so it needs real schema — and this `unit`-project test
// runs against the plain `sorrel` database, which nothing migrates in CI. Only
// the `db` project's setup rewrites DATABASE_URL to a seeded per-worker clone.
// It passed locally only because a hand-run `drizzle-kit migrate` had already
// reached this machine's own `sorrel`.
//
// `tests/lib/auth.test.ts` covers the config wiring without a database, and the
// real authorization URL shape was verified by hand against a running server —
// recorded in claude-docs/auth.md, "Config".
