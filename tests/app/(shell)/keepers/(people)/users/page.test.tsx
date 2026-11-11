import { fireEvent, render, screen, within } from '@testing-library/react';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../../../../../support/printed-text';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import { filterForm, sent } from '../../../../../support/filter-form';
import { rowCells } from '../../../../../support/table';
import { requireAdminSession } from '../../../../../support/request-session';
import { router } from '../../../../../support/next-navigation';

vi.mock('@/lib/request-session', () => import('../../../../../support/request-session'));

// The rows' Approval controls hold the router, which only a mounted app provides.

const listUsers = vi.fn();
const countUsers = vi.fn();
const providersOf = vi.fn();
const holdsPasskey = vi.fn();
const isPrimaryAdmin = vi.fn();
const adminRoleChangePauseState = vi.fn();
const usersForAdmin = vi.fn();
const listedOnUserList = vi.fn();
const listUserAccessPauses = vi.fn();
const standingAccessPausesOf = vi.fn();
vi.mock('@/modules/identity', () => ({
  adminRoleChangePauseState,
  countUsers,
  holdsPasskey,
  isPrimaryAdmin,
  listedOnUserList,
  listUserAccessPauses,
  listUsers,
  providersOf,
  standingAccessPausesOf,
  usersForAdmin,
}));

const membershipsOf = vi.fn();
vi.mock('@/modules/coven', () => ({ membershipsOf }));

const standingTimeoutsOf = vi.fn();
vi.mock('@/modules/support', () => ({ standingTimeoutsOf }));

vi.mock('@/app/(shell)/keepers/support/reads', () => ({ readTimeoutsOf: vi.fn(async () => []) }));

const { default: AdminUsersPage } = await import('@/app/(shell)/keepers/(people)/users/page');
const { default: UsersAction } = await import('@/app/(shell)/keepers/(people)/@action/users/page');

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

const VIEWING_01 = 'User, Listed Fixture 01, listed-1@users.test';

const entry = (index: number) => {
  const node = user(index);
  return { node, cursor: { key: [node.name], id: node.id } };
};

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

function cellUnder(name: string, heading: string): HTMLElement {
  const headings = screen.getAllByRole('columnheader').map((header) => header.textContent);
  const row = screen.getByRole('row', { name: new RegExp(name) });
  return rowCells(row)[headings.indexOf(heading)] as HTMLElement;
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
  holdsPasskey.mockReset();
  holdsPasskey.mockImplementation(async (_session, ids: string[]) => ids.map(() => false));
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
  listUserAccessPauses.mockReset();
  standingAccessPausesOf.mockReset();
  standingAccessPausesOf.mockImplementation(async (_session, ids: string[]) =>
    ids.map(() => undefined),
  );
  standingTimeoutsOf.mockReset();
  standingTimeoutsOf.mockImplementation(async (_session, ids: string[]) =>
    ids.map(() => undefined),
  );
  listUserAccessPauses.mockResolvedValue([]);
  membershipsOf.mockReset();
  membershipsOf.mockImplementation(async (_session, ids: string[]) => ids.map(() => [COVEN_ROW]));
});

