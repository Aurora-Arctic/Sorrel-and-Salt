import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// Better Auth's own reading of the cookie is request-session.test.ts's
// subject; here it is the seam the context calls through.
const sessionFromHeaders = vi.fn<(headers: Headers) => Promise<Session | null>>();
vi.mock('@/lib/request-session', () => ({ sessionFromHeaders }));

const { createContext } = await import('@/graphql/context');

function request(cookie?: string) {
  return new Request('http://localhost/api/graphql', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  sessionFromHeaders.mockReset();
});

describe('the GraphQL request context', () => {
  it("carries the session read from the request's own headers", async () => {
    const session: Session = { userId: 'user-a', role: 'user' };
    sessionFromHeaders.mockResolvedValue(session);
    const incoming = request('better-auth.session_token=abc');

    const context = await createContext({ request: incoming });

    expect(sessionFromHeaders).toHaveBeenCalledWith(incoming.headers);
    expect(context.session).toEqual(session);
  });

  it('carries a null session for a signed-out request rather than refusing it', async () => {
    sessionFromHeaders.mockResolvedValue(null);

    const context = await createContext({ request: request() });

    expect(context.session).toBeNull();
  });

  it('exposes loaders, and a fresh set for every request', async () => {
    sessionFromHeaders.mockResolvedValue(null);

    const first = await createContext({ request: request() });
    const second = await createContext({ request: request() });

    expect(first.loaders).toBeTypeOf('object');
    expect(second.loaders).not.toBe(first.loaders);
  });
});
