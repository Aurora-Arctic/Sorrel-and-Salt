import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserList from '@/components/UserList';
import type { UserListProps } from '@/components/UserList/types';

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which jsdom cannot follow.
const impersonateUserMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  impersonateUser: (...args: unknown[]) => impersonateUserMock(...args),
}));
const assignMock = vi.fn();

// `/admin/users`' table, filter and pager (MB.52): render-only, so the page
// owns the read and this owns what an admin sees of it
// (claude-docs/components/user-list.md).

const ADA = {
  id: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  name: 'Ada Fixturewort',
  email: 'ada@users.test',
  role: 'admin',
  canCreateWorkspace: true,
  createdAt: new Date('2026-03-04T05:06:07Z'),
  providers: ['discord', 'google'],
  emailVerified: true,
} as const;

const BO = {
  id: '7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
  name: 'Bo Fixturewort',
  email: 'bo@users.test',
  role: 'user',
  canCreateWorkspace: false,
  createdAt: new Date('2026-05-06T07:08:09Z'),
  providers: [],
  emailVerified: false,
} as const;

const props = (overrides: Partial<UserListProps> = {}): UserListProps => ({
  users: [ADA, BO],
  query: '',
  awaitingApproval: false,
  ...overrides,
});

function cellsOf(name: string): string[] {
  const row = screen.getByRole('row', { name: new RegExp(name) });
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

describe('UserList', () => {
  it('heads a column for each fact an admin judges a user by', () => {
    render(<UserList {...props()} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      'Name',
      'Email',
      'Role',
      'Can create a coven',
      'Signed up',
      'Sign-in methods',
      'Email verified',
    ]);
  });

  it('shows a row per user, in the order given', () => {
    render(<UserList {...props()} />);

    expect(cellsOf('Ada Fixturewort')).toEqual([
      'Ada Fixturewort',
      'ada@users.test',
      'Admin',
      'Yes',
      '2026-03-04',
      'Discord, Google',
      'Yes',
    ]);
    expect(cellsOf('Bo Fixturewort')).toEqual([
      'Bo Fixturewort',
      'bo@users.test',
      'User',
      'No',
      '2026-05-06',
      'None',
      'No',
    ]);
  });

  it('dates the signup with a machine-readable time', () => {
    render(<UserList {...props()} />);

    const time = within(screen.getByRole('row', { name: /Ada/ })).getByText('2026-03-04');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-03-04T05:06:07.000Z');
  });

  it('names a provider outside the roster by its id rather than dropping it', () => {
    render(<UserList {...props({ users: [{ ...BO, providers: ['github'] }] })} />);

    expect(cellsOf('Bo Fixturewort')[5]).toBe('github');
  });

  it('says so when no user matches', () => {
    render(<UserList {...props({ users: [], query: 'nobody' })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No users match.')).toBeInTheDocument();
  });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(<UserList {...props({ query: 'fixturewort', awaitingApproval: true })} />);

    // The <search> landmark around it is the e2e spec's to find: jsdom's role
    // table predates the element, and a browser's does not. The action and
    // method are what a submit before hydration uses.
    const search = screen.getByRole('form', { name: 'Filter users' });
    expect(search).toHaveAttribute('action', '/admin/users');
    expect(search).toHaveAttribute('method', 'get');
    expect(within(search).getByLabelText('Name or email')).toHaveValue('fixturewort');
    expect(within(search).getByLabelText('Name or email')).toHaveAttribute('name', 'query');
    expect(within(search).getByLabelText('Awaiting approval only')).toBeChecked();
    expect(within(search).getByLabelText('Awaiting approval only')).toHaveAttribute(
      'name',
      'awaiting',
    );
  });

  it('links the pages either side, and only those that exist', () => {
    const { rerender } = render(<UserList {...props()} />);
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();

    rerender(<UserList {...props({ nextHref: '/admin/users?after=next' })} />);
    let pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument();
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/users?after=next',
    );

    rerender(<UserList {...props({ previousHref: '/admin/users?before=previous' })} />);
    pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/admin/users?before=previous',
    );
    expect(within(pages).queryByRole('link', { name: 'Next' })).not.toBeInTheDocument();
  });
});

// MB.53: where impersonation is registered, each non-admin row carries the
// control; the endpoint is the guard, and these only put it where an admin looks.
describe('UserList impersonation', () => {
  afterEach(() => {
    impersonateUserMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('offers no control where impersonation is off', () => {
    render(<UserList {...props()} />);

    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Impersonate' })).not.toBeInTheDocument();
  });

  it('offers it on each non-admin row, naming the user, and on no admin row', () => {
    render(<UserList {...props({ canImpersonate: true })} />);

    expect(screen.getByRole('columnheader', { name: 'Impersonate' })).toBeInTheDocument();
    const bo = screen.getByRole('row', { name: /Bo Fixturewort/ });
    expect(within(bo).getByRole('button', { name: 'Impersonate Bo Fixturewort' })).toBeEnabled();
    const ada = screen.getByRole('row', { name: /Ada Fixturewort/ });
    expect(within(ada).queryByRole('button')).not.toBeInTheDocument();
  });

  it('impersonates the row’s user and opens the site as them', async () => {
    impersonateUserMock.mockResolvedValue({ data: {}, error: null });
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ canImpersonate: true })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(impersonateUserMock).toHaveBeenCalledWith({ userId: BO.id });
  });

  it('says so in the row when the endpoint refuses, and stays on the page', async () => {
    impersonateUserMock.mockResolvedValue({
      data: null,
      error: { status: 403, message: 'You cannot impersonate admins' },
    });
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ canImpersonate: true })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    const bo = screen.getByRole('row', { name: /Bo Fixturewort/ });
    expect(await within(bo).findByRole('alert')).toHaveTextContent(
      'Bo Fixturewort could not be impersonated.',
    );
    expect(assignMock).not.toHaveBeenCalled();
  });
});

// MB.53, on the owner's word: Filter is offered only when there is a new
// filter to apply, and the address it opens carries a bare `awaiting`.
describe('UserList filter', () => {
  afterEach(() => {
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  const filterButton = () => screen.getByRole('button', { name: 'Filter' });

  it('is disabled while the form matches the filter shown', () => {
    render(<UserList {...props({ query: 'bo', awaitingApproval: true })} />);

    expect(filterButton()).toBeDisabled();
  });

  it('enables once the query differs, and disables again when it is put back', () => {
    render(<UserList {...props({ query: 'bo' })} />);
    const box = screen.getByLabelText('Name or email');

    fireEvent.change(box, { target: { value: 'bob' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'bo ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once the checkbox differs, and disables again when it is put back', () => {
    render(<UserList {...props()} />);
    const awaiting = screen.getByLabelText('Awaiting approval only');

    fireEvent.click(awaiting);
    expect(filterButton()).toBeEnabled();

    fireEvent.click(awaiting);
    expect(filterButton()).toBeDisabled();
  });

  it('opens the filtered page from the first, with a bare awaiting', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ previousHref: '/admin/users?before=x' })} />);

    fireEvent.change(screen.getByLabelText('Name or email'), { target: { value: ' Fixture B ' } });
    fireEvent.click(screen.getByLabelText('Awaiting approval only'));
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/users?query=Fixture+B&awaiting');
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ query: 'bo', awaitingApproval: true })} />);

    fireEvent.change(screen.getByLabelText('Name or email'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Awaiting approval only'));
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/users');
  });
});
