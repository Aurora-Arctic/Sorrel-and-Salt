import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { filterForm, sent } from '../../../../../support/filter-form';

// The `/admin/users` page (MB.52): the guard, then the identity reads, a
// page of users and its count, the search parameters turned into the filter
// and the page, and the pager's links keeping the filter. The guard and the services are mocked: what they
// decide is tests/lib/request-session.test.ts's and
// tests/modules/identity/services/user-list.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

// The rows' Approval controls hold the router, which only a mounted app provides.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const listUsers = vi.fn();
const countUsers = vi.fn();
const providersOf = vi.fn();
const isPrimaryAdmin = vi.fn();
const adminRoleChangePauseState = vi.fn();
const usersForAdmin = vi.fn();
const listedOnUserList = vi.fn();
vi.mock('@/modules/identity', () => ({
  adminRoleChangePauseState,
  countUsers,
  isPrimaryAdmin,
  listedOnUserList,
  listUsers,
  providersOf,
  usersForAdmin,
}));

const membershipsOf = vi.fn();
vi.mock('@/modules/coven', () => ({ membershipsOf }));

const { default: AdminUsersPage } = await import('@/app/(shell)/admin/(people)/users/page');
const { default: UsersAction } = await import('@/app/(shell)/admin/(people)/@action/users/page');

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

/** A membership as the coven service answers one, its workspace beside it. */
const COVEN_ROW = {
  workspaceId: '11111111-2222-4333-8444-555555555555',
  userId: user(1).id,
  role: 'owner',
  joinedAt: new Date('2026-04-05T06:07:08Z'),
  workspace: {
    id: '11111111-2222-4333-8444-555555555555',
    name: 'Fixture Coven',
    slug: 'fixture-coven',
  },
};

/** The user modal’s name: its eyebrow, then the name and the address (M9.19). */
const VIEWING_01 = 'User, Listed Fixture 01, listed-1@users.test';

const entry = (index: number) => {
  const node = user(index);
  return { node, cursor: { key: [node.name], id: node.id } };
};

// The tab's action beside the heading, the switch on admin changes, and the
// tab's content, as the route group's layout puts them on one page.
async function renderPage(params: Record<string, string> = {}) {
  const [action, page] = await Promise.all([
    UsersAction(),
    AdminUsersPage({ searchParams: Promise.resolve(params) }),
  ]);
  render(
    <>
      {action}
      {page}
    </>,
  );
}

function lastRequest(): PageRequest {
  return listUsers.mock.calls[listUsers.mock.calls.length - 1]?.[2] as PageRequest;
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listUsers.mockReset();
  listUsers.mockResolvedValue([entry(1), entry(2)]);
  countUsers.mockReset();
  countUsers.mockResolvedValue({ totalCount: 2, countBefore: 0 });
  providersOf.mockReset();
  providersOf.mockImplementation(async (_session, ids: string[]) =>
    ids.map((_, index) => (index === 0 ? ['google'] : [])),
  );
  isPrimaryAdmin.mockReset();
  isPrimaryAdmin.mockReturnValue(false);
  adminRoleChangePauseState.mockReset();
  adminRoleChangePauseState.mockResolvedValue({ paused: false, canToggle: false });
  usersForAdmin.mockReset();
  usersForAdmin.mockImplementation(async (_session, ids: string[]) =>
    ids.map((id) => (id === user(1).id ? user(1) : null)),
  );
  listedOnUserList.mockReset();
  listedOnUserList.mockReturnValue(true);
  membershipsOf.mockReset();
  membershipsOf.mockImplementation(async (_session, ids: string[]) => ids.map(() => [COVEN_ROW]));
});

