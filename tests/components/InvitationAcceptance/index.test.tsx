import type { Route } from 'next';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationAcceptance from '@/components/InvitationAcceptance';
import type {
  AcceptInvitationMutation,
  AcceptInvitationMutationVariables,
  RecordCardAttemptMutation,
  RecordCardAttemptMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// claude-docs/components/invitation-acceptance.md

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

const signUpEmail = vi.fn();
const getSession = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: vi.fn(), email: vi.fn() },
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
  getSession: (...args: unknown[]) => getSession(...args),
}));

beforeEach(() => {
  router.push.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const accept = () => screen.getByRole('button', { name: 'Accept Invitation' });

// A cast: the built routes know `/coven/[slug]`, not this literal.
const COVEN_LANDING = '/coven/fixture-coven' as Route;

describe('InvitationAcceptance, for a card', () => {
  // An address invitation's dialog says which address to use under its title; a card's has no address to name.
  it.each(['Create Account', 'Sign In'])(
    'gives the dialog from %s no lede under its title, where an address invitation gives one',
    async (choice) => {
      const paragraphsInDialog = async (card: boolean): Promise<number> => {
        render(
          <InvitationAcceptance
            status="signed-out"
            card={card}
            next="/invite/abc"
            configured={['google']}
          />,
        );
        await act(async () => fireEvent.click(screen.getByRole('link', { name: choice })));
        const count = within(screen.getByRole('dialog')).queryAllByRole('paragraph').length;
        cleanup();
        return count;
      };

      const forAnAddress = await paragraphsInDialog(false);
      const forACard = await paragraphsInDialog(true);

      expect(forAnAddress).toBeGreaterThan(0);
      expect(forACard).toBe(forAnAddress - 1);
    },
  );

  it('accepts, and lands where the account starts a coven', async () => {
    mockGraphQLMutation<AcceptInvitationMutation, AcceptInvitationMutationVariables>(
      'AcceptInvitation',
      ({ token }) => {
        expect(token).toBe('abc');
        return { acceptInvitation: { id: 'x' } };
      },
    );
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="card"
        landing={'/coven/new' as Route}
      />,
    );

    fireEvent.click(accept());

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/coven/new'));
  });
});

describe('InvitationAcceptance, for the account that already used a card', () => {
  it('offers the way to start a coven, where a stranger refused gets none', () => {
    const { rerender } = render(
      <InvitationAcceptance
        status="refused"
        message="You've already used this card."
        startCovenHref={'/coven/new' as Route}
      />,
    );

    expect(screen.getByRole('link', { name: 'Start a Coven' })).toHaveAttribute(
      'href',
      '/coven/new',
    );

    rerender(<InvitationAcceptance status="refused" message="Already accepted." />);

    expect(screen.queryByRole('link', { name: 'Start a Coven' })).toBeNull();
  });

  // A refusal is the end of the page, so it leaves a way back to the site, with or without a coven to start.
  it('leaves a refused account a way back to the home page', () => {
    const { rerender } = render(
      <InvitationAcceptance status="refused" message="Already accepted." />,
    );
    const toHome = () =>
      screen.queryAllByRole('link').filter((link) => link.getAttribute('href') === '/');

    expect(toHome()).toHaveLength(1);

    rerender(
      <InvitationAcceptance
        status="refused"
        message="You've already used this card."
        startCovenHref={'/coven/new' as Route}
      />,
    );

    expect(toHome()).toHaveLength(1);
  });
});

describe('InvitationAcceptance', () => {
  // Two equal choices, each a link to the sign-in page back to the invitation, for a press meant for
  // a new tab or a browser without the script.
  it('offers a signed-out visitor Create Account and Sign In, both back to the link, and no Accept', () => {
    render(<InvitationAcceptance status="signed-out" next="/invite/abc" configured={['google']} />);

    for (const name of ['Create Account', 'Sign In']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        '/sign-in?next=%2Finvite%2Fabc',
      );
    }
    expect(screen.queryByRole('button', { name: 'Accept Invitation' })).toBeNull();
  });

  it('opens the dialog over the invitation in the mode each choice names', async () => {
    render(<InvitationAcceptance status="signed-out" next="/invite/abc" configured={['google']} />);

    await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Create Account' })));

    const creating = screen.getByRole('dialog', { name: 'Create an Account' });
    expect(within(creating).queryByRole('button', { name: 'Sign In with a Passkey' })).toBeNull();
    await act(async () => fireEvent.click(within(creating).getByRole('button', { name: 'Close' })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Sign In' })));

    const signingIn = screen.getByRole('dialog', { name: 'Sign In' });
    expect(
      within(signingIn).getByRole('button', { name: 'Sign In with a Passkey' }),
    ).toBeInTheDocument();
    // The invitation stays under the dialog, unaccepted.
    expect(
      screen.getByRole('heading', { name: 'Your Invitation', hidden: true }),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  // The invitation says to check the inbox, where the sign-in page would send a new account to the
  // email page; accepting stays a press of its own.
  it('brings a new email account straight back to the invitation', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    signUpEmail.mockResolvedValue({ data: { status: true }, error: null });
    getSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(<InvitationAcceptance status="signed-out" next="/invite/abc" configured={['google']} />);
    await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Create Account' })));
    const dialog = screen.getByRole('dialog');
    await act(async () =>
      fireEvent.click(within(dialog).getByRole('button', { name: 'Continue with Email' })),
    );
    const field = (label: string) =>
      within(dialog).getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
    fireEvent.change(field('Name'), { target: { value: 'Testwort Hedge' } });
    fireEvent.change(field('Email Address'), { target: { value: 'someone@invitation.test' } });
    fireEvent.change(field('Password'), {
      target: { value: 'Testwort crowns the eastern hedge' },
    });

    await act(async () =>
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create Account' })),
    );

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/invite/abc' }),
    );
    expect(assign).toHaveBeenCalledWith('/invite/abc');
  });

  it('tells a new, unverified account where its message went, with the way to the email page and home, and no Accept', () => {
    render(
      <InvitationAcceptance
        status="unverified"
        email="someone@invitation.test"
        emailHref="/account/email?next=%2Finvite%2Fabc"
      />,
    );

    expect(screen.getByText('someone@invitation.test')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
      'href',
      '/account/email?next=%2Finvite%2Fabc',
    );
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
    // Not a refusal: nothing is wrong yet, only unfinished.
    expect(screen.queryByRole('alert')).toBeNull();
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
    // Only the way back to the home page: no sign-in, accept or start link.
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/']);

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
        landing="/keepers"
      />,
    );
    const button = accept();

    fireEvent.click(button);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/keepers'));
    expect(calls).toEqual([{ token: 'abc' }]);
    // Off with `aria-disabled` rather than `disabled`, so the focus stays on it.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(calls).toHaveLength(1);
  });

  it('names what the invitation grants: the site role of a site one, the coven of a coven’s', () => {
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="curator"
        landing="/keepers"
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

  // Design F (claude-docs/components/click-feedback.md).
  it('says the service’s refusal from Accept, which keeps the focus', async () => {
    const REFUSED = 'This invitation was withdrawn. Ask whoever sent it for a new one.';
    mockGraphQLError('AcceptInvitation', { code: 'FORBIDDEN', message: REFUSED });
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="admin"
        landing="/keepers"
      />,
    );
    const button = accept();
    expect(screen.queryByRole('alert')).toBeNull();

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
        "Keeper changes are paused, so this invitation can't be accepted until they are resumed.",
    });
    render(
      <InvitationAcceptance
        status="acceptable"
        token="abc"
        tier="site"
        siteRole="admin"
        landing="/keepers"
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
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Show the error for Accept Invitation' }),
      ).toBeNull(),
    );
    expect(button).not.toHaveAccessibleDescription();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/keepers'));
  });
});

