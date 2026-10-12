import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from '@/components/Modal';
import UserDetail from '@/components/UserDetail';
import type { UserCoven, UserDetailProps, UserDetailUser } from '@/components/UserDetail/types';

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which jsdom cannot follow.
const impersonateUserMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  impersonateUser: (...args: unknown[]) => impersonateUserMock(...args),
}));
const assignMock = vi.fn();

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
  vi.stubGlobal('location', { ...window.location, assign: assignMock });
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

  it('is read-only: no Grant, Revoke or Approve in the body', () => {
    renderDetail({ canImpersonate: true });

    expect(screen.queryByRole('button', { name: /Grant|Revoke|Approve/ })).not.toBeInTheDocument();
  });

  it('lists the covens, owners first, then members, then viewers, each by name', () => {
    renderDetail();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Omega Coven',
      'Alpha Coven',
      'Beta Coven',
      'Zeta Coven',
    ]);
    expect(within(rows[0]!).getByRole('cell', { name: 'Owner' })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole('cell', { name: 'Member' })).toBeInTheDocument();
    expect(within(rows[3]!).getByRole('cell', { name: 'Viewer' })).toBeInTheDocument();
  });

  it('names a coven in text, never a link: an admin is no member of it', () => {
    renderDetail();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('draws no table when the user belongs to no coven', () => {
    renderDetail({ memberships: [] });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('offers Impersonate on a user’s modal where impersonation is registered', () => {
    renderDetail({ canImpersonate: true });

    expect(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' })).toBeEnabled();
  });

  it('offers no Impersonate on an admin, or where it is not registered', () => {
    const { unmount } = renderDetail({ user: ADA, canImpersonate: true });
    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
    unmount();

    renderDetail({ canImpersonate: false });
    expect(screen.queryByRole('button', { name: /Impersonate/ })).not.toBeInTheDocument();
  });

  it('asks first, and sends nothing until it is confirmed', () => {
    renderDetail({ canImpersonate: true });

    fireEvent.click(screen.getByRole('button', { name: 'Impersonate Bo Fixturewort' }));

    expect(screen.getByRole('button', { name: 'Impersonate' })).toBeInTheDocument();
    expect(impersonateUserMock).not.toHaveBeenCalled();
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
