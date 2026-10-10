import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/users` page (MB.52): the guard, then the two identity reads, the
// search parameters turned into the filter and the page, and the pager's
// links keeping the filter. The guard and the services are mocked: what they
// decide is tests/lib/request-session.test.ts's and
// tests/modules/identity/services/user-list.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

// The rows' Approval controls hold the router, which only a mounted app provides.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const listUsers = vi.fn();
const providersOf = vi.fn();
const isPrimaryAdmin = vi.fn();
const adminRoleChangePauseState = vi.fn();
vi.mock('@/modules/identity', () => ({
  adminRoleChangePauseState,
  isPrimaryAdmin,
  listUsers,
  providersOf,
}));

const { default: AdminUsersPage } = await import('@/app/admin/users/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const user = (index: number) => ({
  id: `00000000-0000-0000-0000-0000000000${String(index).padStart(2, '0')}`,
  name: `Listed Fixture ${String(index).padStart(2, '0')}`,
  email: `listed-${index}@users.test`,
  role: 'user',
  canCreateWorkspace: false,
  createdAt: new Date('2026-03-04T05:06:07Z'),
  emailVerified: true,
});

const entry = (index: number) => {
  const node = user(index);
  return { node, cursor: { key: [node.name], id: node.id } };
};

async function renderPage(params: Record<string, string> = {}) {
  render(await AdminUsersPage({ searchParams: Promise.resolve(params) }));
}

function lastRequest(): PageRequest {
  return listUsers.mock.calls[listUsers.mock.calls.length - 1]?.[2] as PageRequest;
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listUsers.mockReset();
  listUsers.mockResolvedValue([entry(1), entry(2)]);
  providersOf.mockReset();
  providersOf.mockImplementation(async (_session, ids: string[]) =>
    ids.map((_, index) => (index === 0 ? ['google'] : [])),
  );
  isPrimaryAdmin.mockReset();
  isPrimaryAdmin.mockReturnValue(false);
  adminRoleChangePauseState.mockReset();
  adminRoleChangePauseState.mockResolvedValue({ paused: false, canToggle: false });
});

describe('the /admin/users page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listUsers).not.toHaveBeenCalled();
    expect(adminRoleChangePauseState).not.toHaveBeenCalled();
    expect(providersOf).not.toHaveBeenCalled();
  });

  it("reads the first page of 25 as the guard's session, with no filter", async () => {
    await renderPage();

    expect(listUsers).toHaveBeenCalledOnce();
    expect(listUsers).toHaveBeenCalledWith(
      ADMIN,
      { query: undefined, awaitingApproval: false },
      {
        limit: 26,
        inverted: false,
      },
    );
    expect(providersOf).toHaveBeenCalledWith(ADMIN, [user(1).id, user(2).id]);
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
  });

  it('shows each user with the providers read for them', async () => {
    await renderPage();

    const row = screen.getByRole('row', { name: /Listed Fixture 01/ });
    expect(within(row).getByText('Google', { selector: '.visually-hidden' })).toBeInTheDocument();
    // None linked is an empty cell, the fifth.
    const none = within(screen.getByRole('row', { name: /Listed Fixture 02/ })).getAllByRole(
      'cell',
    );
    expect(none[4]).toHaveTextContent(/^$/);
  });

  // MB.59: whether a row is the primary admin's is the identity service's
  // answer, asked of each row as the page reads it.
  it('labels the row the service says is the primary admin, and no other', async () => {
    isPrimaryAdmin.mockImplementation((node: { id: string }) => node.id === user(2).id);

    await renderPage();

    expect(isPrimaryAdmin).toHaveBeenCalledTimes(2);
    const primary = screen.getByRole('row', { name: /Listed Fixture 02/ });
    expect(within(primary).getByText('Primary Admin')).toBeInTheDocument();
    const other = screen.getByRole('row', { name: /Listed Fixture 01/ });
    expect(within(other).queryByText('Primary Admin')).not.toBeInTheDocument();
  });

  // MB.63: the switch's state, as the identity service answers it for this admin.
  it('states whether admin changes are paused, asked as the guard’s session', async () => {
    adminRoleChangePauseState.mockResolvedValue({ paused: true, canToggle: true });

    await renderPage();

    expect(adminRoleChangePauseState).toHaveBeenCalledWith(ADMIN);
    expect(screen.getByText(/^Admin changes are paused/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume Admin Changes' })).toBeEnabled();
  });

  it('turns the search parameters into the filter', async () => {
    // `?awaiting` arrives as an empty string.
    await renderPage({ query: 'fixture', awaiting: '' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: true });
    expect(screen.getByLabelText('Name or Email')).toHaveValue('fixture');
    expect(screen.getByLabelText('Needs Approval')).toBeChecked();
  });

  // A flag by presence: a native submit's `awaiting=` and an older link's
  // `awaiting=1` read the same as the bare one.
  it.each([[''], ['1'], ['on']])('reads awaiting=%s as awaiting', async (value) => {
    await renderPage({ awaiting: value });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: undefined, awaitingApproval: true });
  });

  it('reads no awaiting as the whole list', async () => {
    await renderPage({ query: 'fixture' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: false });
  });

  it('reads on after a cursor, and back before one', async () => {
    const cursor = { key: ['Listed Fixture 25'], id: user(25).id };

    await renderPage({ after: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ after: cursor, limit: 26, inverted: false });

    await renderPage({ before: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ before: cursor, limit: 26, inverted: true });
  });

  // A hand-edited address is not worth an error page: the first page stands in.
  it('reads the first page when the cursor is not one', async () => {
    await renderPage({ after: 'not-a-cursor' });

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
  });

  it('reads ?role as the role filter', async () => {
    await renderPage({ role: 'admin' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ awaitingApproval: false, role: 'admin' });
    expect(screen.getByLabelText('Role')).toHaveValue('admin');
  });

  // Only a hand-edited address carries one, so it filters nothing rather than erring.
  it('reads a role it does not know as no role', async () => {
    await renderPage({ role: 'wizard' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ awaitingApproval: false });
    expect(screen.getByLabelText('Role')).toHaveValue('');
  });

  it('links the next page, keeping the filter, when there is one', async () => {
    listUsers.mockResolvedValue(Array.from({ length: 26 }, (_, index) => entry(index + 1)));

    await renderPage({ query: 'listed', awaiting: '', role: 'user' });

    const next = screen.getByRole('link', { name: 'Next' });
    const href = next.getAttribute('href') as string;
    expect(href).toBe(
      `/admin/users?query=listed&awaiting&role=user&after=${encodeURIComponent(encodeCursor(entry(25).cursor))}`,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('links the previous page from a later one', async () => {
    await renderPage({ after: encodeCursor(entry(0).cursor) });

    const previous = screen.getByRole('link', { name: 'Prev' });
    const url = new URL(previous.getAttribute('href') as string, 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      before: encodeCursor(entry(1).cursor),
    });
  });
});

// MB.53: the page offers impersonation where the plugin is registered, and
// only there; the gate itself is tests/lib/impersonation.test.ts's.
describe('the /admin/users page, impersonation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers it on each row where impersonation is on', async () => {
    vi.stubEnv('ENABLE_IMPERSONATION', 'true');
    vi.stubEnv('VERCEL_ENV', 'preview');
    await renderPage();

    expect(
      screen.getByRole('button', { name: 'Impersonate Listed Fixture 01' }),
    ).toBeInTheDocument();
  });

  it('offers it nowhere at production, the flag set or not', async () => {
    vi.stubEnv('ENABLE_IMPERSONATION', 'true');
    vi.stubEnv('VERCEL_ENV', 'production');
    await renderPage();

    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
  });
});
