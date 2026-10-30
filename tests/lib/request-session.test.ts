import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// The helper turns Better Auth's session into the service-level `Session` and nothing more.
// Better Auth is mocked: whether a cookie is a real session is its job, and
// tests/e2e/route-protection.spec.ts proves it end to end against the built server.

const getSessionMock = vi.fn();
const listUserAccountsMock = vi.fn();
let requestHeaders = new Headers();

vi.mock('@/lib/auth', () => ({
  auth: {
    api: { getSession: getSessionMock, listUserAccounts: listUserAccountsMock },
    $context: Promise.resolve({ sessionConfig: { freshAge: 24 * 60 * 60 } }),
  },
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
  notFound: () => {
    throw new Error('not-found');
  },
}));
// The coven lookup is the service's, proved against Postgres in
// tests/modules/coven/services/workspace-by-slug.test.ts; here only how the
// helper answers its refusal.
const membershipBySlugMock = vi.fn();
vi.mock('@/modules/coven', () => ({ membershipBySlug: membershipBySlugMock }));

const {
  getSession,
  hasPassword,
  linkedAccounts,
  requireAdminSession,
  requireCuratorSession,
  requireCovenMembership,
  requireSession,
  requireSignedIn,
  sessionFromHeaders,
  sessionIsFresh,
  sessionIsVerified,
} = await import('@/lib/request-session');
const { auth } = await import('@/lib/auth');
const { Forbidden } = await import('@/lib/errors');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

function betterAuthSession(role: unknown, emailVerified = true, createdAt = new Date()) {
  return {
    session: { id: 's', token: 't', userId: USER_ID, expiresAt: new Date(), createdAt },
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

  it('maps a session to the service-level one', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('admin'));
    // Exactly these two fields: the service session carries nothing else.
    await expect(getSession()).resolves.toEqual({ userId: USER_ID, role: 'admin' });
  });

  // `role` reaches here as Better Auth's plain string. A value outside the
  // column's enum is a bug somewhere upstream, and quietly reading it as
  // 'user' would hide it; which values are roles is tests/lib/session-role.test.ts's.
  it('refuses a role the column does not hold', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('owner'));
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
});

// The shell's half of `requireSession()`: a layout that throws the email redirect while the
// browser navigates into it never settles, so this one sends only a signed-out visitor away.
describe('requireSignedIn', () => {
  it('returns an unverified account’s session on a page that is not the email page', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user', false));
    requestHeaders.set(RETURN_PATH_HEADER, '/coven');

    await expect(requireSignedIn()).resolves.toEqual({ userId: USER_ID, role: 'user' });
    // The same request is one `requireSession()` sends away, so it is the
    // missing email check, not the path, that let it through.
    await expect(requireSession()).rejects.toThrow('redirect:/account/email?next=%2Fcoven');
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

  // An unverified account is provisional and can do nothing else, so every page but the email
  // page sends it there, with its own path to come back to once the address is proved.
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

    it('reaches the email page itself, whatever its query', async () => {
      requestHeaders.set(RETURN_PATH_HEADER, '/account/email?next=%2Fcoven&error=TOKEN_EXPIRED');

      await expect(requireSession()).resolves.toEqual({ userId: USER_ID, role: 'user' });
    });
  });
});

// The `/admin` guard: a signed-in non-admin is answered with Next's 403 page rather than a
// redirect or a 404, since everyone knows the path exists (claude-docs/auth/admin-guard.md, "The admin guard").
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

  // The people pages keep this guard, so a curator is refused there.
  it('answers a curator with the forbidden page, whom the curation guard admits', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('curator'));

    await expect(requireCuratorSession()).resolves.toEqual({ userId: USER_ID, role: 'curator' });
    await expect(requireAdminSession()).rejects.toThrow('forbidden');
  });
});

// The guard on `/admin` and every curation page under it, the people pages excepted. A curator
// or an admin passes; anyone else gets the forbidden page, as at requireAdminSession
// (claude-docs/auth/admin-guard.md).
describe('requireCuratorSession', () => {
  it.each([
    ['a curator', 'curator'],
    ['an admin', 'admin'],
  ])('returns the session of %s', async (_who, role) => {
    getSessionMock.mockResolvedValue(betterAuthSession(role));

    await expect(requireCuratorSession()).resolves.toEqual({ userId: USER_ID, role });
  });

  it('answers a signed-in user who holds no site role with the forbidden page', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    requestHeaders.set(RETURN_PATH_HEADER, '/admin');

    await expect(requireSession()).resolves.toEqual({ userId: USER_ID, role: 'user' });
    await expect(requireCuratorSession()).rejects.toThrow('forbidden');
  });
});

