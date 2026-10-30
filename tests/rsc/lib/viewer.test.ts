import { createElement } from 'react';
import { AsyncLocalStorage } from 'node:async_hooks';
import { describe, expect, it, vi } from 'vitest';

// The viewer's own memberships, read once in a request however many readers ask. React's `cache()` memoises only inside the Flight renderer, so this renders;
// the shared read is asked after an `await`, which the renderer follows only through `AsyncLocalStorage`, a global Next sets on the server and Node does not, so it is set here first.

const SESSION = { userId: 'u1', role: 'user' } as const;
const { membershipsOf } = vi.hoisted(() => ({
  membershipsOf: vi.fn(async () => [
    [
      {
        role: 'member',
        workspace: { id: 'id-fixture-coven', slug: 'fixture-coven', name: 'Fixture Coven' },
      },
    ],
  ]),
}));
vi.mock('@/lib/request-session', () => ({
  getSession: async () => SESSION,
  requireSignedIn: async () => SESSION,
}));
vi.mock('@/modules/identity', () => ({
  getMe: async () => ({ name: 'Fixture Member', canCreateWorkspace: true, emailVerified: false }),
  countReceivedInvitations: async () => ({ totalCount: 0, countBefore: null }),
}));
vi.mock('@/modules/coven', () => ({
  membershipsOf,
  rolePermits: () => true,
  byCovenName: () => 0,
}));

Object.assign(globalThis, { AsyncLocalStorage });
const { renderToReadableStream } = await import('react-server-dom-webpack/server.edge');
const { covenRolesIfSignedIn, viewerIfSignedIn } = await import('@/lib/viewer');

async function Page() {
  const [shell, roles] = await Promise.all([viewerIfSignedIn(), covenRolesIfSignedIn()]);
  return createElement('p', null, `${shell?.workspaces.length}:${roles?.get('id-fixture-coven')}`);
}

async function render(): Promise<string> {
  const errors: unknown[] = [];
  const stream = renderToReadableStream(
    createElement(Page),
    {},
    {
      onError: (error) => errors.push(error),
    },
  );
  const text = await new Response(stream).text();
  if (errors.length > 0) throw errors[0];
  return text;
}

describe('the viewer and their roles inside one server render', () => {
  it('read the memberships once between them', async () => {
    const text = await render();

    // Both readers answered, so each did ask.
    expect(text).toContain('1:member');
    expect(membershipsOf).toHaveBeenCalledExactlyOnceWith(SESSION, ['u1']);
  });
});
