import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';

// Better Auth's client performs the OAuth hop by assigning
// `window.location.href` (tests/lib/auth-client.test.ts) — jsdom can't
// follow that, so `signIn` is mocked here rather than stubbing fetch, which is
// how auth-client.test.ts exercises the real thing. The rest of the module is
// the real one, so the last-used mark reads jsdom's own `document.cookie`.
const socialMock = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: (...args: unknown[]) => socialMock(...args) },
}));

function setLastUsed(value: string): void {
  document.cookie = `${LAST_USED_PROVIDER_COOKIE}=${value}; path=/`;
}

function clearLastUsed(): void {
  document.cookie = `${LAST_USED_PROVIDER_COOKIE}=; max-age=0; path=/`;
}

describe('SignInPanel', () => {
  afterEach(() => {
    socialMock.mockReset();
    clearLastUsed();
  });

  it('offers every roster provider, and calls signIn.social with the provider, the destination and an error callback carrying it', () => {
    render(
      <SignInPanel
        next="/coven/hearth"
        configured={['google', 'discord', 'facebook', 'microsoft']}
      />,
    );

    for (const name of ['Discord', 'Facebook', 'Microsoft']) {
      expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeEnabled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });
  });

  // With no return path the callback lands the account by role, so the
  // sign-in says it asked for none rather than naming the /coven landing.
  it('flags a sign-in with no return path, keeping a failed one without one, and sends an explicit /coven unflagged', () => {
    const { unmount } = render(<SignInPanel configured={['google']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenLastCalledWith({
      provider: 'google',
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in',
      additionalData: { noReturnPath: true },
    });
    unmount();

    render(<SignInPanel next="/coven" configured={['google']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenLastCalledWith({
      provider: 'google',
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in?next=%2Fcoven',
    });
  });

  it('shows a passed-in error as an alert, and none without one', () => {
    const { unmount } = render(<SignInPanel next="/" configured={['google']} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    render(
      <SignInPanel
        next="/"
        error="Sign-in was cancelled before it finished."
        configured={['google']}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sign-in was cancelled before it finished.',
    );
  });

  it('surfaces a failing signIn.social result in the same alert region', async () => {
    socialMock.mockResolvedValue({ error: { message: 'network down' } });
    render(<SignInPanel next="/" configured={['google']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('marks an unconfigured provider unavailable, described, reachable by keyboard, and inert', () => {
    render(<SignInPanel next="/" configured={['google']} />);

    const discordButton = screen.getByRole('button', { name: 'Continue with Discord' });

    expect(discordButton).toHaveAttribute('aria-disabled', 'true');
    expect(discordButton).toHaveAccessibleDescription(/\S/);
    // Still in the tab order — `disabled` would remove it, `aria-disabled` doesn't.
    expect(discordButton).not.toHaveAttribute('disabled');

    fireEvent.click(discordButton);
    expect(socialMock).not.toHaveBeenCalled();
  });

  // The cookie is readable, so anything can write it; a value naming no
  // provider in the roster must not mark a button or break the page.
  it("marks the last-used provider in its button's accessible name, only that one, and only one the roster names", () => {
    setLastUsed('discord');
    const roster = ['google', 'discord', 'facebook', 'microsoft'] as const;
    const { unmount } = render(<SignInPanel next="/coven" configured={[...roster]} />);

    const marked = screen.getByRole('button', { name: 'Continue with Discord, last used' });
    for (const name of ['Google', 'Facebook', 'Microsoft']) {
      expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeInTheDocument();
    }
    fireEvent.click(marked);
    expect(socialMock).toHaveBeenCalledWith(expect.objectContaining({ provider: 'discord' }));
    unmount();

    for (const cookie of ['github', '']) {
      if (cookie) setLastUsed(cookie);
      else clearLastUsed();
      const { unmount: drop } = render(<SignInPanel next="/" configured={[...roster]} />);
      expect(screen.queryByRole('button', { name: /last used/i })).not.toBeInTheDocument();
      drop();
    }
  });

  // The server has no cookie to read, so its HTML must carry no mark, or a
  // returning visitor's hydration would disagree with it. jsdom has a
  // `document` even here, so it is the server snapshot, not its absence, that
  // keeps the mark out.
  it('server-renders no mark, and hydration adds it without a mismatch', async () => {
    setLastUsed('google');
    const panel = <SignInPanel next="/" configured={['google']} />;
    const html = renderToString(panel);
    expect(html).not.toMatch(/last used/i);

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const onRecoverableError = vi.fn();
    try {
      await act(async () => {
        hydrateRoot(container, panel, { onRecoverableError });
      });

      expect(
        within(container).getByRole('button', { name: 'Continue with Google, last used' }),
      ).toBeInTheDocument();
      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      container.remove();
    }
  });
});
