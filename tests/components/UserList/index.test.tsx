import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../../support/printed-text';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserList, { PauseControl } from '@/components/UserList';
import type { UserListProps } from '@/components/UserList/types';
import { SITE_ROLE_ACCESS } from '@/components/UserList/roles';
import { RouteModalContext } from '@/components/Modal/route-modal-provider';
import type { RouteModalOpener } from '@/components/Modal/types';
import { FILTER_ROWS, drawnOnServer } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import type { FilterFormSubject } from '../../support/types';
import { stubLocationAssign } from '../../support/location';
import { announced, expectRefusalUnder } from '../../support/click-feedback';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { rowCells } from '../../support/table';

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which happy-dom cannot follow.
const impersonateUserMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  impersonateUser: (...args: unknown[]) => impersonateUserMock(...args),
}));
const assignMock = vi.fn();

// `/keepers/users`' table, filter and pager: render-only, so the page
// owns the read and this owns what a keeper sees of it
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
  agreedTermsVersion: 1,
  agreedDisclaimerVersion: 4,
  agreedEthicsVersion: 2,
  primaryAdmin: false,
  openHref: '/keepers/users?user=6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
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
  agreedTermsVersion: null,
  agreedDisclaimerVersion: null,
  agreedEthicsVersion: null,
  primaryAdmin: false,
  openHref: '/keepers/users?query=fixture&user=7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
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
  openHref: '/keepers/users?user=8b3c4d5e-6f7a-4b2c-8d9e-0f1a2b3c4d5e',
  heading: { eyebrow: 'User', title: 'Cy Fixturewort', qualifier: 'cy@users.test' },
} as const;

const props = (overrides: Partial<UserListProps> = {}): UserListProps => ({
  users: [ADA, BO],
  query: '',
  awaitingApproval: false,
  ...overrides,
});

/** The cell in a user's row under the column with this heading. */
function cellUnder(name: string, heading: string): HTMLElement {
  const headings = screen.getAllByRole('columnheader').map((header) => header.textContent);
  const row = screen.getByRole('row', { name: new RegExp(name) });
  return rowCells(row)[headings.indexOf(heading)] as HTMLElement;
}

describe('UserList, standing support time-outs and access pauses', () => {
  const AT = new Date('2026-11-20T09:30:00Z');
  // Bo stands timed out and paused until AT, Cy timed out and paused with no end, Ada neither: the page passes only what
  // stands.
  const rows = () =>
    render(
      <UserList
        {...props({
          users: [
            ADA,
            { ...BO, supportTimeout: { until: AT }, accessPause: { until: AT } },
            { ...CY, supportTimeout: { until: null }, accessPause: { until: null } },
          ],
        })}
      />,
    );

  // The end in the site's long date form, in the viewer's own zone once drawn on the client, as `LocalTime` prints it.
  const end = printed(longMinuteInZone(AT));

  it('marks a standing time-out with its end in the site’s date form or none under Support, and a user with none as not timed out', () => {
    rows();
    expect(screen.getByRole('columnheader', { name: 'Support' })).toBeInTheDocument();
    const bo = within(cellUnder('Bo Fixturewort', 'Support'));
    expect(bo.getByText(`Timed out until ${end}`)).toBeInTheDocument();
    expect(bo.getByText(`Until ${end}`)).toBeInTheDocument();
    expect(
      within(cellUnder('Cy Fixturewort', 'Support')).getByText('Timed out with no end date'),
    ).toBeInTheDocument();
    expect(
      within(cellUnder('Ada Fixturewort', 'Support')).getByText('Not timed out'),
    ).toBeInTheDocument();
  });

  it('marks a standing pause with its end in the site’s date form or none under Access, and a user with none as not paused', () => {
    rows();
    expect(screen.getByRole('columnheader', { name: 'Access' })).toBeInTheDocument();
    const bo = within(cellUnder('Bo Fixturewort', 'Access'));
    expect(bo.getByText(`Paused until ${end}`)).toBeInTheDocument();
    expect(bo.getByText(`Until ${end}`)).toBeInTheDocument();
    expect(
      within(cellUnder('Cy Fixturewort', 'Access')).getByText('Paused with no end date'),
    ).toBeInTheDocument();
    expect(
      within(cellUnder('Ada Fixturewort', 'Access')).getByText('Not paused'),
    ).toBeInTheDocument();
  });
});

