import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminInvitations from '@/components/AdminInvitations';
import type {
  CreateAdminInvitationMutation,
  CreateAdminInvitationMutationVariables,
  RevokeAdminInvitationMutation,
  RevokeAdminInvitationMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// `/admin/users`' invitations (MB.70): render-only, so the page owns the read
// and this owns what an admin sees of it and sends
// (claude-docs/components/admin-invitations.md).

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const PAUSED = 'Admin changes are paused by the primary admin.';

const INVITATIONS = [
  {
    id: 'i1',
    email: 'ada@example.test',
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook@example.test',
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];

beforeEach(() => {
  router.refresh.mockClear();
});

const openInvite = () => fireEvent.click(screen.getByRole('button', { name: 'Invite Admin' }));
const dialog = () => screen.getByRole('dialog', { name: 'Invite an Admin' });
const send = () => within(dialog()).getByRole('button', { name: 'Send Invitation' });

describe('AdminInvitations', () => {
  it('lists each pending invitation with its address, reason and expiry', () => {
    render(<AdminInvitations invitations={INVITATIONS} />);

    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('ada@example.test')).toBeInTheDocument();
    expect(within(first).getByText('Curates the resins')).toBeInTheDocument();
    expect(within(first).getByText('17 October 2026, 20:05 UTC')).toBeInTheDocument();
    expect(within(second).getByText('brook@example.test')).toBeInTheDocument();
  });

  it('draws no table when none are waiting', () => {
    render(<AdminInvitations invitations={[]} />);

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('sends an invitation with its optional reason, Send disabled until there is the required address, and re-reads the page', async () => {
    const calls: CreateAdminInvitationMutationVariables[] = [];
    mockGraphQLMutation<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>(
      'CreateAdminInvitation',
      (variables) => {
        calls.push(variables);
        return { createAdminInvitation: { id: 'i3' } };
      },
    );
    render(<AdminInvitations invitations={[]} />);

    openInvite();
    expect(send()).toBeDisabled();
    expect(within(dialog()).getByRole('textbox', { name: 'Email Address' })).toBeRequired();
    expect(within(dialog()).getByRole('textbox', { name: 'Reason' })).not.toBeRequired();
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Email Address' }), {
      target: { value: ' cass@example.test ' },
    });
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
      target: { value: '  Knows the planets ' },
    });
    expect(send()).toBeEnabled();
    fireEvent.click(send());

    expect(
      (await screen.findAllByRole('status')).filter((status) =>
        status.textContent?.includes('cass@example.test'),
      ),
    ).toHaveLength(1);
    expect(calls).toEqual([{ email: 'cass@example.test', note: 'Knows the planets' }]);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('says a refused address beside the field and keeps the form open', async () => {
    mockGraphQLError('CreateAdminInvitation', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'That address belongs to an admin already' }],
    });
    render(<AdminInvitations invitations={[]} />);

    openInvite();
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Email Address' }), {
      target: { value: 'admin@example.test' },
    });
    fireEvent.click(send());

    const field = within(dialog()).getByRole('textbox', { name: 'Email Address' });
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/\S/);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('revokes an invitation after asking, naming the address', async () => {
    const calls: RevokeAdminInvitationMutationVariables[] = [];
    mockGraphQLMutation<RevokeAdminInvitationMutation, RevokeAdminInvitationMutationVariables>(
      'RevokeAdminInvitation',
      (variables) => {
        calls.push(variables);
        return { revokeAdminInvitation: { id: 'i1' } };
      },
    );
    render(<AdminInvitations invitations={INVITATIONS} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke the invitation to ada@example.test' }),
    );
    const confirm = screen.getByRole('dialog', { name: 'Revoke Invitation' });
    expect(confirm).toHaveTextContent('ada@example.test');
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'Revoke' }));
    });

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ id: 'i1' }]);
  });

  // In view but unusable while paused, as the role controls are (MB.63).
  it('locks Invite and every Revoke with the pause as the reason', () => {
    render(<AdminInvitations invitations={INVITATIONS} locked={PAUSED} />);

    const invite = screen.getByRole('button', { name: 'Invite Admin' });
    expect(invite).toHaveAttribute('aria-disabled', 'true');
    expect(invite).toHaveAccessibleDescription(PAUSED);
    const revoke = screen.getByRole('button', {
      name: 'Revoke the invitation to ada@example.test',
    });
    expect(revoke).toHaveAttribute('aria-disabled', 'true');
    expect(revoke).toHaveAccessibleDescription(PAUSED);

    fireEvent.click(invite);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
