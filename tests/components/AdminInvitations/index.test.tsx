import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminInvitations, { InviteAdmin } from '@/components/AdminInvitations';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '@/lib/primary-admin';
import type {
  CreateAdminInvitationMutation,
  CreateAdminInvitationMutationVariables,
  RevokeAdminInvitationMutation,
  RevokeAdminInvitationMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The Invitations tab (MB.70; MB.115): render-only, so the page owns the read
// and this owns what an admin sees of it and sends, Invite Admin beside the
// heading included (claude-docs/components/admin-invitations.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

// The pause's reason, as the page passes it.
const PAUSED = ADMIN_CHANGES_PAUSED_REFUSAL;

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
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
});

const dialog = () => screen.getByRole('dialog', { name: 'Invite Admin' });
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

  it('opens the invite form by the address, from a link', () => {
    render(<InviteAdmin />);

    expect(screen.getByRole('link', { name: 'Invite Admin' })).toHaveAttribute(
      'href',
      '/admin/invitations?invite',
    );
  });

  it('sends an invitation with its optional reason, Send disabled until there is the required address, and closes back to the re-read tab', async () => {
    const calls: CreateAdminInvitationMutationVariables[] = [];
    mockGraphQLMutation<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>(
      'CreateAdminInvitation',
      (variables) => {
        calls.push(variables);
        return { createAdminInvitation: { id: 'i3' } };
      },
    );
    const { rerender } = render(<AdminInvitations invitations={[]} inviting />);

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
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/invitations'));
    expect(router.refresh).toHaveBeenCalled();

    // Back at the tab, the form's address gone: the notice outlasts it.
    rerender(<AdminInvitations invitations={[]} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen
        .getAllByRole('status')
        .filter((status) => status.textContent?.includes('cass@example.test')),
    ).toHaveLength(1);
  });

  // Every way out asks first while the form has anything typed (MB.115): the
  // guard's shape is tests/components/Modal's, and this its wiring; the close
  // it makes is the modal's, back to the tab.
  it('asks before Cancel or Escape discards what was typed, and closes on Discard Changes', () => {
    render(<AdminInvitations invitations={[]} inviting />);
    const cancel = () => within(dialog()).getByRole('button', { name: 'Cancel' });
    const discard = () => within(dialog()).queryByRole('button', { name: 'Discard Changes' });

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
      target: { value: 'Knows the planets' },
    });
    fireEvent.click(cancel());
    expect(discard()).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Keep Editing' }));
    fireEvent(dialog(), new Event('cancel', { cancelable: true }));
    expect(discard()).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.click(discard()!);
    expect(router.replace).toHaveBeenCalledWith('/admin/invitations');
  });

  it('closes at once on Cancel with nothing typed', () => {
    render(<AdminInvitations invitations={[]} inviting />);

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(router.replace).toHaveBeenCalledWith('/admin/invitations');
  });

  it('says a refused address beside the field and keeps the form open', async () => {
    mockGraphQLError('CreateAdminInvitation', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'That address belongs to an admin already' }],
    });
    render(<AdminInvitations invitations={[]} inviting />);

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
    render(
      <>
        <InviteAdmin locked={PAUSED} />
        <AdminInvitations invitations={INVITATIONS} locked={PAUSED} inviting />
      </>,
    );

    // Not opened even by the form's address.
    expect(screen.queryByRole('dialog')).toBeNull();
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

// The filter (MB.115): FilterForm's loading state and Clear Filters are
// CompendiumList's to test; this asserts the address this one builds, which
// of its values count as a filter, and that the invite form keeps it.
describe('AdminInvitations filter', () => {
  const FERN = { email: 'fern', expiringSoon: true };
  const email = () => screen.getByRole('searchbox', { name: 'Email' });
  const soon = () => screen.getByRole('switch', { name: 'Expires in 24 Hrs' });
  const filterButton = () => screen.getByRole('button', { name: 'Filter' });
  const clearLink = () => screen.getByRole('link', { name: 'Clear Filters' });

  it('opens the filtered list, the email trimmed and Expires in 24 Hrs a bare flag', () => {
    render(<AdminInvitations invitations={INVITATIONS} />);
    expect(filterButton()).toBeDisabled();

    fireEvent.change(email(), { target: { value: ' Fern ' } });
    fireEvent.click(soon());
    fireEvent.click(filterButton());

    expect(router.push).toHaveBeenCalledWith('/admin/invitations?email=Fern&expiring');
  });

  it('starts from the filter shown, and offers Clear Filters to the unfiltered list while either part is shown', () => {
    for (const filter of [
      { email: 'fern', expiringSoon: false },
      { email: '', expiringSoon: true },
    ]) {
      const { unmount } = render(<AdminInvitations invitations={[]} filter={filter} />);

      expect(email()).toHaveValue(filter.email);
      expect(soon()).toHaveProperty('checked', filter.expiringSoon);
      expect(clearLink()).toHaveAttribute('href', '/admin/invitations');
      unmount();
    }

    render(<AdminInvitations invitations={[]} />);
    expect(clearLink()).toHaveAttribute('aria-disabled', 'true');
  });

  it('empties the email and Expires in 24 Hrs in place when neither is applied yet', () => {
    render(<AdminInvitations invitations={INVITATIONS} />);

    fireEvent.change(email(), { target: { value: 'fern' } });
    fireEvent.click(soon());
    fireEvent.click(clearLink());

    expect(router.push).not.toHaveBeenCalled();
    expect(email()).toHaveValue('');
    expect(soon()).not.toBeChecked();
    expect(filterButton()).toBeDisabled();
  });

  it('keeps the filter in Invite Admin and in the invite form’s close', () => {
    render(
      <>
        <InviteAdmin filter={FERN} />
        <AdminInvitations invitations={[]} filter={FERN} inviting />
      </>,
    );

    expect(screen.getByRole('link', { name: 'Invite Admin' })).toHaveAttribute(
      'href',
      '/admin/invitations?email=fern&expiring&invite',
    );
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/invitations?email=fern&expiring');
  });
});
