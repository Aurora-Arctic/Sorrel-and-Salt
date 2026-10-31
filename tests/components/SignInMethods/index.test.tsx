import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import SignInMethods from '@/components/SignInMethods';
import { GENERIC_FAILURE } from '@/lib/graphql-failure';
import { GENERIC_LINK_ERROR, GENERIC_UNLINK_ERROR } from '@/lib/sign-in';
import type { LinkedAccount, ProviderId } from '@/lib/types';

// Mocked wholesale, as in SignInPanel's test: a link assigns
// `window.location.href`, which happy-dom cannot follow, and a sign-out's
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

// Each press awaited inside act: a failure lands in a promise, and its
// callout is placed in another (claude-docs/components/click-feedback.md).
const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

/** Drawn under the page's status region, as the root layout mounts it. */
const renderOnPage = (ui: ReactElement) =>
  render(<StatusRegionProvider>{ui}</StatusRegionProvider>);

/** A failure said in a callout under the control, the focus left on it. */
async function expectCalloutUnder(control: HTMLElement, sentence: string) {
  expect(await screen.findByRole('alert')).toHaveTextContent(sentence);
  expect(control).toHaveFocus();
  expect(control).not.toHaveAttribute('aria-busy');
  expect(control).toHaveAccessibleDescription(expect.stringContaining(sentence));
}

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
    render(<SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    // A linked row is the one without an Add.
    expect(within(row('Discord')).queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument();
    for (const label of ['Google', 'Facebook', 'Microsoft']) {
      expect(within(row(label)).getByRole('button', { name: `Add ${label}` })).toBeInTheDocument();
    }
  });

  it('lists a held password and the passkeys, each linking to its section', () => {
    render(<SignInMethods passwordHeld passkeyCount={2} linked={[DISCORD]} configured={ALL} />);

    expect(within(row('Password')).getByText('Set')).toBeInTheDocument();
    expect(within(row('Password')).getByRole('link', { name: 'Manage Password' })).toHaveAttribute(
      'href',
      '#account-password',
    );
    expect(within(row('Passkeys')).getByText('2 passkeys')).toBeInTheDocument();
    expect(within(row('Passkeys')).getByRole('link', { name: 'Manage Passkeys' })).toHaveAttribute(
      'href',
      '#account-passkeys',
    );
  });

  it('says when no password is set and no passkey is added', () => {
    render(
      <SignInMethods passwordHeld={false} passkeyCount={0} linked={[DISCORD]} configured={ALL} />,
    );

    expect(within(row('Password')).getByText('Not Set')).toBeInTheDocument();
    expect(within(row('Password')).getByRole('link', { name: 'Set Password' })).toBeInTheDocument();
    expect(within(row('Passkeys')).getByText('None Added')).toBeInTheDocument();
  });

  it('starts a link with the provider, landing back on the account page either way', async () => {
    render(<SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />);

    await press(screen.getByRole('button', { name: 'Add Microsoft' }));

    expect(linkSocialMock).toHaveBeenCalledWith({
      provider: 'microsoft',
      callbackURL: '/account',
      errorCallbackURL: '/account?provider=microsoft',
    });
  });

  it("a failed link's error is in its provider's row", () => {
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD]}
        configured={ALL}
        error={{ providerId: 'microsoft', message: GENERIC_LINK_ERROR }}
      />,
    );

    expect(within(row('Microsoft')).getByRole('alert')).toBeVisible();
    expect(within(row('Google')).queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['refuses it before any redirect', () => Promise.resolve({ error: { status: 500 } })],
    ['cannot be reached', () => Promise.reject(new Error('offline'))],
  ])(
    'says the generic link sentence under Add when the link %s, freeing the button with the focus kept',
    async (_how, answer) => {
      linkSocialMock.mockImplementation(answer);
      render(<SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />);
      const add = screen.getByRole('button', { name: 'Add Google' });
      add.focus();

      await press(add);

      await expectCalloutUnder(add, GENERIC_LINK_ERROR);
      expect(within(row('Google')).getByRole('alert')).toBeVisible();
    },
  );

  it('clears a failed link at the next press, and a passed-in error with it', async () => {
    linkSocialMock.mockResolvedValueOnce({ error: { status: 500 } });
    linkSocialMock.mockReturnValueOnce(new Promise(() => {}));
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD]}
        configured={ALL}
        error={{ providerId: 'microsoft', message: GENERIC_LINK_ERROR }}
      />,
    );
    const add = screen.getByRole('button', { name: 'Add Google' });
    add.focus();
    await press(add);
    expect(within(row('Google')).getByRole('alert')).toBeVisible();
    expect(within(row('Microsoft')).queryByRole('alert')).toBeNull();

    await press(add);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Show the error/ })).toBeNull();
    expect(add).not.toHaveAccessibleDescription();
  });

  it('frees a link whose page is restored from the back-forward cache', async () => {
    linkSocialMock.mockResolvedValue({});
    render(<SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Google' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Google' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );

    fireEvent(window, Object.assign(new Event('pageshow'), { persisted: true }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Google' })).not.toHaveAttribute('aria-busy'),
    );
  });

  // aria-disabled rather than disabled keeps it in the tab order, as on /sign-in.
  it('greys out an unconfigured provider, keeping it reachable, and starts nothing', () => {
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD]}
        configured={['discord', 'google']}
      />,
    );

    const button = screen.getByRole('button', { name: 'Add Microsoft' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription(/\S/);

    fireEvent.click(button);
    expect(linkSocialMock).not.toHaveBeenCalled();
  });

  // Greyed rather than gone, so the reason sits under the control it explains.
  it('with one method left, its Remove is greyed and says why', () => {
    unlinkAccountMock.mockResolvedValue({ data: { status: true }, error: null });
    render(<SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />);

    const remove = screen.getByRole('button', { name: 'Remove Discord' });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAccessibleDescription(/\S/);
    fireEvent.click(remove);
    expect(unlinkAccountMock).not.toHaveBeenCalled();
  });

  // Better Auth would refuse every removal from a session older than its
  // `freshAge`, so none is offered; the same two linked offer Remove fresh.
  it('with a stale session and two methods linked, Remove is withheld and Sign In Again is offered', () => {
    const { unmount } = render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2);
    unmount();

    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
        fresh={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In Again' })).toHaveAccessibleDescription(/\S/);
    // Not the last method's reason: neither row is the only one.
    expect(within(row('Discord')).queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('Sign In Again signs out and sends the browser to sign-in with the account page as the return path', async () => {
    signOutMock.mockResolvedValue({ error: null });
    vi.stubGlobal('location', { assign: assignMock });
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
        fresh={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign In Again' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    const target = new URL(assignMock.mock.calls[0][0] as string, 'http://relative.invalid');
    expect(target.pathname).toBe('/sign-in');
    expect(target.searchParams.get('next')).toBe('/account');
  });

  it('Sign In Again stays focused while busy and says a failed sign-out under itself', async () => {
    let fail: (reason: unknown) => void = () => {};
    signOutMock.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
        fresh={false}
      />,
    );
    const again = screen.getByRole('button', { name: 'Sign In Again' });
    again.focus();

    await press(again);

    expect(again).toHaveAttribute('aria-busy', 'true');
    // `aria-disabled`, not `disabled`, which would drop the focus it holds.
    expect(again).toHaveAttribute('aria-disabled', 'true');
    expect(again).toHaveFocus();
    await press(again);
    expect(signOutMock).toHaveBeenCalledTimes(1);

    await act(async () => fail(new Error('offline')));

    expect(again).not.toHaveAttribute('aria-disabled');
    await expectCalloutUnder(again, GENERIC_FAILURE);
  });

  it('offers Remove on each once two are linked, and removes by the account row id', async () => {
    unlinkAccountMock.mockResolvedValue({ data: { status: true }, error: null });
    renderOnPage(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    expect(screen.getByRole('button', { name: 'Remove Discord' })).toBeInTheDocument();
    await press(screen.getByRole('button', { name: 'Remove Microsoft' }));

    expect(unlinkAccountMock).toHaveBeenCalledWith({ accountId: 'a-microsoft' });
    // Said in the page's status region, and seen in the row that turned to Add.
    await waitFor(() => expect(status).not.toBeEmptyDOMElement());
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(within(row('Microsoft')).getByRole('button', { name: 'Add Microsoft' })).toBeVisible();
    // Back to one: the survivor's Remove is greyed.
    expect(screen.getByRole('button', { name: 'Remove Discord' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('marks a removal busy while it is in flight, then frees the list', async () => {
    let finish: (value: unknown) => void = () => {};
    unlinkAccountMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderOnPage(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Remove Microsoft' });
    remove.focus();

    await press(remove);

    expect(remove).toHaveAttribute('aria-busy', 'true');
    // The pressed one keeps the focus, so `aria-disabled`; the others wait, disabled.
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Remove Discord' })).toBeDisabled();
    await press(remove);
    expect(unlinkAccountMock).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { status: true }, error: null }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Microsoft'));
    expect(screen.getByRole('button', { name: 'Add Microsoft' })).not.toHaveAttribute('aria-busy');
  });

  it('maps a refused removal to a sentence of its own and keeps the provider', async () => {
    unlinkAccountMock.mockResolvedValue({
      data: null,
      error: { status: 403, code: 'SESSION_NOT_FRESH' },
    });
    renderOnPage(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Remove Microsoft' });
    remove.focus();

    await press(remove);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/\S/);
    expect(alert).not.toHaveTextContent(GENERIC_UNLINK_ERROR);
    expect(within(row('Microsoft')).getByRole('alert')).toBe(alert);
    await expectCalloutUnder(remove, alert.textContent ?? '');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('falls back to the generic removal sentence for a refusal with no known code', async () => {
    unlinkAccountMock.mockResolvedValue({ data: null, error: { status: 500 } });
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );

    await press(screen.getByRole('button', { name: 'Remove Discord' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_UNLINK_ERROR));
  });

  it('says the generic removal sentence when the removal cannot be reached, and clears it at the next press', async () => {
    unlinkAccountMock.mockRejectedValueOnce(new Error('offline'));
    unlinkAccountMock.mockReturnValueOnce(new Promise(() => {}));
    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD, MICROSOFT]}
        configured={ALL}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Remove Discord' });
    remove.focus();

    await press(remove);
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_UNLINK_ERROR);
    expect(remove).toHaveFocus();

    await press(remove);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Show the error/ })).toBeNull();
  });

  it('shows a passed-in callback error as an alert, and none without one', () => {
    const { unmount } = render(
      <SignInMethods passwordHeld passkeyCount={0} linked={[DISCORD]} configured={ALL} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    render(
      <SignInMethods
        passwordHeld
        passkeyCount={0}
        linked={[DISCORD]}
        configured={ALL}
        error={{ message: 'That expired. Start again here.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('That expired. Start again here.');
  });
});
