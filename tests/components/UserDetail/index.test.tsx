import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from '@/components/Modal';
import UserDetail from '@/components/UserDetail';
import type { UserCoven, UserDetailProps, UserDetailUser } from '@/components/UserDetail/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { stubLocationAssign } from '../../support/location';

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which happy-dom cannot follow.
const impersonateUserMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  impersonateUser: (...args: unknown[]) => impersonateUserMock(...args),
}));
const assignMock = vi.fn();
// The role and creation controls read the page again after a write.
const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The body of the modal over `/admin/users` (M9.19): render-only, so the page
// owns the read and this owns what an admin sees of it
// (claude-docs/components/user-detail.md).

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  impersonateUserMock.mockReset();
  assignMock.mockReset();
  router.refresh.mockReset();
  stubLocationAssign(assignMock);
});
afterEach(() => vi.unstubAllGlobals());

const FACTS = {
  email: 'bo@fixture.test',
  emailVerified: true,
  primaryAdmin: false,
  canCreateWorkspace: false,
  providers: ['google', 'discord'],
  createdAt: new Date('2026-02-03T04:05:06Z'),
};
const BO: UserDetailUser = {
  ...FACTS,
  id: '7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
  name: 'Bo Fixturewort',
  role: 'user',
};
const ADA: UserDetailUser = {
  ...FACTS,
  id: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  name: 'Ada Fixturewort',
  email: 'ada@fixture.test',
  role: 'admin',
};
// A curator (M11.20), who holds the creation flag as every curator must.
const CY: UserDetailUser = {
  ...FACTS,
  id: '8b3c4d5e-6f7a-4b2c-8d9e-0f1a2b3c4d5e',
  name: 'Cy Fixturewort',
  email: 'cy@fixture.test',
  role: 'curator',
  canCreateWorkspace: true,
};

const coven = (name: string, role: UserCoven['role']): UserCoven => ({
  workspaceId: `w-${name}`,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
  role,
  joinedAt: new Date('2026-03-04T05:06:07Z'),
});

const COVENS = [
  coven('Zeta Coven', 'viewer'),
  coven('Beta Coven', 'member'),
  coven('Alpha Coven', 'member'),
  coven('Omega Coven', 'owner'),
];

const props = (overrides: Partial<UserDetailProps> = {}): UserDetailProps => ({
  user: BO,
  memberships: COVENS,
  ...overrides,
});

// In a modal, as the page draws it: the question needs the modal's layer.
const renderDetail = (overrides: Partial<UserDetailProps> = {}) =>
  render(
    <Modal title="Bo Fixturewort" onClose={vi.fn()}>
      <UserDetail {...props(overrides)} />
    </Modal>,
  );

