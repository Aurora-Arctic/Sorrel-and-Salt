import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import Modal from '@/components/Modal';
import UserDetail from '@/components/UserDetail';
import type { UserDetailProps, UserDetailUser } from '@/components/UserDetail/types';
import { PRIMARY_ADMIN_REFUSAL } from '@/lib/primary-admin';
import { announced } from '../../support/click-feedback';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { router } from '../../support/next-navigation';

// claude-docs/components/user-detail.md

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => router.refresh.mockReset());

const FACTS = {
  emailVerified: true,
  primaryAdmin: false,
  providers: ['discord'],
  hasPasskey: false,
  createdAt: new Date('2026-02-03T04:05:06Z'),
  agreedTermsVersion: 1,
  agreedDisclaimerVersion: 1,
  agreedEthicsVersion: 1,
};
const ADA: UserDetailUser = {
  ...FACTS,
  id: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
  name: 'Ada Fixturewort',
  email: 'ada@users.test',
  role: 'admin',
  canCreateWorkspace: true,
};
const BO: UserDetailUser = {
  ...FACTS,
  id: '7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
  name: 'Bo Fixturewort',
  email: 'bo@users.test',
  role: 'user',
  canCreateWorkspace: false,
  emailVerified: false,
};
const CY: UserDetailUser = {
  ...BO,
  id: '8b3c4d5e-6f7a-4b2c-8d9e-0f1a2b3c4d5e',
  name: 'Cy Fixturewort',
  email: 'cy@users.test',
  role: 'curator',
  canCreateWorkspace: true,
};

const renderDetail = (overrides: Partial<UserDetailProps> = {}) =>
  render(
    <StatusRegionProvider>
      <Modal title="User" onClose={vi.fn()}>
        <UserDetail user={BO} memberships={[]} {...overrides} />
      </Modal>
    </StatusRegionProvider>,
  );

const asking = (name: string) => screen.getByRole('group', { name: new RegExp(name) });

describe('UserDetail coven creation', () => {
  const approve = () => screen.getByRole('button', { name: 'Approve Bo Fixturewort' });
  const sent = () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('GrantWorkspaceCreation', (variables) => {
      calls.push(variables);
      return { grantWorkspaceCreation: { id: BO.id, canCreateWorkspace: true } };
    });
    return calls;
  };

  it('offers Revoke rather than Approve to a user who may create a coven', () => {
    renderDetail({ user: { ...BO, canCreateWorkspace: true } });

    // Why Approve could have shown: Bo holds the user role, as on the modal that offers it.
    expect(BO.role).toBe('user');
    expect(
      screen.getByRole('button', { name: 'Revoke approval for Bo Fixturewort' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Bo Fixturewort' })).toBeNull();
  });

  it('asks before approving, naming the user, and Cancel puts the question away with nothing sent', () => {
    const calls = sent();
    renderDetail();

    fireEvent.click(approve());
    const question = asking('Bo Fixturewort');
    expect(within(question).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    fireEvent.click(within(question).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group', { name: /Bo Fixturewort/ })).toBeNull();
    expect(calls).toEqual([]);
  });

  it('warns before approving a user whose email is unverified, and still approves', async () => {
    const calls = sent();
    renderDetail();

    fireEvent.click(approve());
    const confirm = within(asking('Bo Fixturewort')).getByRole('button', { name: 'Approve' });
    expect(confirm).toHaveAccessibleDescription(/\S/);
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id }]);
  });

  it('warns of nothing before approving a verified user', () => {
    sent();
    renderDetail({ user: { ...BO, emailVerified: true } });

    fireEvent.click(approve());

    expect(
      within(asking('Bo Fixturewort')).getByRole('button', { name: 'Approve' }),
    ).not.toHaveAccessibleDescription();
  });

  it('approves with a trimmed reason, busy until the page is read again, and says so', async () => {
    const calls = sent();
    renderDetail();
    expect(announced()).toBe('');

    fireEvent.click(approve());
    const question = asking('Bo Fixturewort');
    const reason = within(question).getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Runs the Tuesday circle ' } });
    const busy = within(question).getByRole('button', { name: 'Approve' });
    fireEvent.click(busy);

    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id, note: 'Runs the Tuesday circle' }]);
    expect(announced()).toContain(BO.name);
  });
});