describe('the /admin/users page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listUsers).not.toHaveBeenCalled();
    expect(countUsers).not.toHaveBeenCalled();
    expect(adminRoleChangePauseState).not.toHaveBeenCalled();
    expect(providersOf).not.toHaveBeenCalled();
  });

  it("reads the first page of 25 and its count as the guard's session, with no filter", async () => {
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
    // Counted from the page's first row, under the same filter.
    expect(countUsers).toHaveBeenCalledOnce();
    expect(countUsers).toHaveBeenCalledWith(
      ADMIN,
      { query: undefined, awaitingApproval: false },
      entry(1).cursor,
    );
    expect(providersOf).toHaveBeenCalledWith(ADMIN, [user(1).id, user(2).id]);
  });

  it('shows each user with the providers read for them', async () => {
    await renderPage();

    // The providers are the fifth cell; none linked leaves it empty.
    const linked = within(screen.getByRole('row', { name: /Listed Fixture 01/ })).getAllByRole(
      'cell',
    );
    expect(linked[4]).toHaveTextContent('Google');
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
    expect(screen.getByRole('button', { name: 'Resume Admin Changes' })).toBeEnabled();
  });

  it('turns the search parameters into the filter', async () => {
    // `?awaiting` arrives as an empty string.
    await renderPage({ query: 'fixture', awaiting: '' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: true });
    expect(countUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: true });
    expect(screen.getByLabelText('Name or Email')).toHaveValue('fixture');
    expect(screen.getByRole('switch', { name: 'Needs Approval' })).toBeChecked();
  });

  // A flag by presence: an older link's `awaiting=1` reads as the bare one.
  it('reads awaiting with a value as awaiting', async () => {
    await renderPage({ awaiting: '1' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: undefined, awaitingApproval: true });
  });

  it('reads on after a cursor, and back before one', async () => {
    const cursor = { key: ['Listed Fixture 25'], id: user(25).id };

    await renderPage({ after: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ after: cursor, limit: 26, inverted: false });

    await renderPage({ before: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ before: cursor, limit: 26, inverted: true });
  });

  it('reads ?role as the role filter', async () => {
    await renderPage({ role: 'admin' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ awaitingApproval: false, role: 'admin' });
    expect(countUsers.mock.calls[0]?.[1]).toEqual({ awaitingApproval: false, role: 'admin' });
    expect(filterSends('role')).toBe('admin');
  });

  // Only a hand-edited address carries one, so it filters nothing rather than erring.
  it('reads a role it does not know as no role', async () => {
    await renderPage({ role: 'wizard' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ awaitingApproval: false });
    expect(filterSends('role')).toBe('');
  });

  it('links the pages either side, keeping the filter', async () => {
    listUsers.mockResolvedValue(Array.from({ length: 26 }, (_, index) => entry(index + 1)));
    countUsers.mockResolvedValue({ totalCount: 60, countBefore: 25 });

    await renderPage({
      query: 'listed',
      awaiting: '',
      role: 'user',
      after: encodeCursor(entry(0).cursor),
    });

    const filter = '/admin/users?query=listed&awaiting&role=user';
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `${filter}&after=${encodeURIComponent(encodeCursor(entry(25).cursor))}`,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      `${filter}&before=${encodeURIComponent(encodeCursor(entry(1).cursor))}`,
    );
  });
});

// M9.19: `?user=<id>` opens the user’s modal over the list, holding the
// covens the coven service answers for them, read with the navigation.
describe('the /admin/users page, the user modal', () => {
  it('reads the user and their covens as the guard’s session, and shows them in the modal', async () => {
    await renderPage({ query: 'listed', user: user(1).id });

    expect(usersForAdmin).toHaveBeenCalledExactlyOnceWith(ADMIN, [user(1).id]);
    expect(listedOnUserList).toHaveBeenCalledWith(user(1).id);
    expect(membershipsOf).toHaveBeenCalledExactlyOnceWith(ADMIN, [user(1).id]);
    expect(providersOf).toHaveBeenCalledWith(ADMIN, [user(1).id]);
    const dialog = screen.getByRole('dialog', { name: VIEWING_01 });
    expect(
      within(within(dialog).getByRole('list', { name: 'Covens' })).getByRole('listitem'),
    ).toHaveTextContent('Fixture Coven');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens no modal, and reads no user, without ?user=', async () => {
    await renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usersForAdmin).not.toHaveBeenCalled();
    expect(membershipsOf).not.toHaveBeenCalled();
  });

  // Each row’s name opens the modal, keeping the filter, under the head the
  // modal carries once loaded.
  it('links each name to its modal, keeping the filter', async () => {
    await renderPage({ query: 'listed', role: 'user' });

    expect(screen.getByRole('link', { name: 'Listed Fixture 02' })).toHaveAttribute(
      'href',
      `/admin/users?query=listed&role=user&user=${user(2).id}`,
    );
  });

  // Hand-edited, or copied wrong: the list beneath is still the page asked for.
  it('says the address names no user, opens no modal and reads no user, for an id that is not one', async () => {
    await renderPage({ user: 'not-an-id' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usersForAdmin).not.toHaveBeenCalled();
    expect(membershipsOf).not.toHaveBeenCalled();
    expect(screen.getByRole('row', { name: /Listed Fixture 01/ })).toBeInTheDocument();
  });

  it('says the address names no user, and opens no modal, for a user the service finds none of', async () => {
    await renderPage({ user: user(9).id });

    expect(usersForAdmin).toHaveBeenCalledWith(ADMIN, [user(9).id]);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The seed’s bootstrap user is live, and off the list (MB.59).
  it('says the address names no user, and opens no modal, for a user the list leaves out', async () => {
    listedOnUserList.mockReturnValue(false);

    await renderPage({ user: user(1).id });

    expect(listedOnUserList).toHaveBeenCalledWith(user(1).id);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
});

/** What the filter form sends for `name`: once hydrated, a select-only box's hidden input. */
function filterSends(name: string): string | null {
  return new URLSearchParams(sent(filterForm('Filter Users'))).get(name);
}
