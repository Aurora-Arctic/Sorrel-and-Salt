import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// /sign-in sends an already signed-in visitor on, by `?next=` or the role's landing, the way a sign-in itself does.
// The session and landing are mocked; `redirect` throws as Next's does, so the page stops at it.

const getSession = vi.fn<() => Promise<Session | null>>();
const sessionIsVerified = vi.fn<() => Promise<boolean>>();
vi.mock('@/lib/request-session', () => ({ getSession, sessionIsVerified }));

const signedInLanding = vi.fn<() => Promise<string>>();
vi.mock('@/lib/landing', () => ({ signedInLanding }));

class Redirected extends Error {}
const redirect = vi.fn((to: string) => {
  throw new Redirected(to);
});
vi.mock('next/navigation', () => ({ redirect }));

vi.mock('@/lib/social-providers-config', () => ({ configuredProviders: () => [] }));
vi.mock('@/components/SignInPanel', () => ({ default: () => null }));

const { default: SignInPage } = await import('@/app/sign-in/page');

const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';
const SIGNED_IN: Session = { userId: USER_ID, role: 'user' };

const visit = async (next?: string | string[]) => {
  try {
    render(await SignInPage({ searchParams: Promise.resolve(next === undefined ? {} : { next }) }));
    return undefined;
  } catch (error) {
    if (error instanceof Redirected) return error.message;
    throw error;
  }
};

beforeEach(() => {
  getSession.mockReset();
  sessionIsVerified.mockReset();
  sessionIsVerified.mockResolvedValue(true);
  signedInLanding.mockReset();
  signedInLanding.mockResolvedValue('/coven/fixture-coven');
  redirect.mockClear();
});

describe('the sign-in page for a signed-in visitor', () => {
  it('sends them to ?next= when it is a same-site path', async () => {
    getSession.mockResolvedValue(SIGNED_IN);
    expect(await visit('/coven/fixture-coven/grimoire')).toBe('/coven/fixture-coven/grimoire');
  });

  it('sends them to their landing when there is no ?next=', async () => {
    getSession.mockResolvedValue(SIGNED_IN);
    expect(await visit()).toBe('/coven/fixture-coven');
  });

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example'])(
    'never follows %s off the site, and uses the landing',
    async (next) => {
      getSession.mockResolvedValue(SIGNED_IN);
      expect(await visit(next)).toBe('/coven/fixture-coven');
    },
  );

  it('sends an unverified account to the email page, carrying where it was going', async () => {
    getSession.mockResolvedValue(SIGNED_IN);
    sessionIsVerified.mockResolvedValue(false);
    const to = await visit('/coven/fixture-coven/grimoire');
    expect(to).toMatch(/^\/account\/email/);
    expect(decodeURIComponent(to ?? '')).toContain('/coven/fixture-coven/grimoire');
  });
});

describe('the sign-in page for a signed-out visitor', () => {
  it('draws the page and redirects nowhere', async () => {
    getSession.mockResolvedValue(null);
    expect(await visit('/coven/fixture-coven')).toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