describe('UserDetail', () => {
  it('shows each fact of the users table as a term with its value', () => {
    renderDetail();

    expect(screen.getAllByRole('term')).toHaveLength(5);
    expect(screen.getAllByRole('definition')).toHaveLength(5);
    const signedUp = within(screen.getAllByRole('definition')[4]!).getByText('2026-02-03');
    expect(signedUp).toHaveAttribute('datetime', BO.createdAt.toISOString());
  });

  it('shows one logo per linked provider, and none for a user with none', () => {
    const { unmount } = renderDetail();
    expect(screen.getAllByText('Google')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Discord')[0]).toBeInTheDocument();
    unmount();

    renderDetail({ user: { ...BO, providers: [] } });
    expect(screen.queryAllByText('Google')).toHaveLength(0);
  });

  it('marks the primary admin, and no one else', () => {
    const { unmount } = renderDetail({ user: { ...ADA, primaryAdmin: true } });
    expect(screen.getByRole('button', { name: 'Primary Admin' })).toBeInTheDocument();
    unmount();

    renderDetail({ user: ADA });
    expect(screen.queryByRole('button', { name: 'Primary Admin' })).not.toBeInTheDocument();
  });

  it('states whether the address is verified and whether they may create covens', () => {
    const { unmount } = renderDetail({
      user: { ...BO, emailVerified: false, canCreateWorkspace: true },
    });
    expect(screen.getAllByText('Unverified')[0]).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    unmount();

    renderDetail();
    expect(screen.getAllByText('Verified')[0]).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('offers Change Role and Approve beside the facts they change, and no creation control on an admin or a curator', () => {
    const { unmount } = renderDetail();
    expect(screen.getByRole('button', { name: 'Change Role for Bo Fixturewort' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Approve Bo Fixturewort' })).toBeEnabled();
    unmount();

    for (const user of [ADA, CY]) {
      const { unmount: next } = renderDetail({ user });
      expect(screen.getByRole('button', { name: `Change Role for ${user.name}` })).toBeEnabled();
      expect(
        screen.queryByRole('button', { name: /Approve|Revoke approval/ }),
      ).not.toBeInTheDocument();
      next();
    }
  });

  it('asks inside this modal, opening no second one, then makes a user a curator and reads the page again', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SetUserRole', (variables) => {
      calls.push(variables);
      return { setUserRole: { id: BO.id, role: 'curator', canCreateWorkspace: true } };
    });
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Change Role for Bo Fixturewort' }));

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(calls).toEqual([]);
    fireEvent.click(screen.getByRole('radio', { name: /^Curator/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id, role: 'curator' }]);
  });

  it('approves coven creation from the modal, asking first', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Approve Bo Fixturewort' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('locks both controls while admin changes are paused for this admin', () => {
    renderDetail({ changesPaused: true });

    for (const name of ['Change Role for Bo Fixturewort', 'Approve Bo Fixturewort'])
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
  });

  it('lists the covens, owners first, then members, then viewers, each by name', () => {
    renderDetail();

    const items = within(screen.getByRole('list', { name: 'Covens' })).getAllByRole('listitem');
    expect(items.map((item) => item.firstChild?.textContent)).toEqual([
      'Omega Coven',
      'Alpha Coven',
      'Beta Coven',
      'Zeta Coven',
    ]);
    expect(within(items[0]!).getByText('Owner')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Member')).toBeInTheDocument();
    expect(within(items[3]!).getByText('Viewer')).toBeInTheDocument();
    expect(within(items[0]!).getByText('2026-03-04')).toHaveAttribute(
      'datetime',
      COVENS[0]!.joinedAt.toISOString(),
    );
  });

  it('names a coven in text, never a link: an admin is no member of it', () => {
    renderDetail();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('draws no coven list when the user belongs to no coven', () => {
    renderDetail({ memberships: [] });

    expect(screen.queryByRole('list', { name: 'Covens' })).not.toBeInTheDocument();
  });

  it('offers Impersonate on a user’s modal, and a curator’s, where impersonation is registered', () => {
    const { unmount } = renderDetail({ canImpersonate: true });
    expect(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' })).toBeEnabled();
    unmount();

    renderDetail({ user: CY, canImpersonate: true });
    expect(screen.getByRole('button', { name: 'Impersonate Cy Fixturewort' })).toBeEnabled();
  });

  it('offers no Impersonate on an admin, or where it is not registered', () => {
    const { unmount } = renderDetail({ user: ADA, canImpersonate: true });
    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
    unmount();

    renderDetail({ canImpersonate: false });
    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
  });

  it('puts the question away on Cancel, sending nothing', () => {
    renderDetail({ canImpersonate: true });
    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('button', { name: 'Impersonate' })).not.toBeInTheDocument();
    expect(impersonateUserMock).not.toHaveBeenCalled();
  });

  it('impersonates the user once confirmed, and opens the site as them', async () => {
    impersonateUserMock.mockResolvedValue({ data: {}, error: null });
    renderDetail({ canImpersonate: true });
    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    fireEvent.click(screen.getByRole('button', { name: 'Impersonate' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(impersonateUserMock).toHaveBeenCalledWith({ userId: BO.id });
  });

  it('says so, and goes nowhere, when the endpoint refuses', async () => {
    impersonateUserMock.mockResolvedValue({
      data: null,
      error: { status: 403, message: 'You cannot impersonate admins' },
    });
    renderDetail({ canImpersonate: true });
    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    fireEvent.click(screen.getByRole('button', { name: 'Impersonate' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Impersonate' })).not.toBeInTheDocument();
  });
});

// A refusal of the role or creation control is design F inside this dialog too
// (M12.31's rule 6, the owner's exception of 2026-10-20): a callout under the
// control, which Escape or a press elsewhere closes without closing the modal.
describe('UserDetail, when the service refuses a change', () => {
  const settle = (step: () => unknown) =>
    act(async () => {
      step();
    });

  const REFUSALS = [
    {
      control: 'Change Role for Bo Fixturewort',
      operation: 'SetUserRole',
      message: 'Fixture refusal of the role.',
      user: BO,
      confirm: () => {
        fireEvent.click(screen.getByRole('radio', { name: /^Curator/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
      },
    },
  ];

  for (const refusal of REFUSALS) {
    describe(refusal.control, () => {
      const onClose = vi.fn();
      const control = () => screen.getByRole('button', { name: refusal.control });
      const badge = () =>
        screen.queryByRole('button', { name: `Show the error for ${refusal.control}` });

      /** The modal open on the user, the control pressed and its question confirmed, refused. */
      async function refuse() {
        onClose.mockReset();
        mockGraphQLError(refusal.operation, { code: 'FORBIDDEN', message: refusal.message });
        render(
          <Modal title="Bo Fixturewort" onClose={onClose}>
            <UserDetail {...props({ user: refusal.user })} />
          </Modal>,
        );
        // Focused first, as a press leaves it: the question gives the focus back to
        // what held it.
        await settle(() => control().focus());
        await settle(() => fireEvent.click(control()));
        // Why it reaches a refusal at all: the question opens, and is confirmed.
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        await settle(refusal.confirm);
        return screen.findByRole('alert');
      }

      it('says why in a callout under the control, in the dialog, and draws no notice', async () => {
        const alert = await refuse();

        expect(alert).toHaveTextContent(refusal.message);
        // The callout, which a notice is not: it carries Dismiss.
        expect(within(alert).getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(screen.getByRole('dialog')).toContainElement(alert);
        expect(
          control().compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(control()).toHaveAccessibleDescription(`Last try failed: ${refusal.message}`);
        await waitFor(() => expect(control()).toHaveFocus());
        expect(badge()).toBeInTheDocument();
        expect(router.refresh).not.toHaveBeenCalled();
      });

      it('closes the callout on Escape and leaves the dialog open, the focus back on the control', async () => {
        await refuse();
        await settle(() => screen.getByRole('button', { name: 'Dismiss' }).focus());

        let escape = true;
        await settle(() => {
          escape = fireEvent.keyDown(document.activeElement!, { key: 'Escape', cancelable: true });
        });

        expect(screen.queryByRole('alert')).toBeNull();
        // Taken, so the dialog's own Escape does not follow it.
        expect(escape).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toContainElement(control());
        expect(control()).toHaveFocus();
        expect(badge()).toBeInTheDocument();
      });

      it('clears the callout and the badge on the next press', async () => {
        await refuse();
        expect(badge()).toBeInTheDocument();

        await settle(() => fireEvent.click(control()));

        expect(screen.queryByRole('alert')).toBeNull();
        expect(badge()).toBeNull();
        expect(control()).not.toHaveAccessibleDescription(`Last try failed: ${refusal.message}`);
      });
    });
  }
});
