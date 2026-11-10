import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignOutButton from '@/components/AccountMenu/sign-out-button';
import { GENERIC_FAILURE } from '@/lib/graphql-failure';
import { leavingAtEachLoad } from '../../support/location';

// Mocked wholesale: a real call reaches /api/auth and navigates, which happy-dom cannot follow.
const signOutMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({ signOut: () => signOutMock() }));
const assignMock = vi.fn();

// Each press awaited inside act: the refusal and the callout land in separate promises (claude-docs/components/click-feedback.md).
const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

describe('SignOutButton', () => {
  afterEach(() => {
    signOutMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('signs out once, busy meanwhile with the focus kept, and opens / as a full load', async () => {
    let finish: (value: { error: null }) => void = () => {};
    signOutMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    vi.stubGlobal('location', { assign: assignMock, pathname: '/coven/alpha', search: '' });
    render(<SignOutButton />);

    const busy = screen.getByRole('button', { name: 'Sign Out' });
    busy.focus();
    fireEvent.click(busy);

    expect(busy).toHaveAttribute('aria-busy', 'true');
    // `aria-disabled`, not `disabled`, which would drop the focus it holds.
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    expect(busy).toHaveFocus();
    fireEvent.click(busy);
    finish({ error: null });
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['refuses', () => Promise.resolve({ error: { status: 500 } })],
    ['cannot be reached', () => Promise.reject(new Error('offline'))],
  ])(
    'says so in an alert under it when the endpoint %s, keeps the focus on it, and its badge brings the alert back',
    async (_how, answer) => {
      signOutMock.mockImplementation(answer);
      vi.stubGlobal('location', { assign: assignMock, pathname: '/coven/alpha', search: '' });
      render(<SignOutButton />);
      const button = screen.getByRole('button', { name: 'Sign Out' });
      expect(button).not.toHaveAccessibleDescription();

      button.focus();
      await press(button);

      expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_FAILURE);
      expect(button).toHaveFocus();
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).toHaveAccessibleDescription(new RegExp(GENERIC_FAILURE));
      expect(assignMock).not.toHaveBeenCalled();
    },
  );

  it('clears the failure at the next press, and signs out on it', async () => {
    signOutMock.mockRejectedValueOnce(new Error('offline'));
    signOutMock.mockReturnValueOnce(new Promise(() => {}));
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: 'Sign Out' });
    button.focus();
    await press(button);
    expect(await screen.findByRole('alert')).toBeVisible();

    await press(button);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Show the error/ })).toBeNull();
    expect(button).not.toHaveAccessibleDescription();
    expect(signOutMock).toHaveBeenCalledTimes(2);
  });

  // The bar and the busy hint stay up through a full page load only when the page reports it is leaving first.
  it('reports the page is leaving before it opens /', async () => {
    const leaving = leavingAtEachLoad(assignMock);
    signOutMock.mockResolvedValue({ error: null });
    vi.stubGlobal('location', { assign: assignMock, pathname: '/coven/alpha', search: '' });
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(leaving).toEqual([true]);
  });
});

describe('SignOutButton destination', () => {
  afterEach(() => {
    signOutMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it.each([
    ['/compendium', '', '/compendium'],
    ['/compendium/some-entry', '?x=1', '/compendium/some-entry?x=1'],
    ['/coven/alpha', '', '/'],
  ])('on %s%s loads %s', async (pathname, search, expected) => {
    signOutMock.mockResolvedValue({ error: null });
    vi.stubGlobal('location', { assign: assignMock, pathname, search });
    render(<SignOutButton />);
    await press(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith(expected));
  });
});
