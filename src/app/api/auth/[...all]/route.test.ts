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
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/auth/ok'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

// M2.4: a `POST /api/auth/sign-in/social` test lived here briefly and broke
// CI — unlike `/ok`, that endpoint persists a `verifications` row (PKCE
// state) before redirecting, so it needs real schema. This `unit`-project
// test runs against the plain `sorrel` database (not a per-worker
// `sorrel_test_<n>` clone — only the `db` project's setupFiles rewrite
// DATABASE_URL for that), which has no schema applied in CI any more than
// `sorrel_template` does (`claude-docs/db.md` — not baked in until M1.27).
// It passed locally only because this session had already run
// `drizzle-kit migrate` against its own local `sorrel` by hand; CI's never
// has. `socialProviders()`'s tests (`src/lib/auth.test.ts`) already cover
// the config wiring without touching the database; the real authorization
// URL shape (real Google/GitHub redirect, PKCE params, callback path) was
// verified by hand against a running server and is recorded in
// `claude-docs/transcripts/auth.md` rather than re-asserted here.
