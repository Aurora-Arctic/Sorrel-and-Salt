import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
// The Leave button's confirmation and its leave are its own (tests/components/LeaveWorkspaceButton/index.test.tsx); here
// only that the page hands it this coven.
const LeaveWorkspaceButton = vi.fn((_props: { workspaceId: string; name: string }) => (
  <button type="button">Leave Coven</button>
));
vi.mock('@/components/LeaveWorkspaceButton', () => ({ default: LeaveWorkspaceButton }));

const { default: CovenPausedPage, metadata } =
  await import('@/app/(shell)/coven-paused/[slug]/page');

const SESSION = { userId: 'u', role: 'user' };

const visit = async (slug = 'fixture-coven') =>
  render(await CovenPausedPage({ params: Promise.resolve({ slug }) }));

beforeEach(() => {
  requireSession.mockResolvedValue(SESSION);
  pausedCovenBySlug.mockReset();
  LeaveWorkspaceButton.mockClear();
});

afterEach(cleanup);

describe('/coven-paused/[slug]', () => {
  it('names the coven and the end of a dated pause, in UTC, asking the service with its own slug', async () => {
    pausedCovenBySlug.mockResolvedValue({
      name: 'Fixture Coven',
      until: new Date('2026-12-01T09:30:00.000Z'),
    });
    await visit();

    expect(pausedCovenBySlug).toHaveBeenCalledExactlyOnceWith(SESSION, 'fixture-coven');
    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/Fixture Coven/)).toHaveTextContent(
      'Your access to Fixture Coven is paused until 1 December 2026, 09:30 UTC.',
    );
  });

  it('says a pause with no end lasts until an owner lifts it', async () => {
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByText(/Fixture Coven/)).toHaveTextContent(
      'Your access to Fixture Coven is paused, with no end date.',
    );
  });

  it('offers the paused member Leave Coven, for this coven', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByRole('button', { name: 'Leave Coven' })).toBeInTheDocument();
    expect(LeaveWorkspaceButton.mock.lastCall?.[0]).toEqual({
      workspaceId: 'coven-id',
      name: 'Fixture Coven',
    });
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
