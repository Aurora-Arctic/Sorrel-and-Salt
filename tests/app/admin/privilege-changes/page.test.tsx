import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidCursor } from '@/lib/errors';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/privilege-changes` page (MB.200): the guard, then the ledger
// read, its count and the users it names, the search parameters turned into
// the filter and the page, and the pager's links keeping the filter. The guard
// and the services are mocked: what they decide is
// tests/lib/request-session.test.ts's and
// tests/modules/identity/services/privilege-changes.test.ts's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listPrivilegeChanges = vi.fn();
const countPrivilegeChanges = vi.fn();
const usersForAdmin = vi.fn();
const listedOnUserList = vi.fn((id: string) => id !== SEED);
vi.mock('@/modules/identity', () => ({
  listPrivilegeChanges,
  countPrivilegeChanges,
  usersForAdmin,
  listedOnUserList,
}));

const { default: AdminPrivilegeChangesPage } = await import('@/app/admin/privilege-changes/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const ADA = {
  id: '00000000-0000-0000-0000-0000000000a1',
  name: 'Ada Fixturewort',
  email: 'ada@ledger.test',
};
const BRAM = {
  id: '00000000-0000-0000-0000-0000000000b2',
  name: 'Bram Testwort',
  email: 'bram@ledger.test',
};
const SEED = '00000000-0000-0000-0000-000000000001';
const GONE = '00000000-0000-0000-0000-0000000000c3';
const PEOPLE: Record<string, { id: string; name: string; email: string }> = {
  [ADA.id]: ADA,
  [BRAM.id]: BRAM,
  [SEED]: { id: SEED, name: 'Seed System User', email: 'seed@ledger.test' },
};

const change = (index: number, userId = ADA.id, createdBy = BRAM.id) => ({
  id: `00000000-0000-0000-0000-0000000001${String(index).padStart(2, '0')}`,
  userId,
  privilege: 'admin',
  change: 'grant',
  via: 'admin',
  note: index === 1 ? 'Covering the spring audit' : null,
  createdAt: new Date(`2026-03-04T05:${String(59 - index).padStart(2, '0')}:00Z`),
  createdBy,
});

const entry = (index: number, userId?: string, createdBy?: string) => {
  const node = change(index, userId, createdBy);
  return { node, cursor: { key: [String(-index)], id: node.id } };
};

async function renderPage(params: Record<string, string> = {}) {
  render(await AdminPrivilegeChangesPage({ searchParams: Promise.resolve(params) }));
}

function lastRequest(): PageRequest {
  return listPrivilegeChanges.mock.calls[
    listPrivilegeChanges.mock.calls.length - 1
  ]?.[2] as PageRequest;
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listPrivilegeChanges.mockReset();
  listPrivilegeChanges.mockResolvedValue([entry(1), entry(2, BRAM.id, SEED), entry(3, GONE)]);
  countPrivilegeChanges.mockReset();
  countPrivilegeChanges.mockResolvedValue({ totalCount: 3, countBefore: 0 });
  usersForAdmin.mockReset();
  usersForAdmin.mockImplementation(async (_session, ids: string[]) =>
    ids.map((id) => PEOPLE[id] ?? null),
  );
});

describe('the /admin/privilege-changes page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listPrivilegeChanges).not.toHaveBeenCalled();
    expect(usersForAdmin).not.toHaveBeenCalled();
  });

  it("reads the first page of 25 and its count as the guard's session, with no filter", async () => {
    await renderPage();

    expect(listPrivilegeChanges).toHaveBeenCalledOnce();
    expect(listPrivilegeChanges).toHaveBeenCalledWith(
      ADMIN,
      { userId: undefined, privilege: undefined },
      { limit: 26, inverted: false },
    );
    expect(countPrivilegeChanges).toHaveBeenCalledWith(
      ADMIN,
      { userId: undefined, privilege: undefined },
      entry(1).cursor,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privilege Changes' }),
    ).toBeInTheDocument();
  });

  it('reads every user the page names in one call, and names them', async () => {
    await renderPage();

    expect(usersForAdmin).toHaveBeenCalledOnce();
    expect(usersForAdmin.mock.calls[0]?.[1]).toEqual([ADA.id, BRAM.id, SEED, GONE]);
    const [first, second, third] = screen.getAllByRole('row').slice(1);
    expect(within(first).getByRole('link', { name: 'Ada Fixturewort' })).toHaveAttribute(
      'href',
      '/admin/users?query=ada%40ledger.test',
    );
    expect(within(first).getByRole('link', { name: 'Bram Testwort' })).toHaveAttribute(
      'href',
      '/admin/users?query=bram%40ledger.test',
    );
    expect(within(first).getByText('Covering the spring audit')).toBeInTheDocument();
    // The seed's bootstrap user is named, but the user list has no row for it.
    expect(within(second).getByText('Seed System User').tagName).not.toBe('A');
    expect(within(third).getByText('Deleted account')).toBeInTheDocument();
  });

  it('turns ?query and ?privilege into the filter, the query trimmed and shown in the search', async () => {
    await renderPage({ query: '  ada ', privilege: 'admin' });

    expect(listPrivilegeChanges.mock.calls[0]?.[1]).toEqual({ query: 'ada', privilege: 'admin' });
    expect(countPrivilegeChanges.mock.calls[0]?.[1]).toEqual({ query: 'ada', privilege: 'admin' });
    expect(screen.getByLabelText('Name or Email')).toHaveValue('ada');
    expect(screen.getByLabelText('Privilege')).toHaveValue('admin');
  });

  it('reads a blank query as none', async () => {
    await renderPage({ query: '  ' });

    expect(listPrivilegeChanges.mock.calls[0]?.[1]).toEqual({});
  });

  it('says plainly when the filter matches nothing', async () => {
    listPrivilegeChanges.mockResolvedValue([]);
    countPrivilegeChanges.mockResolvedValue({ totalCount: 0, countBefore: null });

    await renderPage({ query: 'ada@ledger.test', privilege: 'admin' });

    expect(screen.getByText('No admin changes for “ada@ledger.test”.')).toBeInTheDocument();
  });

  // Only a hand-edited address carries one, so it filters nothing rather than erring.
  it('reads a privilege it does not know as no privilege', async () => {
    await renderPage({ privilege: 'wizard' });

    expect(listPrivilegeChanges.mock.calls[0]?.[1]).toEqual({
      userId: undefined,
      privilege: undefined,
    });
  });

  it('reads on after a cursor, and back before one', async () => {
    const cursor = { key: ['-5'], id: change(5).id };

    await renderPage({ after: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ after: cursor, limit: 26, inverted: false });

    await renderPage({ before: encodeCursor(cursor) });
    expect(lastRequest()).toEqual({ before: cursor, limit: 26, inverted: true });
  });

  // A cursor copied from another list decodes, then names no row of this one.
  it('reads the first page when the cursor is not one of this list', async () => {
    listPrivilegeChanges.mockRejectedValueOnce(new InvalidCursor());
    const cursor = { key: ['Listed Fixture 25'], id: change(5).id };

    await renderPage({ after: encodeCursor(cursor) });

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('lets any other failure through', async () => {
    listPrivilegeChanges.mockRejectedValue(new InvalidCursor());

    await expect(renderPage()).rejects.toThrow(InvalidCursor);
  });

  it('refuses to render a refusal from the user read', async () => {
    usersForAdmin.mockImplementation(async (_session, ids: string[]) =>
      ids.map(() => new Error('refused')),
    );

    await expect(renderPage()).rejects.toThrow('refused');
  });

  it('links the next page, keeping the filter, and says where it stands', async () => {
    listPrivilegeChanges.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) => entry(index + 1)),
    );
    countPrivilegeChanges.mockResolvedValue({ totalCount: 30, countBefore: 0 });

    await renderPage({ query: 'ada', privilege: 'admin' });

    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      `/admin/privilege-changes?query=ada&privilege=admin&after=${encodeURIComponent(encodeCursor(entry(25).cursor))}`,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 1 of 2');
  });

  it('links the previous page from a later one', async () => {
    await renderPage({ after: encodeCursor(entry(0).cursor) });

    const url = new URL(
      screen.getByRole('link', { name: 'Prev' }).getAttribute('href') as string,
      'http://localhost',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({ before: encodeCursor(entry(1).cursor) });
  });
});
