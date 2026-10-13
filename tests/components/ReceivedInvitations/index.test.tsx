import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActionFailure from '@/components/ActionFailure';
import ReceivedInvitations from '@/components/ReceivedInvitations';
import type { ReceivedInvitationEntry } from '@/components/ReceivedInvitations/types';
import type {
  AcceptInvitationByIdMutation,
  AcceptInvitationByIdMutationVariables,
  DeclineInvitationByIdMutation,
  DeclineInvitationByIdMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The invitations addressed to the signed-in account, on the account page
// (M10.32): one row each, with its own Accept and Decline (M10.34)
// (claude-docs/components/received-invitations.md).

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const INVITATIONS: readonly ReceivedInvitationEntry[] = [
  {
    id: 'i-1',
    covenName: 'Fixture Coven',
    covenSlug: 'fixture-coven',
    role: 'member',
    inviterName: 'Ada Fixture',
    expiresAt: new Date('2026-10-19'),
    note: null,
  },
  {
    id: 'i-2',
    covenName: 'Testwort Circle',
    covenSlug: 'testwort-circle',
    role: 'viewer',
    inviterName: null,
    expiresAt: new Date('2026-10-18'),
    note: 'We meet monthly.',
  },
];

const show = () => render(<ReceivedInvitations invitations={INVITATIONS} />);
const acceptFor = (covenName: string) =>
  screen.getByRole('button', { name: `Accept the invitation to ${covenName}` });

const declineFor = (covenName: string) =>
  screen.getByRole('button', { name: `Decline the invitation to ${covenName}` });

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
});

describe('ReceivedInvitations', () => {
  it('lists one row per invitation, each with its own Accept and Decline told apart by coven', () => {
    show();

    const table = screen.getByRole('table', { name: 'Your Invitations' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + INVITATIONS.length);
    for (const { covenName } of INVITATIONS) {
      expect(acceptFor(covenName)).toBeEnabled();
      expect(declineFor(covenName)).toBeEnabled();
    }
  });

  it('draws each expiry as a time element', () => {
    show();

    const times = screen.getAllByText(/UTC$/);
    expect(times.map((time) => time.tagName)).toEqual(['TIME', 'TIME']);
    expect(times[0]).toHaveAttribute('datetime', INVITATIONS[0]?.expiresAt.toISOString());
  });

  it('sends the invitation’s id and opens that coven, busy until it lands, redrawing the shell', async () => {
    const calls: AcceptInvitationByIdMutationVariables[] = [];
    mockGraphQLMutation<AcceptInvitationByIdMutation, AcceptInvitationByIdMutationVariables>(
      'AcceptInvitationById',
      (variables) => {
        calls.push(variables);
        return {
          acceptInvitationById: { id: String(variables.id), acceptedAt: '2026-10-13T00:00:00Z' },
        };
      },
    );
    show();
    const button = acceptFor('Testwort Circle');

    fireEvent.click(button);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/coven/testwort-circle'));
    // The shell's layout outlives a navigation; the refresh redraws its count.
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(calls).toEqual([{ id: 'i-2' }]);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // Only the row that was clicked is sent.
    expect(acceptFor('Fixture Coven')).toBeEnabled();
  });

  describe('an Accept the service refuses', () => {
    const refuse = () =>
      mockGraphQLError('AcceptInvitationById', {
        code: 'FORBIDDEN',
        message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
      });

    it('says it in the alert above the list when the page gives a place for it', async () => {
      refuse();
      render(
        <ActionFailure>
          <ReceivedInvitations invitations={INVITATIONS} />
        </ActionFailure>,
      );

      fireEvent.click(acceptFor('Fixture Coven'));

      const alert = await screen.findByRole('alert');
      const table = screen.getByRole('table', { name: 'Your Invitations' });
      expect(table).not.toContainElement(alert);
      expect(alert.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(acceptFor('Fixture Coven')).toBeEnabled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('says it beside the row outside such a place, and offers Accept again', async () => {
      refuse();
      show();

      fireEvent.click(acceptFor('Fixture Coven'));

      const alert = await screen.findByRole('alert');
      expect(screen.getByRole('table', { name: 'Your Invitations' })).toContainElement(alert);
      expect(acceptFor('Fixture Coven')).toBeEnabled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('clears the alert when Accept is tried again', async () => {
      refuse();
      render(
        <ActionFailure>
          <ReceivedInvitations invitations={INVITATIONS} />
        </ActionFailure>,
      );
      fireEvent.click(acceptFor('Fixture Coven'));
      await screen.findByRole('alert');
      mockGraphQLMutation<AcceptInvitationByIdMutation, AcceptInvitationByIdMutationVariables>(
        'AcceptInvitationById',
        (variables) => ({
          acceptInvitationById: { id: String(variables.id), acceptedAt: '2026-10-13T00:00:00Z' },
        }),
      );

      fireEvent.click(acceptFor('Fixture Coven'));

      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    });
  });

  it('asks before declining, then sends only that invitation’s id and reads the page again', async () => {
    const calls: DeclineInvitationByIdMutationVariables[] = [];
    mockGraphQLMutation<DeclineInvitationByIdMutation, DeclineInvitationByIdMutationVariables>(
      'DeclineInvitationById',
      (variables) => {
        calls.push(variables);
        return {
          declineInvitationById: {
            id: String(variables.id),
            declinedAt: '2026-10-13T00:00:00Z',
          },
        };
      },
    );
    show();
    fireEvent.click(declineFor('Testwort Circle'));
    const dialog = await screen.findByRole('dialog');
    expect(calls).toEqual([]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: 'i-2' }]);
    // Declining leaves the page where it is: no coven is opened.
    expect(router.push).not.toHaveBeenCalled();
  });

  it('says the service’s refusal beside the row and offers Decline again', async () => {
    mockGraphQLError('DeclineInvitationById', {
      code: 'FORBIDDEN',
      message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
    });
    show();
    fireEvent.click(declineFor('Fixture Coven'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(declineFor('Fixture Coven')).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
