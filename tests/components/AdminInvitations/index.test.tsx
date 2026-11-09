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

// claude-docs/components/admin-invitations.md

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

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
  {
    id: 'i3',
    email: 'cass@example.test',
    siteRole: 'user' as const,
    note: null,
    expiresAt: new Date('2026-10-15T09:00:00Z'),
  },
];

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
});

const dialog = () => screen.getByRole('dialog', { name: 'New Invitation' });
const send = () => within(dialog()).getByRole('button', { name: 'Send Invitation' });
const roleRadio = (role: 'Coven Creator' | 'Curator' | 'Keeper') =>
  within(dialog()).getByRole('radio', { name: new RegExp(`^${role}`) });

describe('AdminInvitations', () => {
  it('lists each pending invitation with its address, role, reason and expiry', () => {
    render(<AdminInvitations invitations={INVITATIONS} />);

    const [, first, second, third] = screen.getAllByRole('row');
    expect(within(first).getByText('ada@example.test')).toBeInTheDocument();
    expect(within(first).getByText('Curator')).toBeInTheDocument();
    expect(within(second).getByText('Keeper')).toBeInTheDocument();
    expect(within(third).getByText('Coven Creator')).toBeInTheDocument();
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
      '/keepers/invitations?invite',
    );
  });

  it('sends an invitation to create a coven, the user role chosen to begin with, with its optional reason, Send disabled until there is the required address, and closes back to the re-read tab', async () => {
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
    expect(roleRadio('Coven Creator')).toBeChecked();
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Email Address' }), {
      target: { value: ' cass@example.test ' },
    });
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
      target: { value: '  Knows the celestial bodies ' },
    });
    expect(send()).toBeEnabled();
    fireEvent.click(send());

    // The list's own empty state is a status region already, so the sent notice is waited for by its text.
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .filter((status) => status.textContent?.includes('cass@example.test')),
      ).toHaveLength(1),
    );
    expect(calls).toEqual([
      { email: 'cass@example.test', siteRole: 'user', note: 'Knows the celestial bodies' },
    ]);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/keepers/invitations', { scroll: false }),
    );
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

  it.each([
    ['Curator', 'curator'],
    ['Keeper', 'admin'],
  ] as const)('sends the %s role when it is chosen', async (label, siteRole) => {
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
    fireEvent.click(roleRadio(label));
    fireEvent.click(send());

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ email: 'cass@example.test', siteRole }]);
  });

  // Every way out asks first while the form has anything typed; the guard's shape is tests/components/Modal's.
  it('asks before Cancel or Escape discards what was typed, and closes on Discard Changes', () => {
    render(<AdminInvitations invitations={[]} inviting />);

    expectGuardedWaysOut(router.replace, () =>
      fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Reason' }), {
        target: { value: 'Knows the celestial bodies' },
      }),
    );
    expect(router.replace).toHaveBeenCalledWith('/keepers/invitations', { scroll: false });
  });

  it('says a refused address beside the field and keeps the form open', async () => {
    mockGraphQLError('CreateAdminInvitation', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'That address belongs to a keeper already' }],
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

  it('locks Invite and every Revoke with the pause as the reason', () => {
    render(
      <>
        <InviteAdmin locked={PAUSED} />
        <AdminInvitations invitations={INVITATIONS} locked={PAUSED} inviting />
      </>,
    );

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

// FilterForm's loading state and Clear are CompendiumList's to test.
describe('AdminInvitations filter', () => {
  const FERN = { email: 'fern', expiringSoon: true };
  const email = () => screen.getByRole('searchbox', { name: 'Email' });
  const soon = () => screen.getByRole('switch', { name: 'Expires in 24 Hrs' });

  // Expires in 24 Hrs is a native checkbox valued empty, so a native submit
  // sends `expiring=`, which the page reads as the bare flag.
  const SUBJECT: FilterFormSubject = {
    label: 'Filter Invitations',
    path: '/keepers/invitations',
    searchLabel: 'Email',
    push: router.push,
    none: { list: <AdminInvitations invitations={INVITATIONS} />, sends: 'email=' },
    shown: {
      list: (
        <AdminInvitations
          invitations={INVITATIONS}
          filter={FERN}
          cursor={{ after: 'c25' }}
          previousHref="/keepers/invitations?email=fern&expiring&before=c1"
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
    searched: '/keepers/invitations?email=Two+words&expiring',
  };

  it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

  it('opens the email from the first page on the magnifier, trimmed, then Expires in 24 Hrs as a bare flag carrying it', async () => {
    render(
      <Navigating push={router.push}>
        <AdminInvitations
          invitations={INVITATIONS}
          cursor={{ after: 'c25' }}
          previousHref="/keepers/invitations?before=c1"
        />
      </Navigating>,
    );
    fireEvent.change(email(), { target: { value: ' Fern ' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(soon());
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/keepers/invitations?email=Fern&expiring');
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
      '/keepers/invitations?email=fern&expiring&after=c25&invite',
    );
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(router.replace).toHaveBeenCalledWith(
      '/keepers/invitations?email=fern&expiring&after=c25',
      { scroll: false },
    );
  });
  describe('the invite form checks the address in the browser, as the coven invite dialog does', () => {
    const emailField = () => within(dialog()).getByRole('textbox', { name: 'Email Address' });

    it('refuses an address the format rule rejects before anything is sent', async () => {
      const calls: CreateAdminInvitationMutationVariables[] = [];
      mockGraphQLMutation<CreateAdminInvitationMutation, CreateAdminInvitationMutationVariables>(
        'CreateAdminInvitation',
        (variables) => {
          calls.push(variables);
          return { createAdminInvitation: { id: 'i9' } };
        },
      );
      render(<AdminInvitations invitations={[]} inviting />);

      fireEvent.change(emailField(), { target: { value: 'ada@example.invalid' } });
      fireEvent.click(send());

      await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
      expect(emailField()).toHaveAccessibleDescription(/\S/);
      expect(calls).toEqual([]);
    });

    it('clears the refusal as the address is changed', async () => {
      render(<AdminInvitations invitations={[]} inviting />);
      fireEvent.change(emailField(), { target: { value: 'ada.example.test' } });
      fireEvent.click(send());
      await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));

      fireEvent.change(emailField(), { target: { value: 'ada@example.test' } });

      expect(emailField()).not.toHaveAttribute('aria-invalid', 'true');
    });
  });
});
