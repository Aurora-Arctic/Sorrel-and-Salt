import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserList, { PauseControl } from '@/components/UserList';
import type { UserListProps } from '@/components/UserList/types';
import { RouteModalContext } from '@/components/Modal/route-modal-provider';
import type { RouteModalOpener } from '@/components/Modal/types';
import { PRIMARY_ADMIN_REFUSAL } from '@/lib/primary-admin';
import { FILTER_ROWS, drawnOnServer } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import type { FilterFormSubject } from '../../support/types';
import { stubLocationAssign } from '../../support/location';
import { announced, expectRefusalUnder } from '../../support/click-feedback';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which happy-dom cannot follow.
const impersonateUserMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  impersonateUser: (...args: unknown[]) => impersonateUserMock(...args),
}));
const assignMock = vi.fn();

// `/admin/users`' table, filter and pager: render-only, so the page
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
  openHref: '/admin/users?user=6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  heading: { eyebrow: 'User', title: 'Ada Fixturewort', qualifier: 'ada@users.test' },
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
  openHref: '/admin/users?query=fixture&user=7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
  heading: { eyebrow: 'User', title: 'Bo Fixturewort', qualifier: 'bo@users.test' },
} as const;

// A curator: holds the creation flag, as the CHECK makes every
// curator do, and an unverified address.
const CY = {
  ...BO,
  id: '8b3c4d5e-6f7a-4b2c-8d9e-0f1a2b3c4d5e',
  name: 'Cy Fixturewort',
  email: 'cy@users.test',
  role: 'curator',
  canCreateWorkspace: true,
  openHref: '/admin/users?user=8b3c4d5e-6f7a-4b2c-8d9e-0f1a2b3c4d5e',
  heading: { eyebrow: 'User', title: 'Cy Fixturewort', qualifier: 'cy@users.test' },
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

  // Each row opens the privilege ledger narrowed to its user, an
  // admin's included, from an icon before the name.
  describe('the history link', () => {
    it('leads every name, to the ledger searched for that user’s address', () => {
      render(<UserList {...props()} />);

      for (const user of props().users) {
        const row = screen.getByRole('row', { name: new RegExp(user.name) });
        const link = within(row).getByRole('link', {
          name: `Privilege changes for ${user.name}`,
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
        screen.getByRole('link', { name: 'Privilege changes for Ada Fixturewort' }),
      ).toHaveAttribute('href', '/admin/privilege-changes?query=ada%40users.test');
    });
  });

  // Each name opens its user’s modal over the list, at once under
  // the page’s opener, and as a link still for a new tab or before the script.
  describe('the name link', () => {
    it('links each name to its user’s modal, in the name cell', () => {
      render(<UserList {...props()} />);

      for (const user of props().users) {
        const row = screen.getByRole('row', { name: new RegExp(user.name) });
        const link = within(row).getByRole('link', { name: user.name });
        expect(link).toHaveAttribute('href', user.openHref);
        expect(within(row).getAllByRole('cell')[0]).toContainElement(link);
      }
    });

    it('opens the modal at once with the row’s heading on a plain press', () => {
      const opener: RouteModalOpener = { loading: undefined, open: vi.fn(), cancel: vi.fn() };
      render(
        <RouteModalContext.Provider value={opener}>
          <UserList {...props()} />
        </RouteModalContext.Provider>,
      );

      fireEvent.click(screen.getByRole('link', { name: BO.name }));

      // No place named: a row opens the page's one unnamed route modal.
      expect(opener.open).toHaveBeenCalledExactlyOnceWith(BO.openHref, BO.heading, undefined);
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
});

// Where impersonation is registered, each non-admin row carries the
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

  it('offers it on each non-admin row, a curator’s included, naming the user, and on no admin row', () => {
    render(<UserList {...props({ users: [ADA, BO, CY], canImpersonate: true })} />);

    expect(screen.getByRole('columnheader', { name: 'Impersonate' })).toBeInTheDocument();
    const bo = screen.getByRole('row', { name: /Bo Fixturewort/ });
    const impersonate = within(bo).getByRole('button', { name: 'Impersonate Bo Fixturewort' });
    expect(impersonate).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Impersonate Cy Fixturewort' })).toBeEnabled();
    const ada = screen.getByRole('row', { name: /Ada Fixturewort/ });
    expect(within(ada).queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
  });

  const asking = () => screen.getByRole('dialog', { name: 'Impersonate User' });
  const openFor = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name: `Impersonate ${name}` }));

  it('impersonates the row’s user once confirmed, and opens the site as them', async () => {
    impersonateUserMock.mockResolvedValue({ data: {}, error: null });
    stubLocationAssign(assignMock);
    render(<UserList {...props({ canImpersonate: true })} />);

    openFor(BO.name);
    fireEvent.click(within(asking()).getByRole('button', { name: 'Impersonate' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(impersonateUserMock).toHaveBeenCalledWith({ userId: BO.id });
  });

  it('says so in the row when the endpoint refuses, and stays on the page', async () => {
    impersonateUserMock.mockResolvedValue({
      data: null,
      error: { status: 403, message: 'You cannot impersonate admins' },
    });
    stubLocationAssign(assignMock);
    render(<UserList {...props({ canImpersonate: true })} />);

    openFor(BO.name);
    fireEvent.click(within(asking()).getByRole('button', { name: 'Impersonate' }));

    await expectRefusalUnder(
      screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }),
      'Impersonate Bo Fixturewort',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });
});

// The search applies from its magnifier or Enter, a role or Needs
// Approval the moment it changes, each softly from the first page, with a
// bare `awaiting`.
describe('UserList filter', () => {
  afterEach(() => {
    router.push.mockReset();
  });

  const inFlight = (ui: ReactNode) => render(<Navigating push={router.push}>{ui}</Navigating>);

  // Needs Approval is a native checkbox valued empty, so a native submit sends
  // `awaiting=`, and All Roles `role=`: each read by the page as the filter shown.
  const SUBJECT: FilterFormSubject = {
    label: 'Filter Users',
    path: '/admin/users',
    searchLabel: 'Name or Email',
    push: router.push,
    none: { list: <UserList {...props()} />, sends: 'query=&role=' },
    shown: {
      list: (
        <UserList
          {...props({
            query: 'fixturewort',
            role: 'admin',
            awaitingApproval: true,
            previousHref: '/admin/users?query=fixturewort&awaiting&role=admin&before=x',
          })}
        />
      ),
      sends: 'query=fixturewort&role=admin&awaiting=',
    },
    alone: [
      { list: <UserList {...props({ query: 'bo' })} />, sends: 'query=bo&role=' },
      { list: <UserList {...props({ role: 'user' })} />, sends: 'query=&role=user' },
      {
        list: <UserList {...props({ awaitingApproval: true })} />,
        sends: 'query=&role=&awaiting=',
      },
    ],
    searched: '/admin/users?query=Two+words&awaiting&role=admin',
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  // A select-only box once hydrated, as every
  // closed set in the row is, over the native select the server draws.
  it('narrows by role the moment one is picked, from a native select on the server that starts at the role shown', async () => {
    const { container, hydrate } = drawnOnServer(
      <Navigating push={router.push}>
        <UserList {...props({ role: 'admin' })} />
      </Navigating>,
    );

    const role = within(container).getByRole('combobox', { name: 'Role' });
    expect(role).toHaveValue('admin');
    expect(role).toHaveAttribute('name', 'role');
    expect(
      within(role)
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['', 'admin', 'curator', 'user']);

    await hydrate();
    fireEvent.click(within(container).getByRole('combobox', { name: 'Role' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'User' }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/admin/users?role=user');
  });

  it('carries the search text typed so far when a role changes', async () => {
    inFlight(<UserList {...props()} />);

    fireEvent.change(screen.getByLabelText('Name or Email'), { target: { value: ' bo ' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'User' }));
    });

    expect(router.push).toHaveBeenCalledWith('/admin/users?query=bo&role=user');
  });

  it('applies Needs Approval as a bare flag the moment it is switched, and off again', async () => {
    inFlight(<UserList {...props()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Needs Approval' }));
    });

    expect(router.push).toHaveBeenCalledWith('/admin/users?awaiting');
  });

  it('turns Needs Approval off to the list without the flag', async () => {
    inFlight(<UserList {...props({ awaitingApproval: true })} />);
    expect(screen.getByRole('switch', { name: 'Needs Approval' })).toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Needs Approval' }));
    });

    expect(router.push).toHaveBeenCalledWith('/admin/users');
  });
});

// A user who may not yet create a coven is approved from their row, and one who may is revoked, each behind a confirmation naming them; an admin's row offers neither.
// The service is the guard; these put the control where an admin looks and show what the mutation answers.
describe('UserList approval', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const boRow = () => screen.getByRole('row', { name: /Bo Fixturewort/ });

  it('offers Approve on the row of a user awaiting approval, naming them, and nothing on an admin or a curator', () => {
    render(<UserList {...props({ users: [ADA, BO, CY] })} />);

    expect(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' })).toBeEnabled();
    expect(within(boRow()).queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument();
    for (const name of [/Ada Fixturewort/, /Cy Fixturewort/]) {
      expect(
        within(screen.getByRole('row', { name })).queryByRole('button', {
          name: /Approve|Revoke approval/,
        }),
      ).not.toBeInTheDocument();
    }
  });

  // Revoke is the user modal's alone, so the row is an index into the modal.
  it('offers neither Revoke nor Approve on the row of a user who may create a coven', () => {
    render(<UserList {...props({ users: [{ ...BO, canCreateWorkspace: true }] })} />);

    // Why a control could have shown: Bo holds the user role, as on the rows that offer Approve.
    expect(BO.role).toBe('user');
    expect(within(boRow()).getAllByRole('cell')[3]).toHaveTextContent(/^Yes/);
    expect(
      within(boRow()).queryByRole('button', { name: /Approve|Revoke approval/ }),
    ).not.toBeInTheDocument();
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

  // An unverified address is said in the confirmation, read with its
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

  // The confirmation takes an optional reason, sent trimmed.
  it('approves with a reason', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />);

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    const approving = dialog('Approve Coven Creation');
    const reason = within(approving).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Runs the Tuesday circle ' } });
    fireEvent.click(within(approving).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));

    expect(calls).toEqual([{ userId: BO.id, note: 'Runs the Tuesday circle' }]);
  });

  it('approves the row’s user from the modal, busy until the list is read again, and says so', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    render(<UserList {...props()} />, { wrapper: StatusRegionProvider });
    expect(announced()).toBe('');

    fireEvent.click(within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' }));
    const busy = within(dialog('Approve Coven Creation')).getByRole('button', { name: 'Approve' });
    fireEvent.click(busy);

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
    expect(announced()).toContain(BO.name);
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

    const approve = within(boRow()).getByRole('button', { name: 'Approve Bo Fixturewort' });
    await expectRefusalUnder(approve, 'Approve Bo Fixturewort');
    expect(approve).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

// The role cell's Change Role asks in a modal naming the user which role they move to (every role but the one held, with an optional reason); the primary admin's is in view but unusable, saying why.
// The service is the guard, and refuses the same.
describe('UserList site role', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });
  const dialog = () => screen.getByRole('dialog', { name: 'Change Role' });
  const changeRole = (name: string) =>
    within(row(name)).getByRole('button', { name: `Change Role for ${name}` });
  const radios = () =>
    within(dialog())
      .getAllByRole('radio')
      .map((radio) => (radio as HTMLInputElement).value);
  const sent = () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return {
        setUserRole: { id: variables.userId, role: variables.role, canCreateWorkspace: true },
      };
    });
    return calls;
  };

  it('offers Change Role on every row, naming the user, the role shown beside it', () => {
    render(<UserList {...props({ users: [ADA, BO, CY] })} />);

    for (const [name, role] of [
      ['Ada Fixturewort', 'Admin'],
      ['Bo Fixturewort', 'User'],
      ['Cy Fixturewort', 'Curator'],
    ]) {
      const open = changeRole(name);
      expect(open).toBeEnabled();
      expect(open).not.toHaveAttribute('aria-disabled');
      expect(within(row(name)).getAllByRole('cell')[2]).toHaveTextContent(new RegExp(`^${role}`));
    }
    // Nobody here is the primary admin.
    expect(screen.queryByRole('button', { name: 'Primary Admin' })).not.toBeInTheDocument();
  });

  it.each([
    ['a user', BO, ['curator', 'admin']],
    ['a curator', CY, ['user', 'admin']],
    ['an admin', ADA, ['user', 'curator']],
  ])('offers %s every role but the one held', (_who, user, offered) => {
    render(<UserList {...props({ users: [user] })} />);

    fireEvent.click(changeRole(user.name));

    expect(dialog()).toHaveTextContent(user.name);
    expect(radios()).toEqual(offered);
    expect(within(dialog()).getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('promotes from the modal, sending the role picked and the reason, and says so', async () => {
    const calls = sent();
    render(<UserList {...props({ users: [{ ...BO, emailVerified: true }] })} />, {
      wrapper: StatusRegionProvider,
    });

    fireEvent.click(changeRole('Bo Fixturewort'));
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Admin/ }));
    const confirm = within(dialog()).getByRole('button', { name: 'Promote' });
    expect(confirm).not.toHaveAccessibleDescription();
    const reason = within(dialog()).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Curates the celestial bodies  ' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id, role: 'admin', note: 'Curates the celestial bodies' }]);
    expect(announced()).toContain(BO.name);
  });

  it('demotes an admin to a curator with no reason', async () => {
    const calls = sent();
    render(<UserList {...props()} />);
    fireEvent.click(changeRole('Ada Fixturewort'));
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Curator/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Demote' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: ADA.id, role: 'curator' }]);
  });

  it('moves a curator down to user, or up to admin', async () => {
    const calls = sent();
    render(<UserList {...props({ users: [CY] })} />);

    fireEvent.click(changeRole('Cy Fixturewort'));
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Admin/ }));
    expect(within(dialog()).getByRole('button', { name: 'Promote' })).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^User/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Demote' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: CY.id, role: 'user' }]);
  });

  // The warning, in Promote's words: a promotion vouches as an approval
  // does; a demotion vouches for no one.
  it('warns before promoting a user whose email is unverified, and not before demoting them', async () => {
    sent();
    render(<UserList {...props({ users: [CY] })} />);
    expect(within(row('Cy Fixturewort')).getAllByRole('cell')[1]).toHaveTextContent(/^Unverified/);

    fireEvent.click(changeRole('Cy Fixturewort'));
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^User/ }));
    expect(
      within(dialog()).getByRole('button', { name: 'Demote' }),
    ).not.toHaveAccessibleDescription();
    fireEvent.click(within(dialog()).getByRole('radio', { name: /^Admin/ }));
    const confirm = within(dialog()).getByRole('button', { name: 'Promote' });
    expect(confirm).toHaveAccessibleDescription(/\S/);

    fireEvent.click(confirm);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('marks the primary admin with a crown, whose Change Role is in view but aria-disabled, described by the reason', () => {
    render(<UserList {...props({ users: [{ ...ADA, primaryAdmin: true }, BO] })} />);
    const primary = row('Ada Fixturewort');

    expect(within(primary).getByRole('button', { name: 'Primary Admin' })).toBeInTheDocument();

    const open = changeRole('Ada Fixturewort');
    // In view and reachable, not `disabled`, and described by the reason.
    expect(open).toBeVisible();
    expect(open).toBeEnabled();
    expect(open).toHaveAttribute('aria-disabled', 'true');
    expect(open).toHaveAccessibleDescription(PRIMARY_ADMIN_REFUSAL);
    expect(within(primary).queryByRole('alert')).not.toBeInTheDocument();
    // Only the primary admin's row is marked.
    expect(
      within(row('Bo Fixturewort')).queryByRole('button', { name: 'Primary Admin' }),
    ).not.toBeInTheDocument();
  });

  it('states the reason when the primary admin’s Change Role is tried, opening nothing and sending nothing', () => {
    const calls = sent();
    render(<UserList {...props({ users: [{ ...ADA, primaryAdmin: true }] })} />);
    const primary = row('Ada Fixturewort');
    const open = changeRole('Ada Fixturewort');

    fireEvent.click(open);

    // The tip opens, as an alert.
    expect(within(primary).getByRole('alert')).toBeVisible();
    expect(within(primary).getByRole('alert')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A second try says it again, as a fresh alert.
    fireEvent.click(open);
    expect(within(primary).getByRole('alert')).toBeVisible();
    expect(calls).toEqual([]);
  });
});

