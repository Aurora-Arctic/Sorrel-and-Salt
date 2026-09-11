import { describe, expect, it, beforeAll, vi, afterEach } from 'vitest';

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

// M2.4: real end-to-end confirmation (curling a running `next dev` with
// fake credentials) is recorded in claude-docs/transcripts/auth.md — this
// is the automatable slice of the same check, run through the route module
// directly rather than a live server.
describe('POST /api/auth/sign-in/social', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('redirects to the real Google authorization URL once GOOGLE_CLIENT_ID/SECRET are set', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      process.env.DATABASE_URL ?? 'postgres://sorrel:sorrel@localhost:5432/sorrel',
    );
    vi.stubEnv('BETTER_AUTH_SECRET', 'unit-test-secret');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
    vi.resetModules();
    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string };
    expect(body.url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
    expect(body.url).toContain('client_id=test-google-id');
    expect(body.url).toContain('redirect_uri=');
    expect(decodeURIComponent(body.url)).toContain('/api/auth/callback/google');
  });
});
