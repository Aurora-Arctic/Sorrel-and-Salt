import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserList, { PauseControl } from '@/components/UserList';
import type { UserListProps } from '@/components/UserList/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

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
  primaryAdmin: false,
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
  primaryAdmin: false,
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
  it('shows a row per user, in the order given, with its address, its coven-creation flag and its signup date', () => {
    render(<UserList {...props()} />);

    const [, ada, bo] = screen.getAllByRole('row');
    for (const [row, user, date] of [
      [ada, ADA, '2026-03-04'],
      [bo, BO, '2026-05-06'],
    ] as const) {
      expect(row).toHaveTextContent(user.name);
      expect(row).toHaveTextContent(user.email);
      expect(row).toHaveTextContent(date);
    }
    // The mark's word is the flag's one rendering: an admin holds it, Bo does not.
    expect(within(within(ada).getAllByRole('cell')[3]).getByText('Yes')).toBeInTheDocument();
    expect(within(within(bo).getAllByRole('cell')[3]).getByText('No')).toBeInTheDocument();
  });

  // MB.200: each row opens the privilege ledger narrowed to its user, an
  // admin's included, from an icon before the name.
  describe('the history link', () => {
    it('leads every name, to the ledger searched for that user’s address', () => {
      render(<UserList {...props()} />);

      for (const user of props().users) {
        const row = screen.getByRole('row', { name: new RegExp(user.name) });
        const link = within(row).getByRole('link', {
          name: `Permissions history for ${user.name}`,
        });
        expect(link).toHaveAttribute(
          'href',
          `/admin/privilege-changes?query=${encodeURIComponent(user.email)}`,
        );
        expect(within(row).getAllByRole('cell')[0]).toContainElement(link);
      }
    });

    // Every address is held lower-cased; the link does not rely on that.
    it('searches for the address lower-cased', () => {
      render(<UserList {...props({ users: [{ ...ADA, email: 'Ada@Users.Test' }] })} />);

      expect(
        screen.getByRole('link', { name: 'Permissions history for Ada Fixturewort' }),
      ).toHaveAttribute('href', '/admin/privilege-changes?query=ada%40users.test');
    });
  });

  it('names a provider outside the roster by its id rather than dropping it', () => {
    render(<UserList {...props({ users: [{ ...BO, providers: ['github'] }] })} />);

    expect(cellsOf('Bo Fixturewort')[4]).toBe('github');
  });

  it('draws no table when no user matches', () => {
    render(<UserList {...props({ users: [], query: 'nobody' })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('filters by a GET search to the page itself, keeping what was asked', () => {
    render(<UserList {...props({ query: 'fixturewort', awaitingApproval: true })} />);

    // The <search> landmark around it is the e2e spec's to find: jsdom's role
    // table predates the element, and a browser's does not. The action and
    // method are what a submit before hydration uses.
    const search = screen.getByRole('form', { name: 'Filter users' });
    expect(search).toHaveAttribute('action', '/admin/users');
    expect(search).toHaveAttribute('method', 'get');
    expect(within(search).getByLabelText('Name or Email')).toHaveValue('fixturewort');
    expect(within(search).getByLabelText('Name or Email')).toHaveAttribute('name', 'query');
    expect(within(search).getByLabelText('Needs Approval')).toBeChecked();
    expect(within(search).getByLabelText('Needs Approval')).toHaveAttribute('name', 'awaiting');
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
    const impersonate = within(bo).getByRole('button', { name: 'Impersonate Bo Fixturewort' });
    expect(impersonate).toBeEnabled();
    const ada = screen.getByRole('row', { name: /Ada Fixturewort/ });
    expect(within(ada).queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
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
    expect(await within(bo).findByRole('alert')).toBeVisible();
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
    const box = screen.getByLabelText('Name or Email');

    fireEvent.change(box, { target: { value: 'bob' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'bo ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('opens the filtered page from the first, with a bare awaiting', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ previousHref: '/admin/users?before=x' })} />);

    fireEvent.change(screen.getByLabelText('Name or Email'), { target: { value: ' Fixture B ' } });
    fireEvent.click(screen.getByLabelText('Needs Approval'));
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/users?query=Fixture+B&awaiting');
  });

  it('narrows by role, from a native select that starts at the role shown', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ role: 'admin' })} />);

    const role = screen.getByLabelText('Role');
    expect(role).toHaveValue('admin');
    expect(role).toHaveAttribute('name', 'role');
    expect(
      within(role)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', 'admin', 'user']);
    expect(filterButton()).toBeDisabled();

    fireEvent.change(role, { target: { value: 'user' } });
    expect(filterButton()).toBeEnabled();
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/users?role=user');
  });

  it('opens the unfiltered list when the filter is cleared', () => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<UserList {...props({ query: 'bo', awaitingApproval: true })} />);

    fireEvent.change(screen.getByLabelText('Name or Email'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Needs Approval'));
    fireEvent.click(filterButton());

    expect(assignMock).toHaveBeenCalledWith('/admin/users');
  });
});

// M5.8: a user who may not yet create a coven is approved from their row, and
// one who may is revoked, each behind a confirmation naming them; an admin's
// row offers neither. The service is the guard; these put the control where an
// admin looks, and show what the mutation answers.
describe('UserList approval', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const boRow = () => screen.getByRole('row', { name: /Bo Fixturewort/ });

  it('offers Approve on the row of a user awaiting approval, naming them, and nothing on an admin', () => {
    render(<UserList {...props()} />);

    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toBeEnabled();
    expect(within(boRow()).queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument();
    const ada = screen.getByRole('row', { name: /Ada Fixturewort/ });
    expect(
      within(ada).queryByRole('button', { name: /Approve|Revoke approval/ }),
    ).not.toBeInTheDocument();
  });

  it('offers Revoke on the row of a user who may create a coven, and no Approve', () => {
    render(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);

    const revoke = within(boRow()).getByRole('button', {
      name: 'Revoke approval for Bo Fixturewort',
    });
    expect(revoke).toBeEnabled();
    expect(within(boRow()).queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  });

  const dialog = (title: string) => screen.getByRole('dialog', { name: title });

  it('asks before approving, in a modal, and Cancel closes it with nothing sent', () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));

    const asking = dialog('Approve Coven Creation');
    expect(asking).toHaveTextContent('Bo Fixturewort');
    expect(within(asking).getByRole('button', { name: 'Approve' })).toHaveFocus();
    fireEvent.click(within(asking).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toHaveFocus();
    expect(calls).toEqual([]);
  });

  // MB.205: an unverified address is said in the confirmation, read with its
  // Approve, since the focus lands there; a warning, not a refusal.

  it('warns before approving a user whose email is unverified, and still approves', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);
    // The precondition: Bo's address is unverified, as the row's mark says,
    // the mark's word being the flag's one rendering.
    expect(within(boRow()).getAllByRole('cell')[1]).toHaveTextContent(/^Unverified/);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));

    const approve = within(dialog('Approve Coven Creation')).getByRole('button', {
      name: 'Approve',
    });
    expect(approve).toHaveFocus();
    expect(approve).toHaveAccessibleDescription(/\S/);
    fireEvent.click(approve);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('gives no warning before revoking, even from a user whose email is unverified', () => {
    render(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);

    fireEvent.click(
      within(boRow()).getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    );

    expect(
      within(dialog('Revoke Coven Creation')).getByRole('button', { name: 'Revoke' }),
    ).not.toHaveAccessibleDescription();
  });

  // The owner's call, beside MB.59's: each confirmation takes the same
  // optional reason, sent trimmed, or not at all when blank.
  it('approves with a reason, and revokes with one', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    mockGraphQLMutation('RevokeWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { revokeWorkspaceCreation: { id: BO.id, canCreateWorkspace: false } };
    });
    const { rerender } = render(<UserList {...props()} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    const approving = dialog('Approve Coven Creation');
    const reason = within(approving).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Runs the Tuesday circle ' } });
    fireEvent.click(within(approving).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));

    rerender(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);
    fireEvent.click(
      within(boRow()).getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    );
    const revoking = dialog('Revoke Coven Creation');
    fireEvent.change(within(revoking).getByRole('textbox', { name: 'Reason' }), {
      target: { value: '   ' },
    });
    fireEvent.click(within(revoking).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(2));

    expect(calls).toEqual([{ userId: BO.id, note: 'Runs the Tuesday circle' }, { userId: BO.id }]);
  });

  it('approves the row’s user from the modal, busy until the list is read again', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    const busy = within(dialog('Approve Coven Creation')).getByRole('button', { name: 'Approve' });
    fireEvent.click(busy);

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('says why in the row when the service refuses, and offers Approve again', async () => {
    mockGraphQLError('GrantWorkspaceCreation', {
      code: 'FORBIDDEN',
      message: 'Bo Fixturewort may already create a coven',
    });
    render(<UserList {...props()} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    fireEvent.click(
      within(dialog('Approve Coven Creation')).getByRole('button', { name: 'Approve' }),
    );

    expect(await within(boRow()).findByRole('alert')).toBeVisible();
    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('revokes from a modal naming the user, busy until the list is read again', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('RevokeWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { revokeWorkspaceCreation: { id: BO.id, canCreateWorkspace: false } };
    });
    render(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);

    fireEvent.click(
      within(boRow()).getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    );

    const asking = dialog('Revoke Coven Creation');
    expect(asking).toHaveTextContent('Bo Fixturewort');
    const confirm = within(asking).getByRole('button', { name: 'Revoke' });
    expect(confirm).toHaveFocus();
    fireEvent.click(confirm);

    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });
});

