import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import ReceivedInvitations from '@/components/ReceivedInvitations';
import type { ReceivedInvitationEntry } from '@/components/ReceivedInvitations/types';
import type {
  AcceptInvitationByIdMutation,
  AcceptInvitationByIdMutationVariables,
  DeclineInvitationByIdMutation,
  DeclineInvitationByIdMutationVariables,
} from '@/gql/graphql';
import { announced, expectRefusalUnder } from '../../support/click-feedback';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The invitations addressed to the signed-in account, on the account page
// : one row each, with its own Accept and Decline
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

const show = () =>
  render(<ReceivedInvitations invitations={INVITATIONS} />, { wrapper: StatusRegionProvider });
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

    const times = screen.getAllByText(/^\d{1,2} \w+ \d{4}, \d{1,2}:\d{2} (am|pm)$/);
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
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    // Only the row that was clicked is sent.
    expect(acceptFor('Fixture Coven')).not.toHaveAttribute('aria-disabled');
    // The coven it opens is the news; the status region says nothing.
    expect(announced()).toBe('');
  });

  describe('an Accept the service refuses', () => {
    const refuse = () =>
      mockGraphQLError('AcceptInvitationById', {
        code: 'FORBIDDEN',
        message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
      });

    it('says it under the button, the focus kept on it, and offers Accept again', async () => {
      refuse();
      show();
      const button = acceptFor('Fixture Coven');

      act(() => button.focus());
      fireEvent.click(button);

      await expectRefusalUnder(button, 'Accept the invitation to Fixture Coven');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(router.push).not.toHaveBeenCalled();
    });

    it('sends once while the first press is in flight', async () => {
      let calls = 0;
      mockGraphQLMutation<AcceptInvitationByIdMutation, AcceptInvitationByIdMutationVariables>(
        'AcceptInvitationById',
        (variables) => {
          calls += 1;
          return {
            acceptInvitationById: { id: String(variables.id), acceptedAt: '2026-10-13T00:00:00Z' },
          };
        },
      );
      show();
      const button = acceptFor('Fixture Coven');

      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => expect(router.push).toHaveBeenCalledOnce());
      expect(calls).toBe(1);
    });

    it('clears the alert when Accept is tried again', async () => {
      refuse();
      show();
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

  it('sends only that invitation’s id, reads the page again and says so', async () => {
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

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: 'i-2' }]);
    // Declining leaves the page where it is: no coven is opened.
    expect(router.push).not.toHaveBeenCalled();
    expect(announced()).toContain('Testwort Circle');
  });

  it('says the service’s refusal under Decline, the focus back on it, and offers Decline again', async () => {
    mockGraphQLError('DeclineInvitationById', {
      code: 'FORBIDDEN',
      message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
    });
    show();
    fireEvent.click(declineFor('Fixture Coven'));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    await expectRefusalUnder(
      declineFor('Fixture Coven'),
      'Decline the invitation to Fixture Coven',
    );
    expect(declineFor('Fixture Coven')).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