describe('the /keepers/users page', () => {
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

    expect(cellUnder('Listed Fixture 01', 'Logins')).toHaveTextContent('Google');
    expect(cellUnder('Listed Fixture 02', 'Logins')).toHaveTextContent(/^$/);
  });

  it("reads in one batch, as the guard's session, which users hold a passkey, and marks their rows", async () => {
    holdsPasskey.mockImplementation(async (_session, ids: string[]) =>
      ids.map((id) => id === user(2).id),
    );
    await renderPage();

    expect(holdsPasskey).toHaveBeenCalledExactlyOnceWith(ADMIN, [user(1).id, user(2).id]);
    expect(screen.getByRole('cell', { name: /Passkey/ })).toBe(
      cellUnder('Listed Fixture 02', 'Logins'),
    );
  });

  it('reads the page’s standing time-outs and pauses in one batch each, as the guard’s session, and marks each row', async () => {
    const until = new Date('2026-11-20T09:30:00Z');
    standingTimeoutsOf.mockImplementation(async (_session, ids: string[]) =>
      ids.map((id) => ({ userId: id, until: id === user(1).id ? until : null })),
    );
    standingAccessPausesOf.mockImplementation(async (_session, ids: string[]) =>
      ids.map((id) => (id === user(2).id ? { userId: id, until: null } : undefined)),
    );
    await renderPage();

    const ids = [user(1).id, user(2).id];
    expect(standingTimeoutsOf).toHaveBeenCalledExactlyOnceWith(ADMIN, ids);
    expect(standingAccessPausesOf).toHaveBeenCalledExactlyOnceWith(ADMIN, ids);
    expect(
      within(cellUnder('Listed Fixture 01', 'Support')).getByText(
        `Timed out until ${printed(longMinuteInZone(until))}`,
      ),
    ).toBeInTheDocument();
    expect(
      within(cellUnder('Listed Fixture 01', 'Access')).getByText('Not paused'),
    ).toBeInTheDocument();
    expect(
      within(cellUnder('Listed Fixture 02', 'Support')).getByText('Timed out with no end date'),
    ).toBeInTheDocument();
    expect(
      within(cellUnder('Listed Fixture 02', 'Access')).getByText('Paused with no end date'),
    ).toBeInTheDocument();
  });

  it('labels the row the service says is the primary keeper, and no other', async () => {
    isPrimaryAdmin.mockImplementation((node: { id: string }) => node.id === user(2).id);

    await renderPage();

    expect(isPrimaryAdmin).toHaveBeenCalledTimes(2);
    const primary = screen.getByRole('row', { name: /Listed Fixture 02/ });
    expect(within(primary).getByText('Primary Keeper')).toBeInTheDocument();
    const other = screen.getByRole('row', { name: /Listed Fixture 01/ });
    expect(within(other).queryByText('Primary Keeper')).not.toBeInTheDocument();
  });

  it('states whether keeper changes are paused, asked as the guard’s session', async () => {
    adminRoleChangePauseState.mockResolvedValue({ paused: true, canToggle: true });

    await renderPage();

    expect(adminRoleChangePauseState).toHaveBeenCalledWith(ADMIN);
    expect(screen.getByRole('button', { name: 'Resume Keeper Changes' })).toBeEnabled();
  });

  it('turns the search parameters into the filter', async () => {
    // `?awaiting` arrives as an empty string.
    await renderPage({ query: 'fixture', awaiting: '' });

    expect(listUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: true });
    expect(countUsers.mock.calls[0]?.[1]).toEqual({ query: 'fixture', awaitingApproval: true });
    expect(screen.getByLabelText('Name or Email')).toHaveValue('fixture');
    expect(screen.getByRole('switch', { name: 'Needs Approval' })).toBeChecked();
  });

  it('reads ?timed-out and ?paused as the time-out and pause filters', async () => {
    await renderPage({ 'timed-out': '', paused: '' });

    const filter = { query: undefined, awaitingApproval: false, timedOut: true, paused: true };
    expect(listUsers.mock.calls[0]?.[1]).toEqual(filter);
    expect(countUsers.mock.calls[0]?.[1]).toEqual(filter);
    expect(screen.getByRole('switch', { name: 'Support Timed Out' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Access Paused' })).toBeChecked();
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
      'timed-out': '',
      paused: '',
      after: encodeCursor(entry(0).cursor),
    });

    const filter = '/keepers/users?query=listed&awaiting&role=user&timed-out&paused';
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

describe('the /keepers/users page, the user modal', () => {
  it('reads the user and their covens as the guard’s session, and shows them in the modal', async () => {
    holdsPasskey.mockImplementation(async (_session, ids: string[]) => ids.map(() => true));
    await renderPage({ query: 'listed', user: user(1).id });

    expect(usersForAdmin).toHaveBeenCalledExactlyOnceWith(ADMIN, [user(1).id]);
    expect(listedOnUserList).toHaveBeenCalledWith(user(1).id);
    expect(membershipsOf).toHaveBeenCalledExactlyOnceWith(ADMIN, [user(1).id]);
    expect(providersOf).toHaveBeenCalledWith(ADMIN, [user(1).id]);
    expect(holdsPasskey).toHaveBeenCalledWith(ADMIN, [user(1).id]);
    const dialog = screen.getByRole('dialog', { name: VIEWING_01 });
    expect(within(dialog).getAllByText('Passkey')[0]).toBeInTheDocument();
    expect(
      within(within(dialog).getByRole('list', { name: 'Covens' })).getByRole('listitem'),
    ).toHaveTextContent('Fixture Coven');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reads the newest 25 of the user’s access pauses as the guard’s session, and names who set and lifted each', async () => {
    const ash = { ...user(3), name: 'Ash Warden' };
    const ivy = { ...user(4), name: 'Ivy Keeper' };
    listUserAccessPauses.mockResolvedValue([
      {
        node: {
          id: 'p1',
          userId: user(1).id,
          until: null,
          note: null,
          createdAt: new Date('2026-08-01T00:00:00Z'),
          createdBy: ash.id,
          liftedAt: new Date('2026-08-02T00:00:00Z'),
          liftedBy: ivy.id,
        },
        cursor: { key: [0], id: 'p1' },
      },
    ]);
    usersForAdmin.mockImplementation(async (_session, ids: string[]) =>
      ids.map((id) => [user(1), ash, ivy].find((found) => found.id === id) ?? null),
    );
    await renderPage({ user: user(1).id });

    expect(listUserAccessPauses).toHaveBeenCalledExactlyOnceWith(ADMIN, user(1).id, {
      limit: 25,
      inverted: false,
    });
    const access = within(screen.getByRole('dialog', { name: VIEWING_01 })).getByRole('region', {
      name: 'Site Access',
    });
    fireEvent.click(within(access).getByRole('button', { name: 'Site Access', expanded: false }));
    expect(within(access).getByRole('button', { name: 'Pause Access' })).toBeInTheDocument();
    expect(
      within(within(access).getByRole('list', { name: 'Earlier Pauses' })).getByRole('listitem'),
    ).toHaveTextContent('Set by Ash Warden · Lifted by Ivy Keeper');
  });

  it('draws no Site Access section, and reads no pauses, on the primary admin', async () => {
    isPrimaryAdmin.mockReturnValue(true);
    await renderPage({ user: user(1).id });

    expect(screen.getByRole('dialog', { name: VIEWING_01 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Site Access' })).toBeNull();
    expect(listUserAccessPauses).not.toHaveBeenCalled();
  });

  it('draws no Site Access section, and reads no pauses, on the admin’s own account', async () => {
    requireAdminSession.mockResolvedValue({ ...ADMIN, userId: user(1).id });
    await renderPage({ user: user(1).id });

    expect(screen.getByRole('dialog', { name: VIEWING_01 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Site Access' })).toBeNull();
    expect(listUserAccessPauses).not.toHaveBeenCalled();
  });

  it('opens no modal, and reads no user, without ?user=', async () => {
    await renderPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usersForAdmin).not.toHaveBeenCalled();
    expect(membershipsOf).not.toHaveBeenCalled();
  });

  it('links each name to its modal, keeping the filter', async () => {
    await renderPage({ query: 'listed', role: 'user' });

    expect(screen.getByRole('link', { name: 'Listed Fixture 02' })).toHaveAttribute(
      'href',
      `/keepers/users?query=listed&role=user&user=${user(2).id}`,
    );
  });

  // Opened from a cards screen, Close goes back to that screen; from the list, or a `from` outside the set, back to the list.
  it.each([
    ['invitation-cards', '/keepers/invitation-cards'],
    [undefined, '/keepers/users?query=listed'],
    ['https://elsewhere.test', '/keepers/users?query=listed'],
  ])('closes a modal opened from %s to %s', async (from, closeTo) => {
    await renderPage({ query: 'listed', user: user(1).id, ...(from && { from }) });

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
    );

    expect(router.replace).toHaveBeenCalledWith(closeTo, { scroll: false });
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

  // The seed’s bootstrap user is live, and off the list.
  it('says the address names no user, and opens no modal, for a user the list leaves out', async () => {
    listedOnUserList.mockReturnValue(false);

    await renderPage({ user: user(1).id });

    expect(listedOnUserList).toHaveBeenCalledWith(user(1).id);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('the /keepers/users page, impersonation', () => {
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

function filterSends(name: string): string | null {
  return new URLSearchParams(sent(filterForm('Filter Users'))).get(name);
}
