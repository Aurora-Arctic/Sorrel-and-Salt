import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';
import {
  GENERIC_SIGN_IN_ERROR,
  LAST_USED_PROVIDER_COOKIE,
  signInErrorMessage,
} from '@/lib/sign-in';

// Better Auth's client performs the OAuth hop by assigning `window.location.href` (tests/lib/auth-client.test.ts), which happy-dom cannot follow, so `signIn` is mocked here rather than stubbing fetch.
// The rest of the module is the real one, so the last-used mark reads happy-dom's own `document.cookie`.
const socialMock = vi.fn();
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  signIn: { social: (...args: unknown[]) => socialMock(...args) },
}));

// Each press awaited inside act: the refusal lands in a promise, and the
// callout is placed in another (claude-docs/components/click-feedback.md).
const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

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

  it('offers every roster provider, and calls signIn.social with the provider, the destination and an error callback carrying it', async () => {
    render(
      <SignInPanel
        next="/coven/hearth"
        configured={['google', 'discord', 'facebook', 'microsoft']}
      />,
    );

    for (const name of ['Discord', 'Facebook', 'Microsoft']) {
      expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeEnabled();
    }
    await press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });
  });

  // With no return path the callback lands the account by role, so the
  // sign-in says it asked for none rather than naming the /coven landing.
  it('flags a sign-in with no return path, keeping a failed one without one, and sends an explicit /coven unflagged', async () => {
    const { unmount } = render(<SignInPanel configured={['google']} />);

    await press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenLastCalledWith({
      provider: 'google',
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in',
      additionalData: { noReturnPath: true },
    });
    unmount();

    render(<SignInPanel next="/coven" configured={['google']} />);
    await press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenLastCalledWith({
      provider: 'google',
      callbackURL: '/coven',
      errorCallbackURL: '/sign-in?next=%2Fcoven',
    });
  });

  it('marks the pressed provider busy, keeping the focus on it, and disables the others while the hop is under way', async () => {
    socialMock.mockReturnValue(new Promise(() => {}));
    render(<SignInPanel configured={['google', 'discord']} />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    google.focus();

    await press(google);

    expect(google).toHaveAttribute('aria-busy', 'true');
    // `aria-disabled`, not `disabled`, which would drop the focus it holds.
    expect(google).toHaveAttribute('aria-disabled', 'true');
    expect(google).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Continue with Discord' })).toBeDisabled();
    await press(google);
    expect(socialMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['answers an error', () => Promise.resolve({ error: { message: 'network down' } })],
    ['cannot be reached', () => Promise.reject(new Error('offline'))],
  ])(
    'says so in an alert under the pressed provider when the sign-in %s, keeps the focus there, frees every provider',
    async (_how, answer) => {
      socialMock.mockImplementation(answer);
      render(<SignInPanel next="/" configured={['google', 'discord']} />);
      const google = screen.getByRole('button', { name: 'Continue with Google' });
      expect(google).not.toHaveAccessibleDescription();
      google.focus();

      await press(google);

      expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_SIGN_IN_ERROR);
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(google).toHaveFocus();
      expect(google).toHaveAccessibleName('Continue with Google');
      expect(google).not.toHaveAttribute('aria-busy');
      expect(google).not.toHaveAttribute('aria-disabled');
      expect(google).toHaveAccessibleDescription(expect.stringContaining(GENERIC_SIGN_IN_ERROR));
      expect(screen.getByRole('button', { name: 'Continue with Discord' })).toBeEnabled();
    },
  );

  it('names the badge without the last-used mark, which the button’s name carries', async () => {
    setLastUsed('google');
    socialMock.mockResolvedValue({ error: { message: 'x' } });
    render(<SignInPanel next="/" configured={['google']} />);

    await press(screen.getByRole('button', { name: 'Continue with Google, last used' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Show the error for Continue with Google' }),
    ).toBeInTheDocument();
  });

  it('clears a failure at the next press, and signs in on it', async () => {
    socialMock.mockRejectedValueOnce(new Error('offline'));
    socialMock.mockReturnValueOnce(new Promise(() => {}));
    render(<SignInPanel next="/" configured={['google']} />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    await press(google);
    expect(await screen.findByRole('alert')).toBeVisible();

    await press(google);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Show the error/ })).toBeNull();
    expect(socialMock).toHaveBeenCalledTimes(2);
  });

  it('shows a passed-in error as an alert, and none without one', () => {
    const { unmount } = render(<SignInPanel next="/" configured={['google']} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    const error = signInErrorMessage('access_denied')!;
    render(<SignInPanel next="/" error={error} configured={['google']} />);

    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  // The callback's error is the page's, from the server; a press is a new
  // attempt, so it goes, and a failure of that press is said under its button.
  it('clears a passed-in error at a press, and says that press’s failure under its button alone', async () => {
    socialMock.mockResolvedValue({ error: { message: 'x' } });
    const error = signInErrorMessage('access_denied')!;
    render(<SignInPanel next="/" error={error} configured={['google']} />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });

    await press(google);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(GENERIC_SIGN_IN_ERROR);
    expect(alert).not.toHaveTextContent(error);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('marks an unconfigured provider unavailable, described, reachable by keyboard, and inert', async () => {
    render(<SignInPanel next="/" configured={['google']} />);

    const discordButton = screen.getByRole('button', { name: 'Continue with Discord' });

    expect(discordButton).toHaveAttribute('aria-disabled', 'true');
    expect(discordButton).toHaveAccessibleDescription(/\S/);
    // Still in the tab order — `disabled` would remove it, `aria-disabled` doesn't.
    expect(discordButton).not.toHaveAttribute('disabled');

    await press(discordButton);
    expect(socialMock).not.toHaveBeenCalled();
  });

  // The cookie is readable, so anything can write it; a value naming no
  // provider in the roster must not mark a button or break the page.
  it("marks the last-used provider in its button's accessible name, only that one, and only one the roster names", async () => {
    setLastUsed('discord');
    const roster = ['google', 'discord', 'facebook', 'microsoft'] as const;
    const { unmount } = render(<SignInPanel next="/coven" configured={[...roster]} />);

    const marked = screen.getByRole('button', { name: 'Continue with Discord, last used' });
    for (const name of ['Google', 'Facebook', 'Microsoft']) {
      expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeInTheDocument();
    }
    await press(marked);
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

  // The server has no cookie to read, so its HTML must carry no mark, or a returning visitor's hydration would disagree with it.
  // happy-dom has a `document` even here, so it is the server snapshot, not its absence, that keeps the mark out.
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
