import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignOutButton from '@/components/SignOutButton';

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which jsdom cannot follow.
const signOutMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({ signOut: () => signOutMock() }));
const assignMock = vi.fn();

describe('SignOutButton', () => {
  afterEach(() => {
    signOutMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('signs out, busy meanwhile, and opens / as a full load', async () => {
    let finish: (value: { error: null }) => void = () => {};
    signOutMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    vi.stubGlobal('location', { assign: assignMock });
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    const busy = screen.getByRole('button', { name: 'Signing Out' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    finish({ error: null });
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['refuses', () => Promise.resolve({ error: { status: 500 } })],
    ['cannot be reached', () => Promise.reject(new Error('offline'))],
  ])('says so beside it when the endpoint %s, and offers it again', async (_how, answer) => {
    signOutMock.mockImplementation(answer);
    vi.stubGlobal('location', { assign: assignMock });
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That didn't work. Please try again.",
    );
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeEnabled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