describe('UserList', () => {
  it('shows under Terms the joint version each user last agreed to, and that a user who never agreed has not', () => {
    render(<UserList {...props()} />);

    expect(screen.getByRole('columnheader', { name: 'Terms' })).toBeInTheDocument();
    expect(cellUnder('Ada Fixturewort', 'Terms')).toHaveTextContent('1.4.2');
    expect(cellUnder('Bo Fixturewort', 'Terms')).toHaveTextContent('Not agreed');
    expect(cellUnder('Bo Fixturewort', 'Terms')).not.toHaveTextContent(/\d\.\d\.\d/);
  });

  it('gives every row a tooltip saying what its role may do, in the words Change Role shows', () => {
    render(<UserList {...props({ users: [ADA, BO, CY] })} />);
    for (const [user, label] of [
      [ADA, 'Keeper'],
      [BO, 'User'],
      [CY, 'Curator'],
    ] as const) {
      const row = screen.getByRole('row', { name: new RegExp(user.name) });
      const button = within(row).getByRole('button', { name: `About ${label}` });
      const tip = document.getElementById(button.getAttribute('aria-describedby')!);
      expect(tip).toHaveAttribute('role', 'tooltip');
      expect(tip).toHaveTextContent(SITE_ROLE_ACCESS[user.role]);
    }
  });

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
    // The mark's word is the flag's one rendering: a keeper holds it, Bo does not.
    expect(within(rowCells(ada)[3]).getByText('Yes')).toBeInTheDocument();
    expect(within(rowCells(bo)[3]).getByText('No')).toBeInTheDocument();
  });

  // Change Role, Approve and Revoke are the user modal's alone, so a row is an index into it
  // (tests/components/UserDetail/role-and-creation.test.tsx).
  it('draws no role or coven-creation control on any row, a user awaiting approval included', () => {
    render(<UserList {...props({ users: [ADA, BO, CY] })} />);

    // Why one could have shown: Bo holds the user role and may not yet create a coven.
    expect(
      within(screen.getByRole('row', { name: /Bo Fixturewort/ })).getByText('No'),
    ).toBeTruthy();
    expect(
      screen.queryAllByRole('button', { name: /^(Change Role|Approve|Revoke approval)/ }),
    ).toEqual([]);
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
          `/keepers/privilege-changes?query=${encodeURIComponent(user.email)}`,
        );
        expect(rowCells(row)[0]).toContainElement(link);
      }
    });

    // Every address is held lower-cased; the link does not rely on that.
    it('searches for the address lower-cased', () => {
      render(<UserList {...props({ users: [{ ...ADA, email: 'Ada@Users.Test' }] })} />);

      expect(
        screen.getByRole('link', { name: 'Privilege changes for Ada Fixturewort' }),
      ).toHaveAttribute('href', '/keepers/privilege-changes?query=ada%40users.test');
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
        expect(rowCells(row)[0]).toContainElement(link);
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

    expect(cellUnder('Bo Fixturewort', 'Logins')).toHaveTextContent(/^github$/);
  });

  it('draws no table when no user matches', () => {
    render(<UserList {...props({ users: [], query: 'nobody' })} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // A filter that matched nothing offers the way back to every user: the page's own address, every filter
  // dropped.
  it('offers Clear Filters where a filter matched no user, back to the list with no filter', () => {
    render(<UserList {...props({ users: [], query: 'nobody', awaitingApproval: true })} />);

    const state = screen.getByRole('status', { name: 'No Matches' });
    expect(within(state).getByRole('link', { name: 'Clear Filters' })).toHaveAttribute(
      'href',
      '/keepers/users',
    );
  });
});

// Where impersonation is registered, each non-keeper row carries the
// control; the endpoint is the guard, and these only put it where a keeper looks.
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

  it('offers it on each non-keeper row, a curator’s included, naming the user, and on no keeper row', () => {
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
    path: '/keepers/users',
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
            timedOut: true,
            paused: true,
            previousHref:
              '/keepers/users?query=fixturewort&awaiting&role=admin&timed-out&paused&before=x',
          })}
        />
      ),
      sends: 'query=fixturewort&role=admin&awaiting=&timed-out=&paused=',
    },
    alone: [
      { list: <UserList {...props({ query: 'bo' })} />, sends: 'query=bo&role=' },
      { list: <UserList {...props({ role: 'user' })} />, sends: 'query=&role=user' },
      {
        list: <UserList {...props({ awaitingApproval: true })} />,
        sends: 'query=&role=&awaiting=',
      },
      {
        list: <UserList {...props({ timedOut: true })} />,
        sends: 'query=&role=&timed-out=',
      },
      {
        list: <UserList {...props({ paused: true })} />,
        sends: 'query=&role=&paused=',
      },
    ],
    searched: '/keepers/users?query=Two+words&awaiting&role=admin&timed-out&paused',
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
    expect(router.push).toHaveBeenCalledWith('/keepers/users?role=user');
  });

  it('carries the search text typed so far when a role changes', async () => {
    inFlight(<UserList {...props()} />);

    fireEvent.change(screen.getByLabelText('Name or Email'), { target: { value: ' bo ' } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'User' }));
    });

    expect(router.push).toHaveBeenCalledWith('/keepers/users?query=bo&role=user');
  });

  it('applies Needs Approval as a bare flag the moment it is switched, and off again', async () => {
    inFlight(<UserList {...props()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Needs Approval' }));
    });

    expect(router.push).toHaveBeenCalledWith('/keepers/users?awaiting');
  });

  it('turns Needs Approval off to the list without the flag', async () => {
    inFlight(<UserList {...props({ awaitingApproval: true })} />);
    expect(screen.getByRole('switch', { name: 'Needs Approval' })).toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Needs Approval' }));
    });

    expect(router.push).toHaveBeenCalledWith('/keepers/users');
  });

  it.each([
    ['Support Timed Out', 'timed-out', { timedOut: true }],
    ['Access Paused', 'paused', { paused: true }],
  ] as const)(
    'applies %s as a bare flag the moment it is switched, keeping the other filters, and off again',
    async (label, flag, on) => {
      const { unmount } = inFlight(<UserList {...props({ role: 'user' })} />);
      expect(screen.getByRole('switch', { name: label })).not.toBeChecked();

      await act(async () => {
        fireEvent.click(screen.getByRole('switch', { name: label }));
      });
      expect(router.push).toHaveBeenLastCalledWith(`/keepers/users?role=user&${flag}`);
      unmount();

      inFlight(<UserList {...props({ role: 'user', ...on })} />);
      expect(screen.getByRole('switch', { name: label })).toBeChecked();
      await act(async () => {
        fireEvent.click(screen.getByRole('switch', { name: label }));
      });
      expect(router.push).toHaveBeenLastCalledWith('/keepers/users?role=user');
    },
  );
});

