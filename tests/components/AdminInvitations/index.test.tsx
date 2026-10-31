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
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { announced, expectRefusalUnder } from '../../support/click-feedback';
import { expectGuardedWaysOut } from '../../support/discard-guard';
import { FILTER_ROWS } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import type { FilterFormSubject } from '../../support/types';

// The Invitations tab: render-only, so the page owns the read
// and this owns what an admin sees of it and sends, New Invitation beside the
// heading included (claude-docs/components/admin-invitations.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The pause's reason, as the page passes it.
const PAUSED = ADMIN_CHANGES_PAUSED_REFUSAL;

const INVITATIONS = [
  {
    id: 'i1',
    email: 'ada@example.test',
    siteRole: 'curator' as const,
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook@example.test',
    siteRole: 'admin' as const,
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
});

const dialog = () => screen.getByRole('dialog', { name: 'New Invitation' });
const send = () => within(dialog()).getByRole('button', { name: 'Send Invitation' });
/** A role's radio, by the start of its name: its description is read after it. */
const roleRadio = (role: 'Curator' | 'Admin') =>
  within(dialog()).getByRole('radio', { name: new RegExp(`^${role}`) });

describe('AdminInvitations', () => {
  it('lists each pending invitation with its address, role, reason and expiry', () => {
    render(<AdminInvitations invitations={INVITATIONS} />);

    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('ada@example.test')).toBeInTheDocument();
    expect(within(first).getByText('Curator')).toBeInTheDocument();
    expect(within(second).getByText('Admin')).toBeInTheDocument();
    expect(within(first).getByText('Curates the resins')).toBeInTheDocument();
    expect(
      within(first).getByText(/^\d{1,2} October \d{4}, \d{1,2}:\d{2} (am|pm)$/),
    ).toBeInTheDocument();
    expect(within(second).getByText('brook@example.test')).toBeInTheDocument();
  });

  it('draws no table when none are waiting', () => {
    render(<AdminInvitations invitations={[]} />);

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('opens the invite form by the address, from a link', () => {
    render(<InviteAdmin />);

    expect(screen.getByRole('link', { name: 'New Invitation' })).toHaveAttribute(
      'href',
      '/admin/invitations?invite',
    );
  });

  it('sends an invitation to the curator role with its optional reason, Send disabled until there is the required address, and closes back to the re-read tab', async () => {
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
    // The lesser role is the one an admin has to choose against.
    expect(roleRadio('Curator')).toBeChecked();
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Email Address' }), {
      target: { value: ' cass@example.test ' },
    });
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
      target: { value: '  Knows the celestial bodies ' },
    });
    expect(send()).toBeEnabled();
    fireEvent.click(send());

    expect(
      (await screen.findAllByRole('status')).filter((status) =>
        status.textContent?.includes('cass@example.test'),
      ),
    ).toHaveLength(1);
    expect(calls).toEqual([
      { email: 'cass@example.test', siteRole: 'curator', note: 'Knows the celestial bodies' },
    ]);
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

  it('sends the admin role when it is chosen', async () => {
    const calls: CreateAdminInvitationMutationVariables[] = [];
    mockGraphQLMutation<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>(
      'CreateAdminInvitation',
      (variables) => {
        calls.push(variables);
        return { createAdminInvitation: { id: 'i3' } };
      },
    );
    render(<AdminInvitations invitations={[]} inviting />);

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Email Address' }), {
      target: { value: 'cass@example.test' },
    });
    fireEvent.click(roleRadio('Admin'));
    fireEvent.click(send());

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ email: 'cass@example.test', siteRole: 'admin' }]);
  });

  // Every way out asks first while the form has anything typed: the
  // guard's shape is tests/components/Modal's, and this its wiring; the close
  // it makes is the modal's, back to the tab.
  it('asks before Cancel or Escape discards what was typed, and closes on Discard Changes', () => {
    render(<AdminInvitations invitations={[]} inviting />);

    expectGuardedWaysOut(router.replace, () =>
      fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
        target: { value: 'Knows the celestial bodies' },
      }),
    );
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

  it('revokes an invitation after asking, naming the address, and says so', async () => {
    const calls: RevokeAdminInvitationMutationVariables[] = [];
    mockGraphQLMutation<RevokeAdminInvitationMutation, RevokeAdminInvitationMutationVariables>(
      'RevokeAdminInvitation',
      (variables) => {
        calls.push(variables);
        return { revokeAdminInvitation: { id: 'i1' } };
      },
    );
    render(<AdminInvitations invitations={INVITATIONS} />, { wrapper: StatusRegionProvider });

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
    expect(announced()).toContain('ada@example.test');
  });

  it('says why under Revoke when the service refuses, and reads nothing again', async () => {
    mockGraphQLError('RevokeAdminInvitation', {
      code: 'FORBIDDEN',
      message: 'That invitation is no longer pending',
    });
    render(<AdminInvitations invitations={INVITATIONS} />);
    const name = 'Revoke the invitation to ada@example.test';

    fireEvent.click(screen.getByRole('button', { name }));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Revoke Invitation' })).getByRole('button', {
          name: 'Revoke',
        }),
      );
    });

    await expectRefusalUnder(screen.getByRole('button', { name }), name);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  // In view but unusable while paused, as the role controls are.
  it('locks Invite and every Revoke with the pause as the reason', () => {
    render(
      <>
        <InviteAdmin locked={PAUSED} />
        <AdminInvitations invitations={INVITATIONS} locked={PAUSED} inviting />
      </>,
    );

    // Not opened even by the form's address.
    expect(screen.queryByRole('dialog')).toBeNull();
    const invite = screen.getByRole('button', { name: 'New Invitation' });
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

// The filter: FilterForm's loading state and Clear are CompendiumList's to test, and the shared rows assert the address this one builds and which values count as a filter.
// This file proves the switch carries the email and the invite form keeps the filter and the page shown. It is a soft navigation from the first page, as every page under /admin runs its own guard.
describe('AdminInvitations filter', () => {
  const FERN = { email: 'fern', expiringSoon: true };
  const email = () => screen.getByRole('searchbox', { name: 'Email' });
  const soon = () => screen.getByRole('switch', { name: 'Expires in 24 Hrs' });

  // Expires in 24 Hrs is a native checkbox valued empty, so a native submit
  // sends `expiring=`, which the page reads as the bare flag.
  const SUBJECT: FilterFormSubject = {
    label: 'Filter Invitations',
    path: '/admin/invitations',
    searchLabel: 'Email',
    push: router.push,
    none: { list: <AdminInvitations invitations={INVITATIONS} />, sends: 'email=' },
    shown: {
      list: (
        <AdminInvitations
          invitations={INVITATIONS}
          filter={FERN}
          cursor={{ after: 'c25' }}
          previousHref="/admin/invitations?email=fern&expiring&before=c1"
        />
      ),
      sends: 'email=fern&expiring=',
    },
    alone: [
      {
        list: <AdminInvitations invitations={[]} filter={{ email: 'fern', expiringSoon: false }} />,
        sends: 'email=fern',
      },
      {
        list: <AdminInvitations invitations={[]} filter={{ email: '', expiringSoon: true }} />,
        sends: 'email=&expiring=',
      },
    ],
    searched: '/admin/invitations?email=Two+words&expiring',
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  it('opens the email from the first page on the magnifier, trimmed, then Expires in 24 Hrs as a bare flag carrying it', async () => {
    render(
      <Navigating push={router.push}>
        <AdminInvitations
          invitations={INVITATIONS}
          cursor={{ after: 'c25' }}
          previousHref="/admin/invitations?before=c1"
        />
      </Navigating>,
    );
    fireEvent.change(email(), { target: { value: ' Fern ' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(soon());
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/admin/invitations?email=Fern&expiring');
  });

  it('keeps the filter and the page shown in New Invitation and in the invite form’s close', () => {
    const cursor = { after: 'c25' };
    render(
      <>
        <InviteAdmin filter={FERN} cursor={cursor} />
        <AdminInvitations invitations={[]} filter={FERN} cursor={cursor} inviting />
      </>,
    );

    expect(screen.getByRole('link', { name: 'New Invitation' })).toHaveAttribute(
      'href',
      '/admin/invitations?email=fern&expiring&after=c25&invite',
    );
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/invitations?email=fern&expiring&after=c25');
  });
});
