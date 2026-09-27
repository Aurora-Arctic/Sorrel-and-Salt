import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SignInMethods from '@/components/SignInMethods';
import type { LinkedAccount, ProviderId } from '@/lib/social-providers';
import { GENERIC_LINK_ERROR, GENERIC_UNLINK_ERROR } from '@/lib/sign-in';

// Mocked wholesale, as in SignInPanel's test: a link assigns
// `window.location.href`, which jsdom cannot follow.
const linkSocialMock = vi.fn();
const unlinkAccountMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  linkSocial: (...args: unknown[]) => linkSocialMock(...args),
  unlinkAccount: (...args: unknown[]) => unlinkAccountMock(...args),
}));

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
  });

  it('lists every roster provider, offering the ones not linked', () => {
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    expect(screen.getByRole('heading', { name: 'Sign-in methods' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    // No status text: a linked row is the one without an Add.
    expect(within(row('Discord')).queryByText('Linked')).not.toBeInTheDocument();
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
      errorCallbackURL: '/account',
    });
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
    expect(button).toHaveAccessibleDescription('Not available right now.');

    fireEvent.click(button);
    expect(linkSocialMock).not.toHaveBeenCalled();
  });

  it('offers no Remove while one provider is linked', () => {
    render(<SignInMethods linked={[DISCORD]} configured={ALL} />);

    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('offers Remove on each once two are linked, and removes by the account row id', async () => {
    unlinkAccountMock.mockResolvedValue({ data: { status: true }, error: null });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);

    expect(screen.getByRole('button', { name: 'Remove Discord' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Microsoft' }));

    expect(unlinkAccountMock).toHaveBeenCalledWith({ accountId: 'a-microsoft' });
    expect(await screen.findByRole('status')).toHaveTextContent('Microsoft was removed.');
    expect(within(row('Microsoft')).getByRole('button', { name: 'Add Microsoft' })).toBeVisible();
    // Back to one: the survivor can no longer be removed.
    expect(screen.queryByRole('button', { name: 'Remove Discord' })).not.toBeInTheDocument();
  });

  it('maps a refused removal to its sentence and keeps the provider', async () => {
    unlinkAccountMock.mockResolvedValue({
      data: null,
      error: { status: 403, code: 'SESSION_NOT_FRESH' },
    });
    render(<SignInMethods linked={[DISCORD, MICROSOFT]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Microsoft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in again/i);
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
      <SignInMethods linked={[DISCORD]} configured={ALL} error="That expired. Start again here." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('That expired. Start again here.');
  });
});