// MB.59: the role cell's Grant or Revoke, each asking first in a modal naming
// the user, with an optional reason; the primary admin's Revoke in view but
// unusable, saying why. The service is the guard, and refuses the same.
describe('UserList admin role', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });
  const dialog = (title: string) => screen.getByRole('dialog', { name: title });

  it('offers Grant on a user’s row and Revoke on an admin’s, each naming the user', () => {
    render(<UserList {...props()} />);

    const grant = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Grant admin to Bo Fixturewort',
    });
    expect(grant).toBeEnabled();
    const revoke = within(row('Ada Fixturewort')).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });
    expect(revoke).toBeEnabled();
    expect(revoke).not.toHaveAttribute('aria-disabled');
    // Nobody here is the primary admin.
    expect(screen.queryByRole('button', { name: 'Primary Admin' })).not.toBeInTheDocument();
  });

  it('grants from a modal naming the user, sending the reason, busy until the list is read again', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: BO.id, role: 'admin', canCreateWorkspace: true } };
    });
    render(<UserList {...props({ users: [{ ...BO, emailVerified: true }] })} />);

    fireEvent.click(
      within(row('Bo Fixturewort')).getByRole('button', { name: 'Grant admin to Bo Fixturewort' }),
    );

    const asking = dialog('Grant Admin');
    expect(asking).toHaveTextContent('Bo Fixturewort');
    const confirm = within(asking).getByRole('button', { name: 'Grant' });
    expect(confirm).toHaveFocus();
    expect(confirm).not.toHaveAccessibleDescription();
    const reason = within(asking).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Curates the planets  ' } });
    fireEvent.click(confirm);

    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id, role: 'admin', note: 'Curates the planets' }]);
  });

  it('sends no reason when none is given, and Cancel closes the modal with nothing sent', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: ADA.id, role: 'user', canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);
    const open = within(row('Ada Fixturewort')).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });

    fireEvent.click(open);
    fireEvent.click(within(dialog('Revoke Admin')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
    expect(calls).toEqual([]);

    fireEvent.click(open);
    const asking = dialog('Revoke Admin');
    expect(asking).toHaveTextContent('Ada Fixturewort');
    fireEvent.click(within(asking).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: ADA.id, role: 'user' }]);
  });

  // MB.205's warning, in Grant's words: a grant vouches as an approval does.
  it('warns before granting to a user whose email is unverified, and still grants', async () => {
    mockGraphQLMutation('SetUserRole', () => ({
      setUserRole: { id: BO.id, role: 'admin', canCreateWorkspace: true },
    }));
    render(<UserList {...props()} />);
    expect(within(row('Bo Fixturewort')).getAllByRole('cell')[1]).toHaveTextContent(/^Unverified/);

    fireEvent.click(
      within(row('Bo Fixturewort')).getByRole('button', { name: 'Grant admin to Bo Fixturewort' }),
    );

    const confirm = within(dialog('Grant Admin')).getByRole('button', { name: 'Grant' });
    expect(confirm).toHaveAccessibleDescription(/\S/);
    fireEvent.click(confirm);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('says why in the row when the service refuses, and offers Revoke again', async () => {
    mockGraphQLError('SetUserRole', {
      code: 'FORBIDDEN',
      message:
        'Ada Fixturewort is the last admin, and the site needs one. Make someone else an admin first.',
    });
    render(<UserList {...props()} />);

    fireEvent.click(
      within(row('Ada Fixturewort')).getByRole('button', {
        name: 'Revoke admin from Ada Fixturewort',
      }),
    );
    fireEvent.click(within(dialog('Revoke Admin')).getByRole('button', { name: 'Revoke' }));

    expect(await within(row('Ada Fixturewort')).findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('marks the primary admin with a crown, whose Revoke is in view but aria-disabled, described by the reason', () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: ADA.id, role: 'user', canCreateWorkspace: true } };
    });
    render(<UserList {...props({ users: [{ ...ADA, primaryAdmin: true }, BO] })} />);
    const primary = row('Ada Fixturewort');

    expect(within(primary).getByRole('button', { name: 'Primary Admin' })).toBeInTheDocument();

    const revoke = within(primary).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });
    // In view and reachable, not `disabled`, and described by the reason.
    expect(revoke).toBeVisible();
    expect(revoke).toBeEnabled();
    expect(revoke).toHaveAttribute('aria-disabled', 'true');
    expect(revoke).toHaveAccessibleDescription(/\S/);
    expect(within(primary).queryByRole('alert')).not.toBeInTheDocument();
    // Only the primary admin's row is marked.
    expect(
      within(row('Bo Fixturewort')).queryByRole('button', { name: 'Primary Admin' }),
    ).not.toBeInTheDocument();
  });

  it('states the reason when the primary admin’s Revoke is tried, opening nothing and sending nothing', () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: ADA.id, role: 'user', canCreateWorkspace: true } };
    });
    render(<UserList {...props({ users: [{ ...ADA, primaryAdmin: true }] })} />);
    const primary = row('Ada Fixturewort');
    const revoke = within(primary).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });

    fireEvent.click(revoke);

    // The tip opens, as an alert.
    expect(within(primary).getByRole('alert')).toBeVisible();
    expect(within(primary).getByRole('alert')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A second try says it again, as a fresh alert.
    fireEvent.click(revoke);
    expect(within(primary).getByRole('alert')).toBeVisible();
    expect(calls).toEqual([]);
  });
});

