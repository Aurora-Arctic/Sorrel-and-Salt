import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../support/printed-text';

// /access-paused reads the viewer's own standing pause, as the shell does, and says when it ends: a pause with an end and
// one with none. Signed out it sends the visitor to Sign In, and with no pause standing, lifted or ended, to the entry page.
// Its Support link opens the Support dialog over the page, as the footer's does, and it links to the viewer's own requests,
// the one way there from this shell-less page; a standing support time-out is named beside them.

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  usePathname: () => '/access-paused',
  useSearchParams: () => new URLSearchParams(),
}));
const getShellSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getShellSession }));
const getMySupportTimeout = vi.fn();
vi.mock('@/modules/support', () => ({ getMySupportTimeout }));

const { default: AccessPausedPage, metadata } = await import('@/app/access-paused/page');

const SESSION = { userId: 'u', role: 'user' };

const visit = async () => render(await AccessPausedPage());

beforeEach(() => {
  getShellSession.mockReset();
  getMySupportTimeout.mockReset();
  getMySupportTimeout.mockResolvedValue(null);
});

afterEach(cleanup);

describe('/access-paused', () => {
  it('names the end of the viewer’s standing pause, as the site prints a date', async () => {
    const until = new Date('2026-12-01T09:30:00.000Z');
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until } });
    await visit();

    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/Access to this account is paused until/)).toHaveTextContent(
      `Access to this account is paused until ${printed(longMinuteInZone(until))}.`,
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

  it('links to the viewer’s own support requests, and names no time-out where none stands', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    await visit();

    expect(getMySupportTimeout).toHaveBeenCalledWith(SESSION);
    expect(screen.getByRole('link', { name: 'your requests' })).toHaveAttribute(
      'href',
      '/account/support',
    );
    expect(screen.queryByText(/cannot send/)).not.toBeInTheDocument();
  });

  it('says a timed-out viewer reads their requests but cannot send one until the time-out ends', async () => {
    const until = new Date('2026-12-03T15:00:00.000Z');
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    getMySupportTimeout.mockResolvedValue({ until });
    await visit();

    expect(screen.getByText(/cannot send one/)).toHaveTextContent(
      `You can still reach Support signed in to read your requests, but you cannot send one until ${printed(longMinuteInZone(until))}.`,
    );
    expect(screen.getByRole('link', { name: 'your requests' })).toHaveAttribute(
      'href',
      '/account/support',
    );
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/access-paused?support=',
    );
  });

  it('says a time-out with no end leaves the viewer reading their requests', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });
    getMySupportTimeout.mockResolvedValue({ until: null });
    await visit();

    expect(screen.getByText(/cannot send one/)).toHaveTextContent(
      'You can still reach Support signed in to read your requests, but you cannot send one: you are timed out with no end date.',
    );
  });

  it('reads no time-out for an unverified account, which the support reads refuse', async () => {
    getShellSession.mockResolvedValue({
      session: { ...SESSION, emailUnverified: true },
      accessPause: { until: null },
    });
    await visit();

    expect(getMySupportTimeout).not.toHaveBeenCalled();
    expect(screen.queryByText(/cannot send/)).not.toBeInTheDocument();
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
