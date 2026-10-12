import { createElement, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-server-dom-webpack/server.edge';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { type WorkspacePermission, assertMembership } from '@/modules/coven';
import { A, asUser } from '../../../support/as-user';
import type { Ask } from './types';

// The server read path, observed from where it happens: React's `cache()`
// memoises only while the Flight renderer is running, so the dedupe cannot be
// seen from a plain call. A repository call is a Postgres round trip (CLAUDE.md
// rule 2 — nothing else holds the client), so the repository is mocked and its
// calls are what get counted.

const { findWorkspaceRole } = vi.hoisted(() => ({
  findWorkspaceRole: vi.fn(async () => 'owner' as const),
}));
// The whole module, not `importOriginal`: the real one opens connection.ts,
// and this project has no database.
vi.mock('@/db/repository', () => ({ findWorkspaceRole }));

const READ: WorkspacePermission = { workspace: ['read'] };

/** What a page does: check, then render from the proof. */
async function Page({ session, workspaceId, permission }: Ask) {
  const membership = await assertMembership(session, workspaceId, permission);
  return createElement('p', null, `${workspaceId}:${membership.role}`);
}

/** What a layout does: the same check, around whatever it wraps. */
async function Layout({ children, ...ask }: Ask & { children?: ReactNode }) {
  const membership = await assertMembership(ask.session, ask.workspaceId, ask.permission);
  return createElement('div', null, `${ask.workspaceId}:${membership.role}`, children);
}

/** A layout around a page, each asking its own question. */
function tree(layout: Ask, page: Ask) {
  return createElement(Layout, layout, createElement(Page, page));
}

/** One request: the Flight wire text, with any render error rethrown. */
async function render(model: ReactNode): Promise<string> {
  const errors: unknown[] = [];
  const stream = renderToReadableStream(model, {}, { onError: (error) => errors.push(error) });
  const text = await new Response(stream).text();
  if (errors.length > 0) throw errors[0];
  return text;
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

beforeEach(() => {
  findWorkspaceRole.mockClear();
});

describe('assertMembership inside one server render', () => {
  // Two renders of a layout and a page that each ask: four calls uncached,
  // one if the cache outlived its request, two only when each render shares
  // one lookup and the next starts from nothing. Two `asUser(A)` calls are two
  // objects, so the key is the ids, not the session a caller happens to hold.
  it('asks once per render, and starts the next request from nothing', async () => {
    const same = () =>
      tree(
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
      );

    const wire = await render(same());
    await render(same());

    // Why this could have passed: both components asked and were answered.
    expect(count(wire, `${WORKSPACE_W_ID}:owner`)).toBe(2);
    expect(findWorkspaceRole).toHaveBeenCalledTimes(2);
  });
});

// Outside a render there is no request scope for `cache()` to hold anything
// in, and it is the plain function. That is the GraphQL route handler's case:
// its dedupe is the request's DataLoaders, not this.
describe('assertMembership outside a render', () => {
  it('asks the repository on every call', async () => {
    await assertMembership(asUser(A), WORKSPACE_W_ID, READ);
    await assertMembership(asUser(A), WORKSPACE_W_ID, READ);

    expect(findWorkspaceRole).toHaveBeenCalledTimes(2);
  });
});
