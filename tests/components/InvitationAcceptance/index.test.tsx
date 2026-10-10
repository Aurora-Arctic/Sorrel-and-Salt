import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationAcceptance from '@/components/InvitationAcceptance';
import type { AcceptInvitationMutation, AcceptInvitationMutationVariables } from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// `/invite/[token]`'s one panel (MB.70): the page reads where the visitor
// stands, and this shows it, and sends the accept
// (claude-docs/components/invitation-acceptance.md).

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  router.push.mockClear();
});

const accept = () => screen.getByRole('button', { name: 'Accept Invitation' });

describe('InvitationAcceptance', () => {
  it('asks a signed-out visitor to sign in, and back to the link', () => {
    render(<InvitationAcceptance status="signed-out" signInHref="/sign-in?next=%2Finvite%2Fabc" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Finvite%2Fabc',
    );
    expect(screen.queryByRole('button', { name: 'Accept Invitation' })).toBeNull();
  });

  it('says why a link cannot be accepted, with no Accept', () => {
    render(
      <InvitationAcceptance
        status="refused"
        message="This invitation has already been accepted."
      />,
    );

    expect(screen.getByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Invitation' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('points an unverified match at the email page', () => {
    render(
      <InvitationAcceptance
        status="refused"
        message="Confirm your email address, then come back to this link to accept the invitation."
        emailHref="/account/email?next=%2Finvite%2Fabc"
      />,
    );

    expect(screen.getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
      'href',
      '/account/email?next=%2Finvite%2Fabc',
    );
  });

  it('accepts with the token, busy until it lands', async () => {
    const calls: AcceptInvitationMutationVariables[] = [];
    mockGraphQLMutation<AcceptInvitationMutation, AcceptInvitationMutationVariables>(
      'AcceptInvitation',
      (variables) => {
        calls.push(variables);
        return { acceptInvitation: { id: 'i1' } };
      },
    );
    render(<InvitationAcceptance status="acceptable" token="abc" tier="site" landing="/admin" />);
    expect(screen.getByText(/invited to become an admin/)).toBeInTheDocument();

    fireEvent.click(accept());

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin'));
    expect(calls).toEqual([{ token: 'abc' }]);
    expect(screen.getByRole('button', { name: 'Accepting' })).toBeDisabled();
  });

  it('says the service’s refusal and offers Accept again', async () => {
    mockGraphQLError('AcceptInvitation', {
      code: 'FORBIDDEN',
      message: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
    });
    render(<InvitationAcceptance status="acceptable" token="abc" tier="site" landing="/admin" />);

    fireEvent.click(accept());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation was withdrawn. Ask whoever sent it for a new one.',
    );
    expect(accept()).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
