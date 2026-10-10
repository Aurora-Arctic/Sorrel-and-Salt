import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// The one account page (MB.88): "Your Account", then the Name, Email and
// Sign-In Methods sections, and no way across to the email page, whose flows
// are not a visit to the account (claude-docs/auth/admin-bootstrap.md, "The
// account page"). The session, the row and the linked accounts are mocked;
// what they are is tests/lib/request-session.test.ts's and the identity
// service's. That an unverified account never reaches the page is
// `requireSession()`'s, asserted there and in tests/e2e/account.spec.ts.

const requireSession = vi.fn<() => Promise<Session>>();
const linkedAccounts = vi.fn(async () => [{ id: 'a1', providerId: 'discord', accountId: 'd-1' }]);
vi.mock('@/lib/request-session', () => ({ requireSession, linkedAccounts }));
vi.mock('@/lib/social-providers-config', () => ({ configuredProviders: () => [] }));

const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({
  getMe,
  isPlaceholderEmail: (email: string) => email.endsWith('@pending.invalid'),
  verificationWaitSeconds: () => 0,
}));

const { default: AccountPage } = await import('@/app/account/page');

async function renderPage(email = 'ada@example.test') {
  requireSession.mockResolvedValue({
    userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f',
    role: 'user',
  });
  getMe.mockResolvedValue({
    name: 'Ada Fixture',
    email,
    emailVerified: true,
    verificationSentAt: null,
  });
  const page = await AccountPage({ searchParams: Promise.resolve({}) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
});

describe('the /account page', () => {
  it('is headed "Your Account", with Name, Email and Sign-In Methods beneath it', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Your Account' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Name', 'Email', 'Sign-In Methods']);
  });

  it('leads with a nav to each section, in order, and rules a line between them', async () => {
    await renderPage();

    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Name', 'Email', 'Sign-In Methods']);
    // Each link lands on the section headed by its own words.
    for (const link of links) {
      const target = document.getElementById(link.getAttribute('href')?.slice(1) ?? '');
      expect(target?.tagName).toBe('SECTION');
      expect(within(target as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
        link.textContent ?? '',
      );
    }
    // A rule between each pair of sections, none before the first or after the last.
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('prefills the name and the address in their sections', async () => {
    await renderPage();

    expect(within(section('Name')).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Ada Fixture',
    );
    expect(within(section('Email')).getByRole('textbox', { name: 'Email address' })).toHaveValue(
      'ada@example.test',
    );
  });

  it('never shows a placeholder address', async () => {
    await renderPage('discord-1@pending.invalid');

    expect(within(section('Email')).getByRole('textbox', { name: 'Email address' })).toHaveValue(
      '',
    );
  });

  it('carries no link to the email page', async () => {
    await renderPage();

    const links = screen.queryAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).not.toContain('/account/email');
  });
});
