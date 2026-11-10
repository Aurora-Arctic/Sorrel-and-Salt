import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { USER_ID } from '../support/constants';

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
const SignInPanel = vi.fn<(props: { ledes?: unknown; mode?: unknown }) => null>(() => null);
vi.mock('@/components/SignInPanel', () => ({ default: SignInPanel }));

const { default: SignInPage, generateMetadata } = await import('@/app/sign-in/page');
const { ADDRESS_LEDES } = await import('@/components/InvitationAcceptance/ledes');
const { newCardToken, newToken, looksLikeCardToken } = await import('@/lib/invitation-token');

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
  SignInPanel.mockClear();
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

// The page decides by the address alone, as the invite page does signed out: no invitation is read, so a lede tells a
// signed-out visitor nothing about whether a token is live.
describe('the sign-in page lede for a signed-out visitor', () => {
  const ledesFor = async (next?: string) => {
    getSession.mockResolvedValue(null);
    expect(await visit(next)).toBeUndefined();
    expect(SignInPanel).toHaveBeenCalledTimes(1);
    return SignInPanel.mock.calls[0]![0].ledes;
  };

  it('passes the address ledes when next is an invitation link sent to an address', async () => {
    const token = newToken();
    // Precondition: an address token is not card-shaped, so only the path decides it.
    expect(looksLikeCardToken(token)).toBe(false);
    expect(await ledesFor(`/invite/${token}`)).toBe(ADDRESS_LEDES);
  });

  it('passes none for a card code, under the card path or typed under /invite/', async () => {
    const card = newCardToken();
    // Precondition: the code is card-shaped, so the shape check is what refuses it under /invite/.
    expect(looksLikeCardToken(card)).toBe(true);
    expect(await ledesFor(`/invite/${card}`)).toBeUndefined();
    SignInPanel.mockClear();
    expect(await ledesFor(`/i/${card}`)).toBeUndefined();
  });

  it.each([
    ['an ordinary page', '/coven/fixture-coven'],
    ['no next', undefined],
    ['a path under an invitation', `/invite/${'a'.repeat(43)}/more`],
    ['an invitation path with a query', `/invite/${'a'.repeat(43)}?x=1`],
    ['the bare invite path', '/invite/'],
  ])('passes none for %s', async (_label, next) => {
    expect(await ledesFor(next)).toBeUndefined();
  });
});

// The mode is in the address, so a reload of Create an Account comes back as Create an Account. Sign-in is the default and
// stays out of the address; only the one known value reads as anything else.
describe('the sign-in page mode', () => {
  const modeFor = async (mode?: string | string[]) => {
    getSession.mockResolvedValue(null);
    render(await SignInPage({ searchParams: Promise.resolve(mode === undefined ? {} : { mode }) }));
    expect(SignInPanel).toHaveBeenCalledTimes(1);
    return SignInPanel.mock.calls[0]![0].mode;
  };

  it('opens the panel creating an account when the address says mode=sign-up', async () => {
    expect(await modeFor('sign-up')).toBe('sign-up');
  });

  it.each([
    ['no mode', undefined],
    ['sign-in, which is the default', 'sign-in'],
    ['an unknown value', 'register'],
    ['a repeated key', ['sign-up', 'sign-up']],
  ])('opens the panel signing in for %s', async (_label, mode) => {
    expect(await modeFor(mode)).toBe('sign-in');
  });
});

// /sign-in is crawlable and in the sitemap; its ?next= and ?error= addresses are the same form.
describe('the sign-in page metadata', () => {
  const metadata = (params: { next?: string; error?: string }) =>
    generateMetadata({ searchParams: Promise.resolve(params) });

  it('names /sign-in as canonical and stays indexable at the bare address', async () => {
    const result = await metadata({});
    expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/sign-in');
    expect(result.robots).toBeUndefined();
  });

  it.each([{ next: '/coven/fixture-coven' }, { error: 'signup_disabled' }])(
    'keeps %o out of search results, its links followed, canonical to /sign-in',
    async (params) => {
      const result = await metadata(params);
      expect(result.robots).toEqual({ index: false, follow: true });
      expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/sign-in');
    },
  );
});