// MB.63: the primary admin's switch on admin changes, its state in words; to
// any other admin the control is in view but unusable, saying why.
describe('UserList admin changes switch', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  // The paused notice is a plain paragraph before the switch, the state's one
  // rendering; while changes are on, the switch stands alone.
  it('lets the primary admin pause, stating that changes are on, busy until the page is read again', async () => {
    let calls = 0;
    mockGraphQLMutation('PauseAdminRoleChanges', () => {
      calls += 1;
      return { pauseAdminRoleChanges: true };
    });
    render(<PauseControl paused={false} canToggle={true} />);

    // No sentence while changes are on, on the owner's call: only the button.
    const pause = screen.getByRole('button', { name: 'Pause Admin Changes' });
    expect(pause.previousElementSibling).toBeNull();
    expect(pause).not.toHaveAttribute('aria-disabled');
    fireEvent.click(pause);

    expect(pause).toBeDisabled();
    expect(pause).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('lets the primary admin resume, stating that changes are paused', async () => {
    let calls = 0;
    mockGraphQLMutation('ResumeAdminRoleChanges', () => {
      calls += 1;
      return { resumeAdminRoleChanges: false };
    });
    render(<PauseControl paused={true} canToggle={true} />);

    const resume = screen.getByRole('button', { name: 'Resume Admin Changes' });
    expect(resume.previousElementSibling).toHaveTextContent(/\S/);
    fireEvent.click(resume);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('says why beside the switch when the service refuses, and offers it again', async () => {
    mockGraphQLError('PauseAdminRoleChanges', {
      code: 'FORBIDDEN',
      message: 'Only the primary admin may pause or resume admin changes',
    });
    render(<PauseControl paused={false} canToggle={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause Admin Changes' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pause Admin Changes' })).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('shows another admin the state and the switch, aria-disabled, stating why when tried and sending nothing', () => {
    let calls = 0;
    mockGraphQLMutation('PauseAdminRoleChanges', () => {
      calls += 1;
      return { pauseAdminRoleChanges: true };
    });
    render(<PauseControl paused={false} canToggle={false} />);

    const pause = screen.getByRole('button', { name: 'Pause Admin Changes' });
    expect(pause).toBeEnabled();
    expect(pause).toHaveAttribute('aria-disabled', 'true');
    expect(pause).toHaveAccessibleDescription(/\S/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(pause);

    expect(screen.getByRole('alert')).toBeVisible();
    expect(calls).toBe(0);
  });

  // One sentence on the page, on the owner's call: the notice; the switch's
  // own reason is in its tip.
  it('shows another admin the paused notice and a locked Resume whose reason is a tip', () => {
    render(<PauseControl paused canToggle={false} />);

    const resume = screen.getByRole('button', { name: 'Resume Admin Changes' });
    // The locked control wraps the button with its tip; the notice stands before it.
    expect(resume.parentElement?.previousElementSibling).toHaveTextContent(/\S/);
    expect(resume).toHaveAttribute('aria-disabled', 'true');
    expect(resume).toHaveAccessibleDescription(/\S/);
    expect(screen.getByRole('tooltip', { hidden: true })).toBeInTheDocument();
  });
});

// MB.63: while admin changes are paused, an admin the pause binds sees every
// Grant and Revoke in view but unusable, saying why; the primary admin, whom
// the pause exempts, keeps them. The service refuses the same.
describe('UserList admin role while admin changes are paused', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

  it('locks Grant and Revoke for another admin, each described by the reason, opening and sending nothing', () => {
    let calls = 0;
    mockGraphQLMutation('SetUserRole', () => {
      calls += 1;
      return { setUserRole: { id: BO.id, role: 'admin', canCreateWorkspace: true } };
    });
    render(<UserList {...props({ adminChanges: { paused: true, canToggle: false } })} />);

    const grant = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Grant admin to Bo Fixturewort',
    });
    const revoke = within(row('Ada Fixturewort')).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });
    for (const button of [grant, revoke]) {
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription(/\S/);
    }

    fireEvent.click(grant);

    expect(within(row('Bo Fixturewort')).getByRole('alert')).toBeVisible();
    fireEvent.click(revoke);
    expect(within(row('Ada Fixturewort')).getByRole('alert')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });

  // Amended on the owner's call: coven creation's Approve and Revoke pause too.
  it('locks Approve and Revoke of coven creation for another admin, opening and sending nothing', () => {
    let calls = 0;
    mockGraphQLMutation('GrantWorkspaceCreation', () => {
      calls += 1;
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(
      <UserList
        {...props({
          users: [BO, { ...BO, id: 'u-cy', name: 'Cy Fixturewort', canCreateWorkspace: true }],
          adminChanges: { paused: true, canToggle: false },
        })}
      />,
    );

    const approve = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Approve Bo Fixturewort',
    });
    const revoke = within(row('Cy Fixturewort')).getByRole('button', {
      name: 'Revoke approval for Cy Fixturewort',
    });
    for (const button of [approve, revoke]) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription(/\S/);
    }

    fireEvent.click(approve);

    expect(within(row('Bo Fixturewort')).getAllByRole('alert')[0]).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('leaves the primary admin’s Approve usable while paused', () => {
    render(
      <UserList {...props({ users: [BO], adminChanges: { paused: true, canToggle: true } })} />,
    );

    fireEvent.click(
      within(row('Bo Fixturewort')).getByRole('button', { name: 'Approve Bo Fixturewort' }),
    );

    expect(screen.getByRole('dialog', { name: 'Approve Coven Creation' })).toBeInTheDocument();
  });

  it('locks nothing while changes are on', () => {
    render(<UserList {...props({ adminChanges: { paused: false, canToggle: false } })} />);

    for (const name of ['Grant admin to Bo Fixturewort', 'Revoke admin from Ada Fixturewort']) {
      expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled');
    }
  });

  // The primary admin's own reason holds whether or not changes are paused:
  // which of the two reasons won is told by its words alone.
  it('keeps the primary admin’s Revoke on its own reason while paused', () => {
    render(
      <UserList
        {...props({
          users: [{ ...ADA, primaryAdmin: true }, BO],
          adminChanges: { paused: true, canToggle: false },
        })}
      />,
    );

    expect(
      within(row('Ada Fixturewort')).getByRole('button', {
        name: 'Revoke admin from Ada Fixturewort',
      }),
    ).toHaveAccessibleDescription(/^This is the primary admin/);
  });
});
