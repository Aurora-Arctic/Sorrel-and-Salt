import type { Route } from 'next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// A cast: the built routes know `/coven/[slug]`, not this literal.
const COVEN_LANDING = '/coven/fixture-coven' as Route;

describe('InvitationAcceptance', () => {
  it('asks a signed-out visitor to sign in, and back to the link', () => {
    render(<InvitationAcceptance status="signed-out" signInHref="/sign-in?next=%2Finvite%2Fabc" />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Finvite%2Fabc',
    );
    expect(screen.queryByRole('button', { name: 'Accept Invitation' })).toBeNull();
  });

  it('says why a link cannot be accepted, with no Accept, pointing an unverified match at the email page', () => {
    const { rerender } = render(
      <InvitationAcceptance
        status="refused"
        message="This invitation has already been accepted."
      />,
    );

    expect(screen.getByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Invitation' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();

    rerender(
      <InvitationAcceptance
        status="refused"
        message="Your email address isn't confirmed yet. Confirm it, then open this link again to accept."
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
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="admin"
        landing="/admin"
      />,
    );
    const button = accept();

    fireEvent.click(button);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin'));
    expect(calls).toEqual([{ token: 'abc' }]);
    // Off with `aria-disabled` rather than `disabled`, so the focus stays on it.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(calls).toHaveLength(1);
  });

  // M11.20: the role is the invitation's data, as a coven's name is.
  it('names what the invitation grants: the site role of a site one, the coven of a coven’s', () => {
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="curator"
        landing="/admin"
      />,
    );

    expect(screen.getByText(/curator/i)).toBeVisible();

    cleanup();
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="workspace"
        landing={COVEN_LANDING}
        covenName="Fixture Coven"
      />,
    );

    expect(screen.getByText(/Fixture Coven/)).toBeVisible();
  });

  // Design F (claude-docs/components/click-feedback.md): a refused accept
  // says the service's sentence in a callout from Accept, which keeps the
  // focus, and leaves a badge that brings it back.
  it('says the service’s refusal from Accept, which keeps the focus', async () => {
    const REFUSED = 'This invitation was withdrawn. Ask whoever sent it for a new one.';
    mockGraphQLError('AcceptInvitation', { code: 'FORBIDDEN', message: REFUSED });
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="admin"
        landing="/admin"
      />,
    );
    const button = accept();
    expect(screen.queryByRole('alert')).toBeNull();

    // Pressed as a pointer or a key leaves it: focused, then clicked.
    await act(async () => {
      button.focus();
      fireEvent.click(button);
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(REFUSED);
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleDescription(`Last try failed: ${REFUSED}`);
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('clears the last refusal when Accept is pressed again, and lands once it is accepted', async () => {
    mockGraphQLError('AcceptInvitation', {
      code: 'FORBIDDEN',
      message:
        "Admin changes are paused, so this invitation can't be accepted until they are resumed.",
    });
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="admin"
        landing="/admin"
      />,
    );
    const button = accept();
    await act(async () => {
      fireEvent.click(button);
    });
    await screen.findByRole('alert');

    mockGraphQLMutation<AcceptInvitationMutation, AcceptInvitationMutationVariables>(
      'AcceptInvitation',
      () => ({ acceptInvitation: { id: 'i1' } }),
    );
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.queryByRole('alert')).toBeNull();
    // The badge fades out, so it goes a moment later.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Show the error for Accept Invitation' }),
      ).toBeNull(),
    );
    expect(button).not.toHaveAccessibleDescription();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin'));
  });
});
