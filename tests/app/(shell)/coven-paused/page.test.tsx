import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../../../support/printed-text';
import { Forbidden } from '@/lib/errors';

// `/coven-paused/[slug]`, where a member whose access to one coven is paused is sent from its pages. It reads the pause itself
// through the service, by the slug alone: a stranger gets the 404 the coven pages give, and a member with no pause standing is
// sent back in. The service is proved against Postgres in tests/modules/coven/services/member-pause.test.ts.

vi.mock('next/navigation', () => ({
  useRouter: () => ({}),
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error('not-found');
  },
  usePathname: () => '/coven-paused/fixture-coven',
  useSearchParams: () => new URLSearchParams(),
}));
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const pausedCovenBySlug = vi.fn();
vi.mock('@/modules/coven', () => ({ pausedCovenBySlug }));
// The Leave button's confirmation and its leave are its own (tests/components/LeaveWorkspaceButton/index.test.tsx); here
// only that the page hands it this coven.
const LeaveWorkspaceButton = vi.fn(
  (_props: { workspaceId: string; name: string; quiet?: boolean }) => (
    <button type="button">Leave Coven</button>
  ),
);
vi.mock('@/components/LeaveWorkspaceButton', () => ({ default: LeaveWorkspaceButton }));

const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));
// The switcher's choices and moves are its own (tests/components/WorkspaceSwitcher/index.test.tsx); here only that the page
// hands it every coven of the viewer's.
const WorkspaceSwitcher = vi.fn((_props: { workspaces: unknown[]; canCreate: boolean }) => (
  <div>Coven switcher</div>
));
vi.mock('@/components/WorkspaceSwitcher', () => ({ default: WorkspaceSwitcher }));

const FIXTURE = { slug: 'fixture-coven', name: 'Fixture Coven', paused: { until: null } };
const TESTWORT = { slug: 'testwort-circle', name: 'Testwort Circle', paused: null };
const THIRD = { slug: 'third-circle', name: 'Third Circle', paused: { until: null } };

const { default: CovenPausedPage, metadata } =
  await import('@/app/(shell)/coven-paused/[slug]/page');

const SESSION = { userId: 'u', role: 'user' };

const visit = async (slug = 'fixture-coven') =>
  render(await CovenPausedPage({ params: Promise.resolve({ slug }) }));

beforeEach(() => {
  requireSession.mockResolvedValue(SESSION);
  pausedCovenBySlug.mockReset();
  LeaveWorkspaceButton.mockClear();
  WorkspaceSwitcher.mockClear();
  viewerOf.mockReset().mockResolvedValue({ viewer: { canCreate: false }, workspaces: [FIXTURE] });
});

afterEach(cleanup);

describe('/coven-paused/[slug]', () => {
  it('names the coven and the end of a dated pause, as the site prints a date, asking the service with its own slug', async () => {
    const until = new Date('2026-12-01T09:30:00.000Z');
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until });
    await visit();

    expect(pausedCovenBySlug).toHaveBeenCalledExactlyOnceWith(SESSION, 'fixture-coven');
    expect(screen.getByRole('heading', { name: 'Access Paused' })).toBeInTheDocument();
    expect(screen.getByText(/Your access to/)).toHaveTextContent(
      `Your access to Fixture Coven is paused until ${printed(longMinuteInZone(until))}.`,
    );
  });

  it('says a pause with no end has none', async () => {
    pausedCovenBySlug.mockResolvedValue({ name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByText(/Your access to/)).toHaveTextContent(
      'Your access to Fixture Coven is paused, with no end date.',
    );
  });

  it('offers the paused member Leave Coven, quiet, for this coven', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByRole('button', { name: 'Leave Coven' })).toBeInTheDocument();
    expect(LeaveWorkspaceButton.mock.lastCall?.[0]).toEqual({
      workspaceId: 'coven-id',
      name: 'Fixture Coven',
      quiet: true,
    });
  });

  it('opens the Support dialog over the page from its Support link, to ask about the pause', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/coven-paused/fixture-coven?support=',
    );
  });

  it('offers the coven switcher over every coven of the viewer’s, so the paused coven is no dead end', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    viewerOf.mockResolvedValue({ viewer: { canCreate: true }, workspaces: [FIXTURE, TESTWORT] });
    await visit();

    expect(screen.getByRole('region', { name: 'Context' })).toHaveTextContent('Coven switcher');
    expect(WorkspaceSwitcher.mock.lastCall?.[0]).toEqual({
      workspaces: [FIXTURE, TESTWORT],
      canCreate: true,
    });
  });

  it('reads Leave Coven before the list of the other covens', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    viewerOf.mockResolvedValue({ viewer: { canCreate: false }, workspaces: [FIXTURE, TESTWORT] });
    await visit();

    const leave = screen.getByRole('button', { name: 'Leave Coven' });
    const others = screen.getByRole('list', { name: 'Your Other Covens' });
    expect(leave.compareDocumentPosition(others) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('links to each other coven the viewer can open, passing over this one and any other paused', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    viewerOf.mockResolvedValue({
      viewer: { canCreate: false },
      workspaces: [FIXTURE, TESTWORT, THIRD],
    });
    await visit();

    const others = screen.getByRole('list', { name: 'Your Other Covens' });
    expect(
      within(others)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/coven/testwort-circle']);
    expect(within(others).getByRole('link', { name: 'Testwort Circle' })).toBeInTheDocument();
  });

  it('lists no other covens for a viewer with none to open', async () => {
    pausedCovenBySlug.mockResolvedValue({ id: 'coven-id', name: 'Fixture Coven', until: null });
    await visit();

    expect(screen.queryByRole('list', { name: 'Your Other Covens' })).toBeNull();
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
