import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// `/` offers a signed-in visitor the landing for their role — the admin area
// for an admin, /coven for anyone else — and a signed-out one the sign-in
// page (claude-docs/components/welcome.md). What the session is, is
// tests/lib/request-session.test.ts's; here it is mocked.

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock('@/lib/request-session', () => ({ getSession }));

const { default: HomePage } = await import('@/app/page');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

beforeEach(() => {
  getSession.mockReset();
});

describe('the / page', () => {
  it('offers a signed-out visitor the sign-in page', async () => {
    getSession.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
  });

  it('continues a signed-in admin to the admin area', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'admin' });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/admin');
  });

  // Why the admin's could have been /coven: the same session but for its role.
  it('continues anyone else to the /coven landing', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'user' });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven');
  });
});
