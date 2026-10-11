import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SignInMethods from '@/components/SignInMethods';
import { GENERIC_LINK_ERROR, GENERIC_UNLINK_ERROR } from '@/lib/sign-in';
import type { LinkedAccount, ProviderId } from '@/lib/types';

// Mocked wholesale, as in SignInPanel's test: a link assigns
// `window.location.href`, which jsdom cannot follow, and a sign-out's
// success navigates, as in SignOutButton's.
const linkSocialMock = vi.fn();
const unlinkAccountMock = vi.fn();
const signOutMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  linkSocial: (...args: unknown[]) => linkSocialMock(...args),
  unlinkAccount: (...args: unknown[]) => unlinkAccountMock(...args),
  signOut: () => signOutMock(),
}));
const assignMock = vi.fn();

const ALL: readonly ProviderId[] = ['discord', 'google', 'facebook', 'microsoft'];
const DISCORD: LinkedAccount = { id: 'a-discord', providerId: 'discord' };
const MICROSOFT: LinkedAccount = { id: 'a-microsoft', providerId: 'microsoft' };

/** The list item naming a provider. */
function row(label: string): HTMLElement {
  const item = screen
    .getAllByRole('listitem')
    .find((candidate) => within(candidate).queryByText(label, { exact: true }));
  if (!item) throw new Error(`no row for ${label}`);
  return item;
}

describe('SignInMethods', () => {
  afterEach(() => {
    linkSocialMock.mockReset();
    unlinkAccountMock.mockReset();
    signOutMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lists every roster provider, offering the ones not linked', () => {
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    // A linked row is the one without an Add.
    expect(within(row('Discord')).queryByRole('button')).not.toBeInTheDocument();
    for (const label of ['Google', 'Facebook', 'Microsoft']) {
      expect(within(row(label)).getByRole('button', { name: `Add ${label}` })).toBeInTheDocument();
    }
  });

  it('starts a link with the provider, landing back on the account page either way', () => {
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Microsoft' }));

    expect(linkSocialMock).toHaveBeenCalledWith({
      provider: 'microsoft',
      callbackURL: '/account',
      errorCallbackURL: '/account?provider=microsoft',
    });
  });

  it("a failed link's error is in its provider's row", () => {
    render(
      <SignInMethods
        linked={[DISCORD]}
        configured={ALL}
        error={{ providerId: 'microsoft', message: GENERIC_LINK_ERROR }}
      />,
    );

    expect(within(row('Microsoft')).getByRole('alert')).toBeVisible();
    expect(within(row('Google')).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the generic link sentence when the link fails before any redirect', async () => {
    linkSocialMock.mockResolvedValue({ error: { status: 500 } });
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_LINK_ERROR);
  });

  // aria-disabled rather than disabled keeps it in the tab order, as on /sign-in.
  it('greys out an unconfigured provider, keeping it reachable, and starts nothing', () => {
    render(<SignInMethods linked={[DISCORD]} configured={['discord', 'google']} />);

    const button = screen.getByRole('button', { name: 'Add Microsoft' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription(/\S/);

    fireEvent.click(button);
    expect(linkSocialMock).not.toHaveBeenCalled();
  });

  it('with one method left, the row says why it cannot go', () => {
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    expect(within(row('Discord')).getByRole('paragraph')).toHaveTextContent(/\S/);
  });

  // Better Auth would refuse every removal from a session older than its
  // `freshAge`, so none is offered; the same two linked offer Remove fresh.
  it('with a stale session and two methods linked, Remove is withheld and Sign In Again is offered', () => {
    const { unmount } = render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2);
    unmount();

    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} fresh={false} />);

    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In Again' })).toHaveAccessibleDescription(/\S/);
    // Not the last method's reason: neither row is the only one.
    expect(within(row('Discord')).queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('Sign In Again signs out and sends the browser to sign-in with the account page as the return path', async () => {
    signOutMock.mockResolvedValue({ error: null });
    vi.stubGlobal('location', { assign: assignMock });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} fresh={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign In Again' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    const target = new URL(assignMock.mock.calls[0][0] as string, 'http://relative.invalid');
    expect(target.pathname).toBe('/sign-in');
    expect(target.searchParams.get('next')).toBe('/account');
  });

  it('offers Remove on each once two are linked, and removes by the account row id', async () => {
    unlinkAccountMock.mockResolvedValue({ data: { status: true }, error: null });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);

    expect(screen.getByRole('button', { name: 'Remove Discord' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Microsoft' }));

    expect(unlinkAccountMock).toHaveBeenCalledWith({ accountId: 'a-microsoft' });
    expect(await screen.findByRole('status')).toHaveTextContent('Microsoft');
    expect(within(row('Microsoft')).getByRole('button', { name: 'Add Microsoft' })).toBeVisible();
    // Back to one: the survivor can no longer be removed.
    expect(screen.queryByRole('button', { name: 'Remove Discord' })).not.toBeInTheDocument();
  });

  it('maps a refused removal to a sentence of its own and keeps the provider', async () => {
    unlinkAccountMock.mockResolvedValue({
      data: null,
      error: { status: 403, code: 'SESSION_NOT_FRESH' },
    });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Microsoft' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/\S/);
    expect(alert).not.toHaveTextContent(GENERIC_UNLINK_ERROR);
    expect(
      within(row('Microsoft')).getByRole('button', { name: 'Remove Microsoft' }),
    ).toBeVisible();
  });

  it('falls back to the generic removal sentence for a refusal with no known code', async () => {
    unlinkAccountMock.mockResolvedValue({ data: null, error: { status: 500 } });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Discord' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_UNLINK_ERROR));
  });

  it('shows a passed-in callback error as an alert, and none without one', () => {
    const { unmount } = render(<SignInMethods linked={[DISCORD]} configured={ALL} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    render(
      <SignInMethods
        linked={[DISCORD]}
        configured={ALL}
        error={{ message: 'That expired. Start again here.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('That expired. Start again here.');
  });
});
