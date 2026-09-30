import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// Where the email page's Continue goes once a followed link has proved the
// address: the `next` the account was sent with, or with none, the landing
// for the role it holds now — a primary admin promoted by that very link
// included (claude-docs/auth.md, "The email page"). The session and the row
// are mocked; what they are is tests/lib/request-session.test.ts's and the
// identity service's.

const requireSession = vi.fn<() => Promise<Session>>();
vi.mock('@/lib/request-session', () => ({ requireSession }));

const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({
  getMe,
  isPlaceholderEmail: () => false,
  verificationWaitSeconds: () => 0,
}));

const { default: EmailPage } = await import('@/app/account/email/page');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

async function renderPage(role: Session['role'], params: Record<string, string>) {
  requireSession.mockResolvedValue({ userId: USER_ID, role });
  const page = await EmailPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const continueLink = () => screen.getByRole('link', { name: 'Continue' });

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
  getMe.mockResolvedValue({
    email: 'ada@example.test',
    emailVerified: true,
    verificationSentAt: null,
  });
});

describe('the /account/email page', () => {
  it("continues an admin's confirmed address to the admin area when it was going nowhere else", async () => {
    await renderPage('admin', { verified: '' });

    expect(continueLink()).toHaveAttribute('href', '/admin');
  });

  it('continues anyone else to the /coven landing', async () => {
    await renderPage('user', { verified: '' });

    expect(continueLink()).toHaveAttribute('href', '/coven');
  });

  // Why the two above could differ: the role, and nothing in the request.
  it('continues an admin to the next it was sent with, /coven included', async () => {
    await renderPage('admin', { verified: '', next: '/coven' });

    expect(continueLink()).toHaveAttribute('href', '/coven');
  });

  it('reads a next that leaves the site as none', async () => {
    await renderPage('admin', { verified: '', next: '//evil.example' });

    expect(continueLink()).toHaveAttribute('href', '/admin');
  });
});
