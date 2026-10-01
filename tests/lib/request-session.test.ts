import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// The helper turns Better Auth's session into the service-level `Session` and
// nothing more. Better Auth itself is mocked: whether a cookie is a real
// session is its job, and tests/e2e/route-protection.spec.ts proves it end to end
// against the built server.

const getSessionMock = vi.fn();
const listUserAccountsMock = vi.fn();
let requestHeaders = new Headers();

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: getSessionMock, listUserAccounts: listUserAccountsMock } },
}));
vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));
// Next's own redirect and forbidden throw framework errors the router catches;
// these throw something a test can read the outcome off.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  forbidden: () => {
    throw new Error('forbidden');
  },
}));

const { getSession, linkedAccounts, requireAdminSession, requireSession, sessionFromHeaders } =
  await import('@/lib/request-session');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

function betterAuthSession(role: unknown, emailVerified = true) {
  return {
    session: { id: 's', token: 't', userId: USER_ID, expiresAt: new Date() },
    user: { id: USER_ID, email: 'fixture@example.test', name: 'Fixture', role, emailVerified },
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
  listUserAccountsMock.mockReset();
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

// The proxy has no `headers()` to call; it hands over the request's own.
describe('sessionFromHeaders', () => {
  it('asks Better Auth with the headers it is given, not the ambient request', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('admin'));
    const given = new Headers({ cookie: 'better-auth.session_token=other.s' });

    await expect(sessionFromHeaders(given)).resolves.toEqual({ userId: USER_ID, role: 'admin' });
    expect(getSessionMock).toHaveBeenCalledWith({ headers: given });
  });

  it('is null when there is no session', async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(sessionFromHeaders(new Headers())).resolves.toBeNull();
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

  // With none, the sign-in lands by role, which is the callback's to decide.
  it('sends the visitor to the bare sign-in page when no return path was forwarded', async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow(/^redirect:\/sign-in$/);
  });

  it('does not trust a forwarded return path that leaves the site', async () => {
    getSessionMock.mockResolvedValue(null);
    requestHeaders.set(RETURN_PATH_HEADER, '//evil.example');
    await expect(requireSession()).rejects.toThrow(/^redirect:\/sign-in$/);
  });

  // An unverified account is provisional and can do nothing else (MB.54), so
  // every page but the email page sends it there, with its own path to come
  // back to once the address is proved.
  describe('an unverified account', () => {
    beforeEach(() => {
      getSessionMock.mockResolvedValue(betterAuthSession('user', false));
    });

    it('is sent to the email page with the return path the proxy forwarded', async () => {
      requestHeaders.set(RETURN_PATH_HEADER, '/coven/hearth?tab=mine');

      await expect(requireSession()).rejects.toThrow(
        `redirect:/account/email?next=${encodeURIComponent('/coven/hearth?tab=mine')}`,
      );
    });

    it('is sent to the bare email page when no return path was forwarded, or one that leaves the site', async () => {
      await expect(requireSession()).rejects.toThrow(/^redirect:\/account\/email$/);

      requestHeaders.set(RETURN_PATH_HEADER, '//evil.example');
      await expect(requireSession()).rejects.toThrow(/^redirect:\/account\/email$/);
    });

    it('reaches the email page itself, whatever its query', async () => {
      requestHeaders.set(RETURN_PATH_HEADER, '/account/email?next=%2Fcoven&error=TOKEN_EXPIRED');

      await expect(requireSession()).resolves.toEqual({ userId: USER_ID, role: 'user' });
    });

    it('is not let past by a path that merely starts like the email page', async () => {
      requestHeaders.set(RETURN_PATH_HEADER, '/account/emails');

      await expect(requireSession()).rejects.toThrow(
        'redirect:/account/email?next=%2Faccount%2Femails',
      );
    });
  });
});

// The `/admin` guard (M5.4): a signed-in non-admin is answered with Next's 403
// page rather than a redirect or a 404, since everyone knows the path exists
// (claude-docs/auth/admin-guard.md, "The admin guard").
describe('requireAdminSession', () => {
  it('returns the session of an admin, without redirecting or refusing', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('admin'));
    await expect(requireAdminSession()).resolves.toEqual({ userId: USER_ID, role: 'admin' });
  });

  it('answers a signed-in user who is not an admin with the forbidden page', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    requestHeaders.set(RETURN_PATH_HEADER, '/admin');

    // Why the refusal could have been anything else: the session is live and
    // verified, so requireSession() lets it through, and only the role differs
    // from the admin above.
    await expect(requireSession()).resolves.toEqual({ userId: USER_ID, role: 'user' });
    await expect(requireAdminSession()).rejects.toThrow('forbidden');
  });

  it('sends a signed-out visitor to /sign-in with the return path, not to the forbidden page', async () => {
    getSessionMock.mockResolvedValue(null);
    requestHeaders.set(RETURN_PATH_HEADER, '/admin?tab=forms');

    await expect(requireAdminSession()).rejects.toThrow(
      `redirect:/sign-in?next=${encodeURIComponent('/admin?tab=forms')}`,
    );
  });

  // The role is not a way around the email page: a provisional account can do
  // nothing else, whatever its row says.
  it('sends an unverified admin to the email page first', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('admin', false));
    requestHeaders.set(RETURN_PATH_HEADER, '/admin');

    await expect(requireAdminSession()).rejects.toThrow(
      `redirect:/account/email?next=${encodeURIComponent('/admin')}`,
    );
  });
});

// What the account page lists: Better Auth's own account rows, by the row id
// /unlink-account takes and the provider they sign in through.
describe('linkedAccounts', () => {
  const row = (id: string, providerId: string) => ({
    id,
    providerId,
    accountId: `${providerId}-account`,
    userId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    scopes: [],
  });

  it('asks Better Auth with the request headers and keeps the row id and provider', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'discord'), row('a-2', 'microsoft')]);

    await expect(linkedAccounts()).resolves.toEqual([
      { id: 'a-1', providerId: 'discord' },
      { id: 'a-2', providerId: 'microsoft' },
    ]);
    expect(listUserAccountsMock).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  // Nothing registers one today; a row the roster cannot name has no line on the page.
  it('leaves out a provider outside the roster', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'google'), row('a-2', 'credential')]);

    await expect(linkedAccounts()).resolves.toEqual([{ id: 'a-1', providerId: 'google' }]);
  });
});
