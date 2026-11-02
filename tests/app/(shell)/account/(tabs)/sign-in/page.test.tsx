import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// The Sign-In tab of the account: the Sign-In Methods, Password, Two-Factor Sign-In and Passkeys sections, each linked from the page's own nav (claude-docs/auth/admin-bootstrap.md, "The account page").
// The session, linked accounts and passkeys are mocked (tests/lib/request-session.test.ts's and the identity service's); that an unverified account never reaches the page is `requireSession()`'s, asserted there and in tests/e2e/account.spec.ts.

const requireSession = vi.fn<() => Promise<Session>>();
const linkedAccounts = vi.fn(async () => [{ id: 'a1', providerId: 'discord', accountId: 'd-1' }]);
const sessionIsFresh = vi.fn(async () => true);
const hasPassword = vi.fn(async () => true);
const accountPasskeys = vi.fn(async () => [
  { id: 'pk-1', name: 'Fixture Laptop', createdAt: '2026-10-01T09:00:00.000Z' },
]);
vi.mock('@/lib/request-session', () => ({
  requireSession,
  linkedAccounts,
  sessionIsFresh,
  hasPassword,
  accountPasskeys,
}));
// The password and two-factor forms read the session's address from the client, which a page test has no server to answer.
vi.mock('@/lib/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-client')>()),
  useSession: () => ({ data: null }),
}));
vi.mock('@/lib/social-providers-config', () => ({ configuredProviders: () => [] }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({ getMe }));

const { default: SignInPage } = await import('@/app/(shell)/account/(tabs)/sign-in/page');

const SESSION = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' } as const;

async function renderPage(searchParams: Record<string, string> = {}) {
  requireSession.mockResolvedValue(SESSION);
  getMe.mockResolvedValue({
    name: 'Ada Fixture',
    email: 'ada@example.test',
    twoFactorEnabled: false,
  });
  const page = await SignInPage({ searchParams: Promise.resolve(searchParams) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
});

describe('the /account/sign-in page', () => {
  it('links each section from its nav, and each link lands on the section it names', async () => {
    await renderPage();

    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Sign-In Methods',
      'Password',
      'Two-Factor Sign-In',
      'Passkeys',
    ]);
    for (const link of links) {
      const target = document.getElementById(link.getAttribute('href')?.slice(1) ?? '');
      expect(target?.tagName).toBe('SECTION');
      expect(within(target as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
        link.textContent ?? '',
      );
    }
  });

  it("lists the session's passkeys in their section", async () => {
    await renderPage();

    const passkeys = within(section('Passkeys')).getByRole('list', { name: 'Passkeys' });
    expect(within(passkeys).getAllByRole('listitem')).toHaveLength(1);
    expect(within(passkeys).getByRole('button', { name: 'Remove Fixture Laptop' })).toBeEnabled();
  });

  it('makes Two-Factor Sign-In a section of its own, not a heading inside Password', async () => {
    await renderPage();

    expect(
      within(section('Two-Factor Sign-In')).getByRole('button', { name: 'Turn On Two-Factor' }),
    ).toBeVisible();
    expect(within(section('Password')).queryByText('Two-Factor Sign-In')).toBeNull();
    expect(within(section('Password')).queryByRole('button', { name: /Two-Factor/ })).toBeNull();
  });

  it('offers no way to turn two-factor on to an account with no password', async () => {
    hasPassword.mockResolvedValueOnce(false);

    await renderPage();

    expect(
      within(section('Two-Factor Sign-In')).queryByRole('button', { name: /Two-Factor/ }),
    ).toBeNull();
    expect(
      within(section('Two-Factor Sign-In')).getByRole('link', { name: 'Set a Password' }),
    ).toBeVisible();
  });

  it('lists the password and the passkeys among the sign-in methods, each linking to its section', async () => {
    await renderPage();

    const methods = within(section('Sign-In Methods'));
    expect(methods.getByRole('link', { name: 'Manage Password' })).toHaveAttribute(
      'href',
      '/account/sign-in#password',
    );
    expect(methods.getByRole('link', { name: 'Manage Passkeys' })).toHaveAttribute(
      'href',
      '/account/sign-in#passkeys',
    );
  });

  // What each form does is PasswordSection's own tests'; the page picks the form by whether a password is held.
  it('asks an account with a password for its current one, to change it', async () => {
    hasPassword.mockResolvedValueOnce(true);

    await renderPage();

    expect(within(section('Password')).getByLabelText(/^Current Password/)).toBeVisible();
    expect(
      within(section('Password')).getByRole('button', { name: 'Change Password' }),
    ).toBeVisible();
  });

  it('lets an account with providers alone set a first password without a current one', async () => {
    hasPassword.mockResolvedValueOnce(false);

    await renderPage();

    expect(within(section('Password')).queryByLabelText(/^Current Password/)).toBeNull();
    expect(within(section('Password')).getByRole('button', { name: 'Set Password' })).toBeVisible();
  });
});
