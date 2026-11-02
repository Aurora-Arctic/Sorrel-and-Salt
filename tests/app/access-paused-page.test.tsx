import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// /access-paused says what its own `?until=` says and nothing else: a pause with an end, one with none, and one whose end
// has passed, which offers Sign In again.

const { default: AccessPausedPage, metadata } = await import('@/app/access-paused/page');

const NOW = new Date('2026-11-02T12:00:00.000Z');

const visit = async (until?: string | string[]) => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  render(await AccessPausedPage({ searchParams: Promise.resolve(until ? { until } : {}) }));
};

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('/access-paused', () => {
  it('names the end of a pause that has one, in UTC, and offers no Sign In yet', async () => {
    await visit('2026-12-01T09:30:00.000Z');

    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/paused until 1 December 2026, 09:30 UTC/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it.each([
    ['no end', undefined],
    ['a malformed end', 'not-a-date'],
    ['a repeated end', ['2026-12-01T09:30:00.000Z', '2026-12-02T09:30:00.000Z']],
  ])('says a pause with %s has no end date', async (_, until) => {
    await visit(until);

    expect(screen.getByText(/paused, with no end date/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it('says a pause whose end has passed is over, and links to Sign In', async () => {
    await visit('2026-11-01T09:30:00.000Z');

    expect(screen.getByText(/ended at 1 November 2026, 09:30 UTC/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
  });

  it('links to the compendium, which a paused account still reads signed out', async () => {
    await visit();

    expect(screen.getByRole('link', { name: 'Compendium' })).toHaveAttribute('href', '/compendium');
  });

  it('asks search engines not to index it', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
