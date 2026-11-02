import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';

// /access-paused reads the viewer's own standing pause, as the shell does, and says when it ends: a pause with an end and
// one with none. Signed out it sends the visitor to Sign In, and with no pause standing, lifted or ended, to the entry page.
// Its Support link opens the Support dialog over the page, as the footer's does.

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  usePathname: () => '/access-paused',
  useSearchParams: () => new URLSearchParams(),
}));
const getShellSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getShellSession }));

const { default: AccessPausedPage, metadata } = await import('@/app/access-paused/page');

const SESSION = { userId: 'u', role: 'user' };

const visit = async () => render(await AccessPausedPage());

beforeEach(() => {
  getShellSession.mockReset();
});

afterEach(cleanup);

describe('/access-paused', () => {
  it('names the end of the viewer’s standing pause, as the site prints a date', async () => {
    const until = new Date('2026-12-01T09:30:00.000Z');
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until } });
    await visit();

    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/Access to this account is paused until/)).toHaveTextContent(
      `Access to this account is paused until ${longMinuteInZone(until)}.`,
    );
  });

  it('says a pause with no end lasts until an admin lifts it', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    await visit();

    expect(screen.getByText(/paused, with no end date/)).toBeInTheDocument();
  });

  it('sends a signed-out visitor to Sign In', async () => {
    getShellSession.mockResolvedValue(null);

    await expect(AccessPausedPage()).rejects.toThrow('redirect:/sign-in');
  });

  it('sends a signed-in viewer with no pause standing to the entry page', async () => {
    // Signed in, so only the missing pause sends them on.
    getShellSession.mockResolvedValue({ session: SESSION });

    await expect(AccessPausedPage()).rejects.toThrow(/^redirect:\/$/);
  });

  it('opens the Support dialog over the page from its Support link', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    await visit();

    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/access-paused?support=',
    );
  });

  it('links to the compendium, which a paused account still reads', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    await visit();

    expect(screen.getByRole('link', { name: 'Compendium' })).toHaveAttribute('href', '/compendium');
  });

  it('asks search engines not to index it', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
