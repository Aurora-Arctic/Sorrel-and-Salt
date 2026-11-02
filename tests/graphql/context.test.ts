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

  describe('for a paused user', () => {
    const until = new Date('2030-01-01T00:00:00.000Z');
    const PAUSED: Session = { userId: 'user-a', role: 'user' };

    const contextFor = (query: string, operationName?: string) => {
      sessionStateFromHeaders.mockResolvedValue(stateOf(PAUSED, { until }));
      return createContext({
        request: request('better-auth.session_token=abc'),
        params: { query, operationName },
      });
    };

    it('carries no session for an operation outside support, and the pause in its place', async () => {
      const context = await contextFor('query { me { id } }');

      expect(context.session).toBeNull();
      expect(context.accessPause).toEqual({ until });
    });

    it('carries the session, and no pause, for an operation of the signed-in support form alone', async () => {
      for (const query of [
        'mutation Send($input: SupportRequestInput!) { sendSupportRequest(input: $input) { id } }',
        'query { supportDialogState { __typename } mine: mySupportRequests(first: 5) { totalCount } }',
        'mutation { sendSupportMessage(requestId: "r", body: "b") { id } }',
        'mutation { resolveMySupportRequest(id: "r") { id } }',
        'query { mySupportRequest(id: "r") { id } }',
      ]) {
        const context = await contextFor(query);
        expect(context.session, query).toEqual(PAUSED);
        expect(context.accessPause, query).toBeUndefined();
      }
    });

    it('carries no session when a support field shares the operation with any other', async () => {
      const context = await contextFor(
        'query { mySupportRequests(first: 5) { totalCount } me { id } }',
      );

      expect(context.session).toBeNull();
    });

    it('reads the operation named, of several in the document', async () => {
      const document =
        'query Mine { mySupportRequests(first: 5) { totalCount } } query Me { me { id } }';

      expect((await contextFor(document, 'Mine')).session).toEqual(PAUSED);
      expect((await contextFor(document, 'Me')).session).toBeNull();
    });

    it('carries no session for a support field reached through a fragment, or a document that does not parse', async () => {
      for (const query of [
        'query { ...F } fragment F on Query { mySupportRequests(first: 5) { totalCount } }',
        'query { mySupportRequests(',
      ]) {
        expect((await contextFor(query)).session, query).toBeNull();
      }
    });
  });

  it('exposes loaders, and a fresh set for every request', async () => {
    sessionStateFromHeaders.mockResolvedValue(stateOf(null));

    const first = await createContext({ request: request() });
    const second = await createContext({ request: request() });

    expect(first.loaders).toBeTypeOf('object');
    expect(second.loaders).not.toBe(first.loaders);
  });
});
