import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SignInPanel from '@/components/SignInPanel';

// Better Auth's client performs the OAuth hop by assigning
// `window.location.href` (tests/lib/auth-client.test.ts) — jsdom can't
// follow that, so the module is mocked wholesale here rather than stubbing
// fetch, which is how auth-client.test.ts exercises the real thing.
const socialMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  signIn: { social: (...args: unknown[]) => socialMock(...args) },
}));

describe('SignInPanel', () => {
  afterEach(() => {
    socialMock.mockReset();
  });

  it('offers every roster provider as an accessible, native button', () => {
    render(<SignInPanel next="/" configured={['google', 'discord', 'facebook', 'microsoft']} />);

    for (const name of ['Google', 'Discord', 'Facebook', 'Microsoft']) {
      const button = screen.getByRole('button', { name: `Continue with ${name}` });
      expect(button.tagName).toBe('BUTTON');
    }
  });

  it('calls signIn.social with the provider, the destination and an error callback carrying it', () => {
    render(<SignInPanel next="/coven/hearth" configured={['google']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(socialMock).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });
  });

  it('renders no alert when there is no error', () => {
    render(<SignInPanel next="/" configured={['google']} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a passed-in error as an alert', () => {
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

  it('marks an unconfigured provider unavailable, described by a note, and reachable by keyboard', () => {
    render(<SignInPanel next="/" configured={['google']} />);

    const discordButton = screen.getByRole('button', { name: 'Continue with Discord' });

    expect(discordButton).toHaveAttribute('aria-disabled', 'true');
    const describedBy = discordButton.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(/not available/i);
    // Still in the tab order — `disabled` would remove it, `aria-disabled` doesn't.
    expect(discordButton).not.toHaveAttribute('disabled');
  });

  it('does not call signIn.social when an unavailable provider is clicked', () => {
    render(<SignInPanel next="/" configured={['google']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Discord' }));

    expect(socialMock).not.toHaveBeenCalled();
  });
});
