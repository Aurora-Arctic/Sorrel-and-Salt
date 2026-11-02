import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionState } from '@/lib/session';

// Better Auth's own reading of the cookie is request-session.test.ts's
// subject; here it is the seam the context calls through.
const sessionStateFromHeaders = vi.fn<(headers: Headers) => Promise<SessionState>>();
vi.mock('@/lib/request-session', () => ({ sessionStateFromHeaders }));

/** The state Better Auth's reading would give for `session`. */
const stateOf = (
  session: Session | null,
  accessPause?: SessionState['accessPause'],
): SessionState => ({
  session,
  emailVerified: session !== null,
  termsAgreed: session !== null,
  sessionFresh: false,
  ...(accessPause && { accessPause }),
});

const { createContext } = await import('@/graphql/context');

function request(cookie?: string) {
  return new Request('http://localhost/api/graphql', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  sessionStateFromHeaders.mockReset();
});

describe('the GraphQL request context', () => {
  it("carries the session read from the request's own headers", async () => {
    const session: Session = { userId: 'user-a', role: 'user' };
    sessionStateFromHeaders.mockResolvedValue(stateOf(session));
    const incoming = request('better-auth.session_token=abc');

    const context = await createContext({ request: incoming });

    expect(sessionStateFromHeaders).toHaveBeenCalledWith(incoming.headers);
    expect(context.session).toEqual(session);
  });

  it('carries a null session for a signed-out request rather than refusing it', async () => {
    sessionStateFromHeaders.mockResolvedValue(stateOf(null));

    const context = await createContext({ request: request() });

    expect(context.session).toBeNull();
  });

  it('carries no session for a paused user, and the pause in its place', async () => {
    const until = new Date('2030-01-01T00:00:00.000Z');
    sessionStateFromHeaders.mockResolvedValue(
      stateOf({ userId: 'user-a', role: 'user' }, { until }),
    );

    const context = await createContext({ request: request('better-auth.session_token=abc') });

    expect(context.session).toBeNull();
    expect(context.accessPause).toEqual({ until });
  });

  it('exposes loaders, and a fresh set for every request', async () => {
    sessionStateFromHeaders.mockResolvedValue(stateOf(null));

    const first = await createContext({ request: request() });
    const second = await createContext({ request: request() });

    expect(first.loaders).toBeTypeOf('object');
    expect(second.loaders).not.toBe(first.loaders);
  });
});
