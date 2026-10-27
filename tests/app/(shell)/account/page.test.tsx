import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { Session } from '@/lib/session';

// The one account page (MB.88): the Name, Email, Sign-In Methods and
// Invitations (M10.32) sections,
// each linked from the page's own nav (claude-docs/auth/admin-bootstrap.md,
// "The account page"). The session, the row and the linked accounts are mocked;
// what they are is tests/lib/request-session.test.ts's and the identity
// service's. That an unverified account never reaches the page is
// `requireSession()`'s, asserted there and in tests/e2e/account.spec.ts.

const requireSession = vi.fn<() => Promise<Session>>();
const linkedAccounts = vi.fn(async () => [{ id: 'a1', providerId: 'discord', accountId: 'd-1' }]);
const sessionIsFresh = vi.fn(async () => true);
vi.mock('@/lib/request-session', () => ({ requireSession, linkedAccounts, sessionIsFresh }));
vi.mock('@/modules/coven', () => ({ firstCovenSlugOf: async () => undefined }));
vi.mock('@/lib/social-providers-config', () => ({ configuredProviders: () => [] }));
// Accept reads the router, which a page test has no app to give.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const getMe = vi.fn();
const listReceivedInvitations = vi.fn();
const countReceivedInvitations = vi.fn();
vi.mock('@/modules/identity', () => ({
  getMe,
  listReceivedInvitations,
  countReceivedInvitations,
  isPlaceholderEmail: (email: string) => email.endsWith('@pending.invalid'),
  verificationWaitSeconds: () => 0,
}));

const { default: AccountPage } = await import('@/app/(shell)/account/page');

const SESSION = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' } as const;

const invitation = (index: number) => ({
  cursor: { key: [String(index)], id: `i-${index}` },
  node: {
    id: `i-${index}`,
    covenName: `Fixture Coven ${index}`,
    covenSlug: `fixture-coven-${index}`,
    role: 'member',
    inviterName: null,
    expiresAt: new Date('2026-10-19T00:00:00Z'),
    note: null,
  },
});

async function renderPage(email = 'ada@example.test', searchParams: Record<string, string> = {}) {
  requireSession.mockResolvedValue(SESSION);
  getMe.mockResolvedValue({
    name: 'Ada Fixture',
    email,
    emailVerified: true,
    verificationSentAt: null,
  });
  const page = await AccountPage({ searchParams: Promise.resolve(searchParams) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
  listReceivedInvitations.mockReset().mockResolvedValue([]);
  countReceivedInvitations.mockReset().mockResolvedValue({ totalCount: 0, countBefore: null });
});

describe('the /account page', () => {
  it('links each section from its nav', async () => {
    await renderPage();

    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(4);
    // Each link lands on the section headed by its own words.
    for (const link of links) {
      const target = document.getElementById(link.getAttribute('href')?.slice(1) ?? '');
      expect(target?.tagName).toBe('SECTION');
      expect(within(target as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
        link.textContent ?? '',
      );
    }
  });

  it('prefills the name and the address in their sections', async () => {
    await renderPage();

    expect(within(section('Name')).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Ada Fixture',
    );
    expect(within(section('Email')).getByRole('textbox', { name: 'Email Address' })).toHaveValue(
      'ada@example.test',
    );
  });

  it('never shows a placeholder address', async () => {
    await renderPage('discord-1@pending.invalid');

    expect(within(section('Email')).getByRole('textbox', { name: 'Email Address' })).toHaveValue(
      '',
    );
  });

  // The rows and their Accept are ReceivedInvitations' own tests'; the page reads them.
  it('reads the invitations waiting for the session’s address', async () => {
    listReceivedInvitations.mockResolvedValue([invitation(0), invitation(1)]);
    countReceivedInvitations.mockResolvedValue({ totalCount: 2, countBefore: 0 });

    await renderPage();

    expect(listReceivedInvitations).toHaveBeenCalledWith(SESSION, expect.anything());
  });

  it('pages the invitations by the cursor in the address, keeping the pager at the section', async () => {
    // One more than a page, so the page has a next.
    listReceivedInvitations.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) => invitation(index)),
    );
    countReceivedInvitations.mockResolvedValue({ totalCount: 60, countBefore: 25 });
    const after = encodeCursor({ key: ['0'], id: 'i-0' });

    await renderPage(undefined, { after });

    const next = within(section('Invitations'))
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .find((href) => href.includes('after='));
    expect(next).toMatch(/^\/account\?after=[^#]+#account-invitations$/);
    // The request began after the cursor the address carried.
    expect(listReceivedInvitations.mock.calls[0][1].after).toEqual({ key: ['0'], id: 'i-0' });
  });
});
