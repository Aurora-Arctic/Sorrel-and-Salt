import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// The helper turns Better Auth's session into the service-level `Session` and
// nothing more. Better Auth itself is mocked: whether a cookie is a real
// session is its job, and e2e/route-protection.spec.ts proves it end to end
// against the built server.

const getSessionMock = vi.fn();
let requestHeaders = new Headers();

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: getSessionMock } } }));
vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));
// Next's own redirect throws a framework error the router catches; this one
// throws something a test can read the destination off.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { getSession, requireSession } = await import('@/lib/request-session');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

function betterAuthSession(role: unknown) {
  return {
    session: { id: 's', token: 't', userId: USER_ID, expiresAt: new Date() },
    user: { id: USER_ID, email: 'fixture@example.test', name: 'Fixture', role },
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
  requestHeaders = new Headers({ cookie: 'better-auth.session_token=t.s' });
});

describe('getSession', () => {
  it('hands Better Auth the request headers, cookie included', async () => {
    getSessionMock.mockResolvedValue(null);
    await getSession();
    expect(getSessionMock).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it('is null when there is no session', async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });

  it.each(['user', 'admin'] as const)('maps a %s to the service-level session', async (role) => {
    getSessionMock.mockResolvedValue(betterAuthSession(role));
    // Exactly these two fields: the service session carries nothing else.
    await expect(getSession()).resolves.toEqual({ userId: USER_ID, role });
  });

  // `role` reaches here as Better Auth's plain string. A value outside the
  // column's enum is a bug somewhere upstream, and quietly reading it as
  // 'user' would hide it.
  it.each([undefined, null, 'owner', 'ADMIN'])('refuses a role of %s', async (role) => {
    getSessionMock.mockResolvedValue(betterAuthSession(role));
    await expect(getSession()).rejects.toThrow(/role/);
  });
});

describe('requireSession', () => {
  it('returns the session when there is one, without redirecting', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    await expect(requireSession()).resolves.toEqual({ userId: USER_ID, role: 'user' });
  });

  // A cookie the proxy let through and Better Auth rejected — expired, revoked,
  // forged. The proxy forwarded the path, since a page cannot read its own URL.
  it('redirects to /sign-in with the return path the proxy forwarded', async () => {
    getSessionMock.mockResolvedValue(null);
    requestHeaders.set(RETURN_PATH_HEADER, '/coven/hearth/grimoire?tab=mine');

    await expect(requireSession()).rejects.toThrow(
      `redirect:/sign-in?next=${encodeURIComponent('/coven/hearth/grimoire?tab=mine')}`,
    );
  });

  it('falls back to / when no return path was forwarded', async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow('redirect:/sign-in?next=%2F');
  });

  it('does not trust a forwarded return path that leaves the site', async () => {
    getSessionMock.mockResolvedValue(null);
    requestHeaders.set(RETURN_PATH_HEADER, '//evil.example');
    await expect(requireSession()).rejects.toThrow('redirect:/sign-in?next=%2F');
  });
});
