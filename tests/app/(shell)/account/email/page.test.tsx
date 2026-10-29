import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// Where the email page's Continue goes once a followed link has proved the address: the `next` the account was sent with, or with none, the landing for the role it holds now,
// a primary admin promoted by that very link included (claude-docs/auth/admin-bootstrap.md, "The email page"). The session and row are mocked (tests/lib/request-session.test.ts's and the identity service's);
// which landing a role gets and which `next` is safe are tests/lib/sign-in.test.ts's.

const requireSession = vi.fn<() => Promise<Session>>();
vi.mock('@/lib/request-session', () => ({ requireSession }));

const firstCovenSlugOf = vi.fn<() => Promise<string | undefined>>();
vi.mock('@/modules/coven', () => ({ firstCovenSlugOf }));

const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({
  getMe,
  isPlaceholderEmail: () => false,
  verificationWaitSeconds: () => 0,
}));

const { default: EmailPage } = await import('@/app/(shell)/account/email/page');

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
  firstCovenSlugOf.mockReset();
  firstCovenSlugOf.mockResolvedValue(undefined);
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

  // Why the one above could have gone elsewhere: the request's `next`.
  it('continues an admin to the next it was sent with, /coven included', async () => {
    await renderPage('admin', { verified: '', next: '/coven' });

    expect(continueLink()).toHaveAttribute('href', '/coven');
  });

  // Into the coven itself, never via the /coven landing's redirect.
  it("continues a member's confirmed address straight into their first coven", async () => {
    firstCovenSlugOf.mockResolvedValue('fixture-coven');
    await renderPage('user', { verified: '' });

    expect(continueLink()).toHaveAttribute('href', '/coven/fixture-coven');
  });

  // Its own way across, offered to a verified account.
  it('links a verified account to the account page', async () => {
    await renderPage('user', {});

    expect(screen.getByRole('link', { name: 'Continue to Account' })).toHaveAttribute(
      'href',
      '/account',
    );
  });
});
