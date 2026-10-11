import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// `/` offers a signed-in visitor the landing for their role and a signed-out
// one the sign-in page (claude-docs/components/welcome.md). What the session
// is, is tests/lib/request-session.test.ts's, and which landing a role gets
// tests/lib/sign-in.test.ts's; here the session is mocked.

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
});