// The primary admin's switch on admin changes, its state in words; to
// any other admin the control is in view but unusable, saying why.
describe('UserList admin changes switch', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  // The paused notice is a plain paragraph before the switch, the state's one
  // rendering; while changes are on, the switch stands alone. Pause asks first.
  const confirming = () => screen.getByRole('dialog', { name: 'Pause Admin Changes' });

  it('lets the primary admin pause once confirmed, stating that changes are on, and says so', async () => {
    let calls = 0;
    mockGraphQLMutation('PauseAdminRoleChanges', () => {
      calls += 1;
      return { pauseAdminRoleChanges: true };
    });
    render(<PauseControl paused={false} canToggle={true} />, { wrapper: StatusRegionProvider });

    // No sentence while changes are on: only the button.
    const pause = screen.getByRole('button', { name: 'Pause Admin Changes' });
    expect(pause.previousElementSibling).toBeNull();
    expect(pause).not.toHaveAttribute('aria-disabled');
    fireEvent.click(pause);
    expect(calls).toBe(0);
    const confirm = within(confirming()).getByRole('button', { name: 'Pause Admin Changes' });
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
    expect(announced()).not.toBe('');
  });

  it('lets the primary admin resume, stating that changes are paused, and says so', async () => {
    let calls = 0;
    mockGraphQLMutation('ResumeAdminRoleChanges', () => {
      calls += 1;
      return { resumeAdminRoleChanges: false };
    });
    render(<PauseControl paused={true} canToggle={true} />, { wrapper: StatusRegionProvider });

    const resume = screen.getByRole('button', { name: 'Resume Admin Changes' });
    expect(resume.previousElementSibling).toHaveTextContent(/\S/);
    fireEvent.click(resume);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
    expect(announced()).not.toBe('');
  });

  // Resume asks nothing, so it says its refusal under itself, with the focus
  // never having left it.
  it('says why under Resume when the service refuses, the focus still on it', async () => {
    mockGraphQLError('ResumeAdminRoleChanges', {
      code: 'FORBIDDEN',
      message: 'Only the primary admin may pause or resume admin changes',
    });
    render(<PauseControl paused={true} canToggle={true} />);
    const resume = screen.getByRole('button', { name: 'Resume Admin Changes' });

    act(() => resume.focus());
    fireEvent.click(resume);

    await expectRefusalUnder(resume, 'Resume Admin Changes');
    expect(resume).not.toHaveAttribute('aria-disabled');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('shows another admin the state and the switch, aria-disabled and described by the reason', () => {
    render(<PauseControl paused={false} canToggle={false} />);

    const pause = screen.getByRole('button', { name: 'Pause Admin Changes' });
    expect(pause).toBeEnabled();
    expect(pause).toHaveAttribute('aria-disabled', 'true');
    expect(pause).toHaveAccessibleDescription(/\S/);
  });

  // One sentence on the page: the notice; the switch's
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

// While admin changes are paused, an admin the pause binds sees every
// Change Role in view but unusable, saying why; the primary admin, whom
// the pause exempts, keeps them. The service refuses the same.
describe('UserList admin role while admin changes are paused', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

  it('locks every Change Role for another admin, each described by the reason', () => {
    render(<UserList {...props({ adminChanges: { paused: true, canToggle: false } })} />);

    const grant = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Change Role for Bo Fixturewort',
    });
    const revoke = within(row('Ada Fixturewort')).getByRole('button', {
      name: 'Change Role for Ada Fixturewort',
    });
    for (const button of [grant, revoke]) {
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription(/\S/);
    }
  });

  // Coven creation's Approve and Revoke pause too.
  it('locks Approve of coven creation for another admin, described by the reason', () => {
    render(
      <UserList {...props({ users: [BO], adminChanges: { paused: true, canToggle: false } })} />,
    );

    const approve = within(row('Bo Fixturewort')).getByRole('button', {
      name: 'Approve Bo Fixturewort',
    });
    expect(approve).toHaveAttribute('aria-disabled', 'true');
    expect(approve).toHaveAccessibleDescription(/\S/);
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

    for (const name of ['Change Role for Bo Fixturewort', 'Change Role for Ada Fixturewort']) {
      expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled');
    }
  });

  // The primary admin's own reason holds whether or not changes are paused:
  // which of the two reasons won is told by which of the two strings it reads.
  it('keeps the primary admin’s Change Role on its own reason while paused', () => {
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
        name: 'Change Role for Ada Fixturewort',
      }),
    ).toHaveAccessibleDescription(PRIMARY_ADMIN_REFUSAL);
  });
});
