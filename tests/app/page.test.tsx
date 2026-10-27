import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// `/` offers a signed-in visitor the landing for their role and a signed-out
// one the sign-in page (claude-docs/components/welcome.md). What the session
// is, is tests/lib/request-session.test.ts's, and which landing a role gets
// tests/lib/sign-in.test.ts's; here the session and the viewer's first coven
// are mocked.

const getSession = vi.fn<() => Promise<Session | null>>();
const sessionIsVerified = vi.fn<() => Promise<boolean>>();
vi.mock('@/lib/request-session', () => ({ getSession, sessionIsVerified }));

const firstCovenSlugOf = vi.fn<() => Promise<string | undefined>>();
vi.mock('@/modules/coven', () => ({ firstCovenSlugOf }));

const { default: HomePage, metadata } = await import('@/app/page');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

beforeEach(() => {
  getSession.mockReset();
  sessionIsVerified.mockReset();
  sessionIsVerified.mockResolvedValue(true);
  firstCovenSlugOf.mockReset();
  firstCovenSlugOf.mockResolvedValue(undefined);
});

describe('the / page metadata', () => {
  const scripts = () => document.querySelectorAll('script[type="application/ld+json"]');

  it('names the site alone, untemplated, with the bare origin as canonical', () => {
    expect(metadata.title).toEqual({ absolute: 'Sorrel & Salt' });
    expect(metadata.alternates?.canonical).toBe('https://sorrelandsalt.com/');
    expect(metadata.description).toBeTruthy();
  });

  it('marks a signed-out visitor’s page up as the website', async () => {
    getSession.mockResolvedValue(null);
    render(await HomePage());
    expect(JSON.parse(scripts()[0].textContent ?? '{}')).toMatchObject({
      '@type': 'WebSite',
      name: 'Sorrel & Salt',
      url: 'https://sorrelandsalt.com/',
    });
  });

  it('adds no markup for a signed-in visitor', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'admin' });
    render(await HomePage());
    expect(scripts()).toHaveLength(0);
  });
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

  // Into the coven itself, never via the /coven landing's redirect (MB.257).
  it('continues a signed-in member straight into their first coven', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'user' });
    firstCovenSlugOf.mockResolvedValue('fixture-coven');

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven',
    );
  });

  it('continues someone in no coven to the /coven landing', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'user' });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven');
  });

  // An unverified account is sent to the email page by every protected page, so
  // Continue goes there directly, carrying the landing to go on to once verified.
  it('continues an unverified account to the email page, carrying its landing', async () => {
    getSession.mockResolvedValue({ userId: USER_ID, role: 'user' });
    sessionIsVerified.mockResolvedValue(false);

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute(
      'href',
      '/account/email?next=%2Fcoven',
    );
  });
});