// A user who may not yet create a coven is approved from their row, and one who may is revoked, each behind a confirmation naming them; a keeper's row offers neither.
// The service is the guard; these put the control where a keeper looks and show what the mutation answers.
// The primary keeper's switch on keeper changes, its state in words; to
// any other keeper the control is in view but unusable, saying why.
describe('UserList keeper changes switch', () => {
  afterEach(() => {
    router.refresh.mockReset();
  });

  // The paused notice is a plain paragraph before the switch, the state's one
  // rendering; while changes are on, the switch stands alone. Pause asks first.
  const confirming = () => screen.getByRole('dialog', { name: 'Pause Keeper Changes' });

  it('lets the primary keeper pause once confirmed, stating that changes are on, and says so', async () => {
    let calls = 0;
    mockGraphQLMutation('PauseAdminRoleChanges', () => {
      calls += 1;
      return { pauseAdminRoleChanges: true };
    });
    render(<PauseControl paused={false} canToggle={true} />, { wrapper: StatusRegionProvider });

    // No sentence while changes are on: only the button.
    const pause = screen.getByRole('button', { name: 'Pause Keeper Changes' });
    expect(pause.previousElementSibling).toBeNull();
    expect(pause).not.toHaveAttribute('aria-disabled');
    fireEvent.click(pause);
    expect(calls).toBe(0);
    const confirm = within(confirming()).getByRole('button', { name: 'Pause Keeper Changes' });
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
    expect(announced()).not.toBe('');
  });

  it('lets the primary keeper resume, stating that changes are paused, and says so', async () => {
    let calls = 0;
    mockGraphQLMutation('ResumeAdminRoleChanges', () => {
      calls += 1;
      return { resumeAdminRoleChanges: false };
    });
    render(<PauseControl paused={true} canToggle={true} />, { wrapper: StatusRegionProvider });

    const resume = screen.getByRole('button', { name: 'Resume Keeper Changes' });
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
      message: 'Only the primary keeper may pause or resume keeper changes',
    });
    render(<PauseControl paused={true} canToggle={true} />);
    const resume = screen.getByRole('button', { name: 'Resume Keeper Changes' });

    act(() => resume.focus());
    fireEvent.click(resume);

    await expectRefusalUnder(resume, 'Resume Keeper Changes');
    expect(resume).not.toHaveAttribute('aria-disabled');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  // Only the primary keeper may pause, so another keeper is shown no switch at all.
  it('shows another keeper no switch while changes run', () => {
    render(<PauseControl paused={false} canToggle={false} />);

    expect(screen.queryByRole('button', { name: 'Pause Keeper Changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Resume Keeper Changes' })).toBeNull();
    expect(screen.queryAllByRole('status').filter((region) => region.textContent)).toHaveLength(0);
  });

  it('shows another keeper only the paused notice while changes are paused', () => {
    render(<PauseControl paused canToggle={false} />);

    expect(screen.getByRole('status')).toHaveTextContent(/\S/);
    expect(screen.queryByRole('button', { name: 'Resume Keeper Changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause Keeper Changes' })).toBeNull();
  });
});