describe('UserDetail site role', () => {
  const changeRole = (name: string) =>
    screen.getByRole('button', { name: `Change Role for ${name}` });
  const radios = () =>
    screen.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value);
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

  it.each([
    ['a user', BO, ['curator', 'admin']],
    ['a curator', CY, ['user', 'admin']],
    ['an admin', ADA, ['user', 'curator']],
  ])('offers %s every role but the one held', (_who, user, offered) => {
    renderDetail({ user });

    fireEvent.click(changeRole(user.name));

    expect(asking(user.name)).toBeInTheDocument();
    expect(radios()).toEqual(offered);
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('promotes, sending the role picked and the trimmed reason, and says so', async () => {
    const calls = sent();
    renderDetail({ user: { ...BO, emailVerified: true } });

    fireEvent.click(changeRole('Bo Fixturewort'));
    fireEvent.click(screen.getByRole('radio', { name: /^Keeper/ }));
    const confirm = screen.getByRole('button', { name: 'Promote' });
    expect(confirm).not.toHaveAccessibleDescription();
    const reason = screen.getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAccessibleDescription(/\S/);
    fireEvent.change(reason, { target: { value: '  Curates the celestial bodies  ' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: BO.id, role: 'admin', note: 'Curates the celestial bodies' }]);
    expect(announced()).toContain(BO.name);
  });

  it('demotes a keeper to a curator with no reason', async () => {
    const calls = sent();
    renderDetail({ user: ADA });

    fireEvent.click(changeRole('Ada Fixturewort'));
    fireEvent.click(screen.getByRole('radio', { name: /^Curator/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Demote' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: ADA.id, role: 'curator' }]);
  });

  it('moves a curator down to user, or up to admin', async () => {
    const calls = sent();
    renderDetail({ user: CY });

    fireEvent.click(changeRole('Cy Fixturewort'));
    fireEvent.click(screen.getByRole('radio', { name: /^Keeper/ }));
    expect(screen.getByRole('button', { name: 'Promote' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^User/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Demote' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ userId: CY.id, role: 'user' }]);
  });

  it('warns before promoting a user whose email is unverified, and not before demoting them', async () => {
    sent();
    renderDetail({ user: CY });

    fireEvent.click(changeRole('Cy Fixturewort'));
    fireEvent.click(screen.getByRole('radio', { name: /^User/ }));
    expect(screen.getByRole('button', { name: 'Demote' })).not.toHaveAccessibleDescription();
    fireEvent.click(screen.getByRole('radio', { name: /^Keeper/ }));
    const confirm = screen.getByRole('button', { name: 'Promote' });
    expect(confirm).toHaveAccessibleDescription(/\S/);

    fireEvent.click(confirm);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('marks the primary keeper with a crown, whose Change Role is in view but aria-disabled, described by the reason', () => {
    renderDetail({ user: { ...ADA, primaryAdmin: true } });

    const open = changeRole('Ada Fixturewort');
    expect(open).toBeVisible();
    expect(open).toBeEnabled();
    expect(open).toHaveAttribute('aria-disabled', 'true');
    expect(open).toHaveAccessibleDescription(PRIMARY_ADMIN_REFUSAL);
  });

  it('states the reason when the primary keeper’s Change Role is tried, asking nothing and sending nothing', () => {
    const calls = sent();
    renderDetail({ user: { ...ADA, primaryAdmin: true } });

    fireEvent.click(changeRole('Ada Fixturewort'));

    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(calls).toEqual([]);
  });

  it('locks Change Role for a keeper the pause on keeper changes binds, described by the reason', () => {
    renderDetail({ user: ADA, changesPaused: true });

    const open = changeRole('Ada Fixturewort');
    expect(open).toBeEnabled();
    expect(open).toHaveAttribute('aria-disabled', 'true');
    expect(open).toHaveAccessibleDescription(/\S/);
  });

  it('locks nothing while keeper changes are on', () => {
    renderDetail({ user: ADA, changesPaused: false });

    expect(changeRole('Ada Fixturewort')).not.toHaveAttribute('aria-disabled');
  });

  it('keeps the primary keeper’s Change Role on its own reason while paused', () => {
    renderDetail({ user: { ...ADA, primaryAdmin: true }, changesPaused: true });

    expect(changeRole('Ada Fixturewort')).toHaveAccessibleDescription(PRIMARY_ADMIN_REFUSAL);
  });
});
