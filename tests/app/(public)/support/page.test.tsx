import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';

// What /support shows each kind of visitor: Sign In to nobody signed in, the email page's redirect to an
// unverified account, the end of a timeout, and otherwise the form. The session and service are mocked.

const getSession = vi.fn<() => Promise<Session | null>>();
const sessionIsVerified = vi.fn<() => Promise<boolean>>();
vi.mock('@/lib/request-session', () => ({ getSession, sessionIsVerified }));

const getMySupportTimeoutEnd = vi.fn<() => Promise<Date | null>>();
vi.mock('@/modules/support', () => ({ getMySupportTimeoutEnd }));

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
vi.mock('next/navigation', () => ({ redirect }));

vi.mock('@/components/SupportPanel', () => ({
  default: ({ state }: { state: { kind: string } }) => <p>{`panel:${state.kind}`}</p>,
}));

const { default: SupportPage } = await import('@/app/(public)/support/page');

const SESSION = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' } as Session;

const show = async () => render(await SupportPage({ searchParams: Promise.resolve({}) }));

beforeEach(() => {
  getSession.mockReset();
  sessionIsVerified.mockReset();
  getMySupportTimeoutEnd.mockReset();
  redirect.mockClear();
  getSession.mockResolvedValue(SESSION);
  sessionIsVerified.mockResolvedValue(true);
  getMySupportTimeoutEnd.mockResolvedValue(null);
});

describe('the /support page', () => {
  it('offers Sign In to a visitor with no session', async () => {
    getSession.mockResolvedValue(null);
    await show();

    expect(screen.getByText('panel:signed-out')).toBeVisible();
    expect(getMySupportTimeoutEnd).not.toHaveBeenCalled();
  });

  // Why the form could have shown: the account holds a session.
  it('sends an unverified account to the email page and shows it no form', async () => {
    sessionIsVerified.mockResolvedValue(false);

    await expect(show()).rejects.toThrow('redirect:/account/email');
    expect(getMySupportTimeoutEnd).not.toHaveBeenCalled();
  });

  it('tells a timed-out sender when it ends', async () => {
    getMySupportTimeoutEnd.mockResolvedValue(new Date('2030-01-01T00:00:00Z'));
    await show();

    expect(screen.getByText('panel:timed-out')).toBeVisible();
  });

  it('shows a verified sender the form', async () => {
    await show();

    expect(screen.getByText('panel:form')).toBeVisible();
  });
});