// What the account page lists: Better Auth's own account rows, by the row id
// /unlink-account takes and the provider they sign in through.
const row = (id: string, providerId: string) => ({
  id,
  providerId,
  accountId: `${providerId}-account`,
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  scopes: [],
});

describe('linkedAccounts', () => {
  it('asks Better Auth with the request headers and keeps the row id and provider', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'discord'), row('a-2', 'microsoft')]);

    await expect(linkedAccounts()).resolves.toEqual([
      { id: 'a-1', providerId: 'discord' },
      { id: 'a-2', providerId: 'microsoft' },
    ]);
    expect(listUserAccountsMock).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  // A password has its own section, and a provider the roster cannot name no line on the page.
  it('leaves out the password and a provider outside the roster', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'google'), row('a-2', 'credential')]);

    await expect(linkedAccounts()).resolves.toEqual([{ id: 'a-1', providerId: 'google' }]);
  });
});

// The account page changes a password the account holds and sets one it does not.
describe('hasPassword', () => {
  it('is true when Better Auth holds a password row for the account', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'google'), row('a-2', 'credential')]);

    await expect(hasPassword()).resolves.toBe(true);
    expect(listUserAccountsMock).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it('is false for an account with providers alone', async () => {
    listUserAccountsMock.mockResolvedValue([row('a-1', 'google'), row('a-2', 'discord')]);

    await expect(hasPassword()).resolves.toBe(false);
  });
});

// The account page withholds Remove on a session older than Better Auth's freshness window,
// which /unlink-account would refuse anyway: the same check, made before the button is offered.
describe('sessionIsFresh', () => {
  const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  it('is true for a session younger than the freshness window', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    await expect(sessionIsFresh()).resolves.toBe(true);
  });

  it('is false for a session older than it, and with no session at all', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user', true, TWO_DAYS_AGO));
    await expect(sessionIsFresh()).resolves.toBe(false);
    getSessionMock.mockResolvedValue(null);
    await expect(sessionIsFresh()).resolves.toBe(false);
  });

  it('is always true when the window is turned off, as Better Auth reads 0', async () => {
    const config = (await auth.$context).sessionConfig;
    const window = config.freshAge;
    config.freshAge = 0;
    try {
      getSessionMock.mockResolvedValue(betterAuthSession('user', true, TWO_DAYS_AGO));
      await expect(sessionIsFresh()).resolves.toBe(true);
    } finally {
      config.freshAge = window;
    }
  });
});

// The `/coven/[slug]` guard: a slug that names no coven the user is in is a 404, not a 403. A slug
// is a guess at someone's private data, so the answer must not confirm it exists
// (claude-docs/auth/coven-guard.md).
describe('requireCovenMembership', () => {
  beforeEach(() => {
    membershipBySlugMock.mockReset();
  });

  it('returns the workspace and proof the service admits a member with', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    const admitted = { workspace: { id: 'w' }, membership: { workspaceId: 'w' } };
    membershipBySlugMock.mockResolvedValue(admitted);

    await expect(requireCovenMembership('whitethorn-coven')).resolves.toBe(admitted);
    expect(membershipBySlugMock).toHaveBeenCalledWith(
      { userId: USER_ID, role: 'user' },
      'whitethorn-coven',
    );
  });

  it('answers the service refusing with the 404, never the forbidden page', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    membershipBySlugMock.mockRejectedValue(new Forbidden());

    await expect(requireCovenMembership('whitethorn-coven')).rejects.toThrow('not-found');
  });

  it('lets any other failure through as itself', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user'));
    membershipBySlugMock.mockRejectedValue(new Error('database down'));

    await expect(requireCovenMembership('whitethorn-coven')).rejects.toThrow('database down');
  });
});

// The front page offers an unverified account the email page rather than a page
// that would send it there, so it asks the same per-request lookup.
describe('sessionIsVerified', () => {
  it('is true for a verified address, false for an unverified one and with no session', async () => {
    getSessionMock.mockResolvedValue(betterAuthSession('user', true));
    await expect(sessionIsVerified()).resolves.toBe(true);
    getSessionMock.mockResolvedValue(betterAuthSession('user', false));
    await expect(sessionIsVerified()).resolves.toBe(false);
    getSessionMock.mockResolvedValue(null);
    await expect(sessionIsVerified()).resolves.toBe(false);
  });
});
