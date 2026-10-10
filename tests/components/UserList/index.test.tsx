import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserList from '@/components/UserList';
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
  it('heads a column for each fact an admin judges a user by', () => {
    render(<UserList {...props()} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      'Name',
      'Email',
      'Role',
      'Sign-In Methods',
      'Signed Up',
      'Coven Creation',
    ]);
  });

  it('shows a row per user, in the order given', () => {
    render(<UserList {...props()} />);

    expect(cellsOf('Ada Fixturewort')).toEqual([
      'Ada Fixturewort',
      // The verified mark's word, for the reader and in its tip, then the address.
      'VerifiedVerifiedada@users.test',
      // The role, then the control that changes it, in one cell (MB.59).
      'AdminRevoke',
      // Each logo's name, for the reader and in its tip.
      'DiscordDiscordGoogleGoogle',
      '2026-03-04',
      // The mark alone, no control: an admin holds the flag.
      'Yes',
    ]);
    expect(cellsOf('Bo Fixturewort')).toEqual([
      'Bo Fixturewort',
      'UnverifiedUnverifiedbo@users.test',
      'UserGrant',
      // No sign-in method is an empty cell.
      '',
      '2026-05-06',
      // The mark, then the control that changes it, in one cell.
      'NoApprove',
    ]);
    // An admin's role in bold, a user's not.
    expect(
      within(screen.getByRole('row', { name: /Ada Fixturewort/ })).getByText('Admin').tagName,
    ).toBe('STRONG');
    expect(
      within(screen.getByRole('row', { name: /Bo Fixturewort/ })).getByText('User').tagName,
    ).toBe('SPAN');
  });

  // The owner's call: a green check or a red cross, the word kept for a
  // screen reader since the mark is drawn alone.
  it('marks a yes with a green check and a no with a red cross, each saying its word', () => {
    render(<UserList {...props()} />);

    const bo = within(screen.getByRole('row', { name: /Bo Fixturewort/ })).getAllByRole('cell');
    const ada = within(screen.getByRole('row', { name: /Ada Fixturewort/ })).getAllByRole('cell');
    // The address's, its word in a tip bubble on hover too, since its heading
    // says Email: the bubble is the eye's copy, the hidden word the reader's.
    const unverified = within(bo[1] as HTMLElement).getByText('Unverified', {
      selector: '.visually-hidden',
    }).parentElement as HTMLElement;
    expect(unverified).toHaveClass('user-list__mark--no', 'user-list__hint');
    expect(unverified.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    const tip = unverified.querySelector('.user-list__tip');
    expect(tip).toHaveTextContent('Unverified');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(
      within(ada[1] as HTMLElement).getByText('Verified', { selector: '.visually-hidden' })
        .parentElement,
    ).toHaveClass('user-list__mark--yes');
    // The creation flag's, whose heading already asks the question: no tooltip.
    const no = within(bo[5] as HTMLElement).getByText('No');
    expect(no).toHaveClass('visually-hidden');
    expect(no.parentElement).toHaveClass('user-list__mark--no');
    expect(no.parentElement?.querySelector('.user-list__tip')).toBeNull();
    expect(within(ada[5] as HTMLElement).getByText('Yes').parentElement).toHaveClass(
      'user-list__mark--yes',
    );
  });

  it('dates the signup with a machine-readable time', () => {
    render(<UserList {...props()} />);

    const time = within(screen.getByRole('row', { name: /Ada/ })).getByText('2026-03-04');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-03-04T05:06:07.000Z');
  });

  // The owner's call: logos, not names, each named on hover and to a reader.
  it('shows each linked provider as its logo, named in a tip and for a screen reader', () => {
    render(<UserList {...props()} />);

    const methods = within(screen.getByRole('row', { name: /Ada Fixturewort/ })).getAllByRole(
      'cell',
    )[3] as HTMLElement;
    const logos = [...methods.querySelectorAll('.user-list__provider')];
    expect(logos.map((logo) => logo.className)).toEqual([
      'user-list__hint user-list__provider user-list__provider--discord',
      'user-list__hint user-list__provider user-list__provider--google',
    ]);
    for (const [logo, name] of [
      [logos[0], 'Discord'],
      [logos[1], 'Google'],
    ] as const) {
      expect(logo?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(logo?.querySelector('.visually-hidden')).toHaveTextContent(name);
      const tip = logo?.querySelector('.user-list__tip');
      expect(tip).toHaveTextContent(name);
      expect(tip).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('names a provider outside the roster by its id rather than dropping it', () => {
    render(<UserList {...props({ users: [{ ...BO, providers: ['github'] }] })} />);

    expect(cellsOf('Bo Fixturewort')[3]).toBe('github');
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
    expect(within(search).getByLabelText('Name or Email')).toHaveValue('fixturewort');
    expect(within(search).getByLabelText('Name or Email')).toHaveAttribute('name', 'query');
    expect(within(search).getByLabelText('Needs Approval')).toBeChecked();
    expect(within(search).getByLabelText('Needs Approval')).toHaveAttribute('name', 'awaiting');
  });

  it('links the pages either side, and disables an end that has none', () => {
    const { rerender } = render(<UserList {...props()} />);
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();

    rerender(<UserList {...props({ nextHref: '/admin/users?after=next' })} />);
    let pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(pages).getByRole('link', { name: 'Prev' })).not.toHaveAttribute('href');
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/admin/users?after=next',
    );

    rerender(<UserList {...props({ previousHref: '/admin/users?before=previous' })} />);
    pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      '/admin/users?before=previous',
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).not.toHaveAttribute('href');
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

    // The column is tinted red and its button is red: it acts as someone else.
    expect(screen.getByRole('columnheader', { name: 'Impersonate' })).toHaveClass(
      'user-list__impersonate',
    );
    const bo = screen.getByRole('row', { name: /Bo Fixturewort/ });
    const impersonate = within(bo).getByRole('button', { name: 'Impersonate Bo Fixturewort' });
    expect(impersonate).toBeEnabled();
    expect(impersonate).toHaveClass('btn--destructive', 'btn--small');
    expect(impersonate.closest('td')).toHaveClass('user-list__impersonate');
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
    const box = screen.getByLabelText('Name or Email');

    fireEvent.change(box, { target: { value: 'bob' } });
    expect(filterButton()).toBeEnabled();

    fireEvent.change(box, { target: { value: 'bo ' } });
    expect(filterButton()).toBeDisabled();
  });

  it('enables once the checkbox differs, and disables again when it is put back', () => {
    render(<UserList {...props()} />);
    const awaiting = screen.getByLabelText('Needs Approval');

    fireEvent.click(awaiting);
    expect(filterButton()).toBeEnabled();

    fireEvent.click(awaiting);
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
        .map((option) => option.textContent),
    ).toEqual(['All roles', 'Admin', 'User']);
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
    // The table's own size, so a row is no taller than its text, and quiet:
    // Revoke is the red one.
    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toHaveClass(
      'btn--small',
      'btn--quiet',
    );
    const ada = screen.getByRole('row', { name: /Ada Fixturewort/ });
    expect(within(ada).getAllByRole('cell')[5]).toHaveTextContent(/^Yes$/);
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
    // Red, since it takes something away; Approve is the quiet one.
    expect(revoke).toHaveClass('btn--destructive');
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
    expect(asking).toHaveTextContent('Let Bo Fixturewort create covens?');
    // The name in bold, on the owner's call.
    expect(within(asking).getByText('Bo Fixturewort').tagName).toBe('STRONG');
    expect(within(asking).getByRole('button', { name: 'Approve' })).toHaveFocus();
    fireEvent.click(within(asking).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toHaveFocus();
    expect(calls).toEqual([]);
  });

  // MB.205: an unverified address is said in the confirmation, read with its
  // Approve, since the focus lands there; a warning, not a refusal.
  const UNVERIFIED_WARNING =
    'This email address has not been verified, so nobody has proved who holds it. Approving keeps the account rather than letting it lapse.';

  it('warns before approving a user whose email is unverified, and still approves', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);
    // The precondition: Bo's address is unverified, as the row's mark says.
    expect(within(boRow()).getAllByRole('cell')[1]).toHaveTextContent(/^Unverified/);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));

    const asking = dialog('Approve Coven Creation');
    expect(asking).toHaveTextContent(`Let Bo Fixturewort create covens?${UNVERIFIED_WARNING}`);
    const approve = within(asking).getByRole('button', { name: 'Approve' });
    expect(approve).toHaveFocus();
    expect(approve).toHaveAccessibleDescription(UNVERIFIED_WARNING);
    expect(within(asking).getByText(UNVERIFIED_WARNING)).toHaveClass('notice', 'notice--warn');
    fireEvent.click(approve);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('gives no warning before approving a user whose email is verified', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props({ users: [{ ...BO, emailVerified: true }] })} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));

    const asking = dialog('Approve Coven Creation');
    expect(asking).toHaveTextContent(
      /^Approve Coven Creation×Let Bo Fixturewort create covens\?Reason/,
    );
    expect(within(asking).queryByText(UNVERIFIED_WARNING)).not.toBeInTheDocument();
    const approve = within(asking).getByRole('button', { name: 'Approve' });
    expect(approve).not.toHaveAccessibleDescription();
    fireEvent.click(approve);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('gives no warning before revoking, even from a user whose email is unverified', () => {
    render(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);

    fireEvent.click(
      within(boRow()).getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    );

    const asking = dialog('Revoke Coven Creation');
    expect(within(asking).queryByText(UNVERIFIED_WARNING)).not.toBeInTheDocument();
    expect(
      within(asking).getByRole('button', { name: 'Revoke' }),
    ).not.toHaveAccessibleDescription();
  });

  // The owner's call, beside MB.59's: each confirmation takes the same
  // optional reason, sent trimmed, or not at all when blank.
  it('approves with a reason, the field under the unverified warning, and revokes with one', async () => {
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
    expect(reason).toHaveAccessibleDescription(/^Optional\./);
    // Below the warning, which keeps its own spacing class.
    const warning = within(approving).getByText(UNVERIFIED_WARNING);
    expect(warning).toHaveClass('notice', 'user-list__warning');
    expect(warning.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    fireEvent.click(
      within(dialog('Approve Coven Creation')).getByRole('button', { name: 'Approve' }),
    );

    const busy = within(dialog('Approve Coven Creation')).getByRole('button', {
      name: 'Approving',
    });
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

    expect(await within(boRow()).findByRole('alert')).toHaveTextContent(
      'Bo Fixturewort may already create a coven',
    );
    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('revokes from a modal whose red Revoke says their covens stay theirs', async () => {
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
    expect(asking).toHaveTextContent(
      'Stop Bo Fixturewort from creating covens? Covens they own stay theirs.',
    );
    expect(within(asking).getByText('Bo Fixturewort').tagName).toBe('STRONG');
    const confirm = within(asking).getByRole('button', { name: 'Revoke' });
    expect(confirm).toHaveFocus();
    expect(confirm).toHaveClass('btn--destructive');
    fireEvent.click(confirm);

    expect(within(asking).getByRole('button', { name: 'Revoking' })).toBeDisabled();
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  // The refresh re-renders the same row with the flag turned over; the
  // control must start afresh rather than stay busy under the other action.
  it('offers Revoke, idle, once the refreshed row says the user was approved', async () => {
    mockGraphQLMutation('GrantWorkspaceCreation', () => ({
      grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true },
    }));
    const { rerender } = render(<UserList {...props()} />);
    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    fireEvent.click(
      within(dialog('Approve Coven Creation')).getByRole('button', { name: 'Approve' }),
    );
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));

    rerender(<UserList {...props({ users: [ADA, { ...BO, canCreateWorkspace: true }] })} />);

    expect(
      within(boRow()).getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    ).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
  const PRIMARY_REASON =
    "This is the primary admin and can't be removed. Changing who the primary admin is takes a change to the site's configuration.";

  it('offers Grant on a user’s row and Revoke on an admin’s, each naming the user', () => {
    render(<UserList {...props()} />);

    const grant = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Grant admin to Bo Fixturewort',
    });
    expect(grant).toBeEnabled();
    expect(grant).toHaveClass('btn--small', 'btn--quiet');
    const revoke = within(row('Ada Fixturewort')).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });
    expect(revoke).toBeEnabled();
    expect(revoke).not.toHaveAttribute('aria-disabled');
    expect(revoke).toHaveClass('btn--small', 'btn--destructive');
    // Nobody here is the primary admin.
    expect(screen.queryByText('Primary Admin')).not.toBeInTheDocument();
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
    expect(asking).toHaveTextContent('Make Bo Fixturewort an admin?');
    expect(within(asking).getByText('Bo Fixturewort').tagName).toBe('STRONG');
    const confirm = within(asking).getByRole('button', { name: 'Grant' });
    expect(confirm).toHaveFocus();
    expect(confirm).toHaveClass('btn--solid');
    expect(confirm).not.toHaveAccessibleDescription();
    const reason = within(asking).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/^Optional\./);
    fireEvent.change(reason, { target: { value: '  Curates the planets  ' } });
    fireEvent.click(confirm);

    const busy = within(dialog('Grant Admin')).getByRole('button', { name: 'Granting' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
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
    expect(asking).toHaveTextContent(
      'Stop Ada Fixturewort being an admin? They keep their covens, and everything they wrote stays as it is.',
    );
    const confirm = within(asking).getByRole('button', { name: 'Revoke' });
    expect(confirm).toHaveClass('btn--destructive');
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: ADA.id, role: 'user' }]);
  });

  // MB.205's warning, in Grant's words: a grant vouches as an approval does.
  it('warns before granting to a user whose email is unverified, and still grants', async () => {
    const warning =
      'This email address has not been verified, so nobody has proved who holds it. Granting keeps the account rather than letting it lapse.';
    mockGraphQLMutation('SetUserRole', () => ({
      setUserRole: { id: BO.id, role: 'admin', canCreateWorkspace: true },
    }));
    render(<UserList {...props()} />);
    expect(within(row('Bo Fixturewort')).getAllByRole('cell')[1]).toHaveTextContent(/^Unverified/);

    fireEvent.click(
      within(row('Bo Fixturewort')).getByRole('button', { name: 'Grant admin to Bo Fixturewort' }),
    );

    const asking = dialog('Grant Admin');
    const confirm = within(asking).getByRole('button', { name: 'Grant' });
    expect(confirm).toHaveAccessibleDescription(warning);
    expect(within(asking).getByText(warning)).toHaveClass(
      'notice',
      'notice--warn',
      'user-list__warning',
    );
    fireEvent.click(confirm);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('gives no warning before revoking, even from an admin whose email is unverified', () => {
    render(<UserList {...props({ users: [{ ...ADA, emailVerified: false }] })} />);

    fireEvent.click(
      within(row('Ada Fixturewort')).getByRole('button', {
        name: 'Revoke admin from Ada Fixturewort',
      }),
    );

    expect(
      within(dialog('Revoke Admin')).getByRole('button', { name: 'Revoke' }),
    ).not.toHaveAccessibleDescription();
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

    expect(await within(row('Ada Fixturewort')).findByRole('alert')).toHaveTextContent(
      'Ada Fixturewort is the last admin',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('marks the primary admin with a crown, whose Revoke is in view but aria-disabled, the reason in a tip', () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: ADA.id, role: 'user', canCreateWorkspace: true } };
    });
    render(<UserList {...props({ users: [{ ...ADA, primaryAdmin: true }, BO] })} />);
    const primary = row('Ada Fixturewort');

    // The crown is named, and its tip opens on focus and closes on Escape.
    const crown = within(primary).getByRole('button', { name: 'Primary Admin' });
    const crownTip = within(primary).getByText('Primary Admin');
    expect(crownTip).toHaveAttribute('aria-hidden', 'true');
    fireEvent.focus(crown);
    expect(crownTip).toHaveAttribute('aria-hidden', 'false');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(crownTip).toHaveAttribute('aria-hidden', 'true');

    const revoke = within(primary).getByRole('button', {
      name: 'Revoke admin from Ada Fixturewort',
    });
    // In view and reachable, not `disabled`, and described by the reason,
    // which is in a tip, closed until the button is hovered or focused.
    expect(revoke).toBeVisible();
    expect(revoke).toBeEnabled();
    expect(revoke).toHaveAttribute('aria-disabled', 'true');
    expect(revoke).toHaveAccessibleDescription(PRIMARY_REASON);
    const reason = within(primary).getByText(PRIMARY_REASON);
    expect(reason).toHaveAttribute('role', 'tooltip');
    expect(reason).toHaveAttribute('aria-hidden', 'true');
    fireEvent.focus(revoke);
    expect(reason).toHaveAttribute('aria-hidden', 'false');
    fireEvent.blur(revoke);
    expect(reason).toHaveAttribute('aria-hidden', 'true');
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
    expect(within(primary).getByRole('alert')).toHaveTextContent(PRIMARY_REASON);
    expect(within(primary).getByRole('alert')).toHaveAttribute('aria-hidden', 'false');
    expect(within(primary).getAllByText(PRIMARY_REASON)).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A second try says it again, as a fresh alert.
    fireEvent.click(revoke);
    expect(within(primary).getByRole('alert')).toHaveTextContent(PRIMARY_REASON);
    expect(calls).toEqual([]);
  });

  // The refresh turns the row over; the control starts afresh as the other one.
  it('offers Revoke, idle, once the refreshed row says the user was made an admin', async () => {
    mockGraphQLMutation('SetUserRole', () => ({
      setUserRole: { id: BO.id, role: 'admin', canCreateWorkspace: true },
    }));
    const { rerender } = render(<UserList {...props({ users: [BO] })} />);
    fireEvent.click(
      within(row('Bo Fixturewort')).getByRole('button', { name: 'Grant admin to Bo Fixturewort' }),
    );
    fireEvent.click(within(dialog('Grant Admin')).getByRole('button', { name: 'Grant' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));

    rerender(
      <UserList {...props({ users: [{ ...BO, role: 'admin', canCreateWorkspace: true }] })} />,
    );

    expect(
      within(row('Bo Fixturewort')).getByRole('button', {
        name: 'Revoke admin from Bo Fixturewort',
      }),
    ).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