describe('InvitationAcceptance, recording a refused open', () => {
  it('sends the token once when the refusal shows, and says nothing of it', async () => {
    const tokens: string[] = [];
    mockGraphQLMutation<RecordCardAttemptMutation, RecordCardAttemptMutationVariables>(
      'RecordCardAttempt',
      ({ token }) => {
        tokens.push(token);
        return { recordCardAttempt: true };
      },
    );
    render(
      <InvitationAcceptance status="refused" token="abc" message="This card has been revoked." />,
    );

    await waitFor(() => expect(tokens).toEqual(['abc']));
    expect(screen.getByText('This card has been revoked.')).toBeInTheDocument();
  });

  it('keeps the refusal when the record fails', async () => {
    mockGraphQLError('RecordCardAttempt', { code: 'FORBIDDEN', message: 'Nope' });
    render(
      <InvitationAcceptance status="refused" token="abc" message="This card has been revoked." />,
    );

    await act(async () => {});
    expect(screen.getByText('This card has been revoked.')).toBeInTheDocument();
  });

  it('sends nothing for a signed-out visitor', async () => {
    let sent = 0;
    mockGraphQLMutation<RecordCardAttemptMutation, RecordCardAttemptMutationVariables>(
      'RecordCardAttempt',
      () => {
        sent += 1;
        return { recordCardAttempt: true };
      },
    );
    render(<InvitationAcceptance status="signed-out" card next="/i/abc" configured={['google']} />);

    await act(async () => {});
    expect(sent).toBe(0);
  });
});
