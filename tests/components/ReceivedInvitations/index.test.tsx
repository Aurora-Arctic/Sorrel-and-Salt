import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReceivedInvitations from '@/components/ReceivedInvitations';
import type { ReceivedInvitationEntry } from '@/components/ReceivedInvitations/types';
import type {
  AcceptInvitationByIdMutation,
  AcceptInvitationByIdMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The invitations addressed to the signed-in account, on the /coven landing
// (M10.32): one row each, with its own Accept
// (claude-docs/components/received-invitations.md).

const router = { push: vi.fn() };
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

beforeEach(() => {
  router.push.mockClear();
});

describe('ReceivedInvitations', () => {
  it('lists one row per invitation, each with its own Accept told apart by coven', () => {
    show();

    const table = screen.getByRole('table', { name: 'Your Invitations' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + INVITATIONS.length);
    for (const { covenName } of INVITATIONS) expect(acceptFor(covenName)).toBeEnabled();
  });

  it('draws each expiry as a time element', () => {
    show();

    const times = screen.getAllByText(/UTC$/);
    expect(times.map((time) => time.tagName)).toEqual(['TIME', 'TIME']);
    expect(times[0]).toHaveAttribute('datetime', INVITATIONS[0]?.expiresAt.toISOString());
  });

  it('sends the invitation’s id and opens that coven, busy until it lands', async () => {
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
    expect(calls).toEqual([{ id: 'i-2' }]);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // Only the row that was clicked is sent.
    expect(acceptFor('Fixture Coven')).toBeEnabled();
  });

  it('says the service’s refusal beside the row and offers Accept again', async () => {
    mockGraphQLError('AcceptInvitationById', {
      code: 'FORBIDDEN',
      message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
    });
    show();

    fireEvent.click(acceptFor('Fixture Coven'));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(acceptFor('Fixture Coven')).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
