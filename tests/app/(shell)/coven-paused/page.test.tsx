import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';
import { Forbidden } from '@/lib/errors';

// `/coven-paused/[slug]`, where a member whose access to one coven is paused is sent from its pages. It reads the pause itself
// through the service, by the slug alone: a stranger gets the 404 the coven pages give, and a member with no pause standing is
// sent back in. The service is proved against Postgres in tests/modules/coven/services/member-pause.test.ts.

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error('not-found');
  },
}));
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const pausedCovenBySlug = vi.fn();
vi.mock('@/modules/coven', () => ({ pausedCovenBySlug }));

const { default: CovenPausedPage, metadata } =
  await import('@/app/(shell)/coven-paused/[slug]/page');

const SESSION = { userId: 'u', role: 'user' };

const visit = async (slug = 'fixture-coven') =>
  render(await CovenPausedPage({ params: Promise.resolve({ slug }) }));

beforeEach(() => {
  requireSession.mockResolvedValue(SESSION);
  pausedCovenBySlug.mockReset();
});

afterEach(cleanup);

describe('/coven-paused/[slug]', () => {
  it('names the coven and the end of a dated pause, as the site prints a date, asking the service with its own slug', async () => {
    const until = new Date('2026-12-01T09:30:00.000Z');
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until });
    await visit();

    expect(pausedCovenBySlug).toHaveBeenCalledExactlyOnceWith(SESSION, 'fixture-coven');
    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/Fixture Coven/)).toHaveTextContent(
      `Your access to Fixture Coven is paused until ${longMinuteInZone(until)}.`,
    );
  });

  it('says a pause with no end lasts until an owner lifts it', async () => {
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByText(/Fixture Coven/)).toHaveTextContent(
      'Your access to Fixture Coven is paused, with no end date.',
    );
  });

  it('links to the compendium, which stays open', async () => {
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByRole('link', { name: 'Compendium' })).toHaveAttribute('href', '/compendium');
  });

  it('sends a member with no pause standing back into the coven', async () => {
    pausedCovenBySlug.mockResolvedValue(null);
    await expect(visit()).rejects.toThrow('redirect:/coven/fixture-coven');
  });

  it("answers a stranger and an unknown slug with the coven pages' 404", async () => {
    pausedCovenBySlug.mockRejectedValue(new Forbidden());
    await expect(visit()).rejects.toThrow('not-found');
  });

  it('is kept out of search results', () => {
    expect(metadata).toMatchObject({ title: 'Access Paused', robots: { index: false } });
  });
});
