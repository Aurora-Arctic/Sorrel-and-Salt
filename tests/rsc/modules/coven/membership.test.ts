import { createElement, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-server-dom-webpack/server.edge';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import type { WorkspacePermission } from '@/services/access-control';
import { assertMembership } from '@/services/membership';
import { A, asUser } from '../../support/as-user';

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
const CREATE: WorkspacePermission = { spell: ['create'] };

interface Ask {
  session: Session;
  workspaceId: string;
  permission: WorkspacePermission;
}

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
  it('asks the repository once for a layout and a page on the same workspace', async () => {
    // Two `asUser(A)` calls are two objects: the key is the ids, not the
    // session a caller happens to hold.
    const wire = await render(
      tree(
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
      ),
    );

    // Why this could have passed: both components had to ask and both had
    // to be answered before one call can mean a shared one.
    expect(count(wire, `${WORKSPACE_W_ID}:owner`)).toBe(2);
    expect(findWorkspaceRole).toHaveBeenCalledTimes(1);
    expect(findWorkspaceRole).toHaveBeenCalledWith(A.id, WORKSPACE_W_ID);
  });

  it('shares the lookup between a read and a write permission', async () => {
    const wire = await render(
      tree(
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: CREATE },
      ),
    );

    expect(count(wire, `${WORKSPACE_W_ID}:owner`)).toBe(2);
    expect(findWorkspaceRole).toHaveBeenCalledTimes(1);
  });

  it('looks each workspace up on its own', async () => {
    const wire = await render(
      tree(
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
        { session: asUser(A), workspaceId: WORKSPACE_X_ID, permission: READ },
      ),
    );

    expect(count(wire, `${WORKSPACE_W_ID}:owner`)).toBe(1);
    expect(count(wire, `${WORKSPACE_X_ID}:owner`)).toBe(1);
    expect(findWorkspaceRole).toHaveBeenCalledTimes(2);
  });

  it('starts the next request from nothing', async () => {
    const same = () =>
      tree(
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
        { session: asUser(A), workspaceId: WORKSPACE_W_ID, permission: READ },
      );

    await render(same());
    await render(same());

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
