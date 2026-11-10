import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { getSession, sessionIsVerified } from '../../../support/request-session';

// What /support shows each kind of visitor: Sign In to nobody signed in, the email page's redirect to an
// unverified account, the end of a timeout, and otherwise the form. The session and service are mocked.

vi.mock('@/lib/request-session', () => import('../../../support/request-session'));

const getMySupportTimeout = vi.fn<() => Promise<{ until: Date | null } | null>>();
vi.mock('@/modules/support', () => ({ getMySupportTimeout }));

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock('next/navigation', async () => ({
  ...(await import('../../../support/next-navigation')),
  redirect,
  usePathname: () => '/support',
}));

const panelState = vi.fn<(state: unknown) => void>();
vi.mock('@/components/SupportPanel', () => ({
  default: ({ state }: { state: { kind: string } }) => {
    panelState(state);
    return <p>{`panel:${state.kind}`}</p>;
  },
}));

const { default: SupportPage, metadata } = await import('@/app/(public)/support/page');

const SESSION = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' } as Session;

const show = async () => render(await SupportPage({ searchParams: Promise.resolve({}) }));

beforeEach(() => {
  getSession.mockReset();
  sessionIsVerified.mockReset();
  getMySupportTimeout.mockReset();
  redirect.mockClear();
  getSession.mockResolvedValue(SESSION);
  sessionIsVerified.mockResolvedValue(true);
  getMySupportTimeout.mockResolvedValue(null);
});

describe('the /support page', () => {
  it.each([
    ['a visitor with no session', null],
    ['a signed-in sender', SESSION],
  ])('links Search Help to %s', async (_who, session) => {
    getSession.mockResolvedValue(session);
    await show();

    expect(screen.getByRole('link', { name: 'Search Help' })).toHaveAttribute('href', '/help');
  });

  it('offers Sign In to a visitor with no session', async () => {
    getSession.mockResolvedValue(null);
    await show();

    expect(screen.getByText('panel:signed-out')).toBeVisible();
    expect(getMySupportTimeout).not.toHaveBeenCalled();
  });

  // Why the form could have shown: the account holds a session.
  it('sends an unverified account to the email page and shows it no form', async () => {
    sessionIsVerified.mockResolvedValue(false);

    await expect(show()).rejects.toThrow('redirect:/account/email');
    expect(getMySupportTimeout).not.toHaveBeenCalled();
  });

  it('tells a timed-out sender when it ends', async () => {
    getMySupportTimeout.mockResolvedValue({ until: new Date('2030-01-01T00:00:00Z') });
    await show();

    expect(screen.getByText('panel:timed-out')).toBeVisible();
  });

  it('tells a sender timed out with no end date, in place of the form', async () => {
    getMySupportTimeout.mockResolvedValue({ until: null });
    await show();

    expect(screen.getByText('panel:timed-out')).toBeVisible();
  });

  it('shows a verified sender the form', async () => {
    await show();

    expect(screen.getByText('panel:form')).toBeVisible();
  });

  it('gives the signed-out form the error reference and detail the address carries', async () => {
    getSession.mockResolvedValue(null);
    render(
      await SupportPage({
        searchParams: Promise.resolve({
          support: 'bug',
          ref: 'abc123',
          detail: 'TypeError: Testwort',
        }),
      }),
    );

    expect(panelState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'signed-out',
        errorReference: 'abc123',
        errorDetail: 'TypeError: Testwort',
      }),
    );
  });

  it('gives the form the error reference and detail the address carries', async () => {
    render(
      await SupportPage({
        searchParams: Promise.resolve({
          support: 'bug',
          error: '500',
          ref: 'abc123',
          detail: 'TypeError: Testwort',
        }),
      }),
    );

    expect(panelState).toHaveBeenLastCalledWith(
      expect.objectContaining({ errorReference: 'abc123', errorDetail: 'TypeError: Testwort' }),
    );
  });
});

// robots.txt lets a crawler fetch /support so it can read this; the page itself holds no content
// worth a search result.
describe('the /support page metadata', () => {
  it('keeps the page out of search results, its links followed', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
