import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hrefs } from '../../../support/links';

// The `/curator` layout and its index page each run the curation guard themselves, which a curator and a keeper
// both pass: a layout does not re-run on client-side navigation (claude-docs/auth/admin-guard.md). The guard is
// mocked (tests/lib/request-session.test.ts's), to prove each route awaits it before rendering.

const requireCuratorSession = vi.fn();
const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession, requireAdminSession }));
vi.mock('next/navigation', () => ({ usePathname: () => '/curator', useRouter: () => ({}) }));

const { default: CuratorLayout } = await import('@/app/(shell)/curator/layout');
const { default: CuratorPage } = await import('@/app/(shell)/curator/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const CURATOR = { ...ADMIN, role: 'curator' } as const;

const CURATION = [
  '/curator/compendium',
  '/curator/categories',
  '/curator/forms',
  '/curator/deities',
  '/curator/celestial-bodies',
];

const nav = () => screen.getByRole('navigation', { name: 'Curator' });
// The staff help pages are linked from here too; the lists below are of the section's own pages, so they leave it out.
const STAFF_HELP = '/help/staff';
const ownPages = (list: (string | null)[]) => list.filter((href) => href !== STAFF_HELP);
const navHrefs = () => ownPages(hrefs(within(nav()).getAllByRole('link')));
const mainHrefs = () => ownPages(hrefs(within(screen.getByRole('main')).getAllByRole('link')));

beforeEach(() => {
  requireCuratorSession.mockReset();
  requireAdminSession.mockReset().mockRejectedValue(new Error('not the curation guard'));
});

describe('the /curator layout', () => {
  it('leads the row with Curator linking to the curator index', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await CuratorLayout({ children: <p>The page itself</p> }));

    const lead = screen
      .getAllByRole('link', { name: 'Curator' })
      .find((link) => !nav().contains(link));
    expect(lead).toHaveAttribute('href', '/curator');
  });

  it.each([
    ['a curator', CURATOR],
    ['an admin', ADMIN],
  ])('shows %s every curation page and nothing under /keepers, around the page', async (_, who) => {
    requireCuratorSession.mockResolvedValue(who);

    render(await CuratorLayout({ children: <p>The page itself</p> }));

    expect(navHrefs()).toEqual(CURATION);
    expect(screen.getByText('The page itself')).toBeInTheDocument();
    expect(requireCuratorSession).toHaveBeenCalledOnce();
  });

  it('renders nothing when the guard refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(CuratorLayout({ children: <p>The page itself</p> })).rejects.toThrow('forbidden');
  });
});

describe('the /curator page', () => {
  it('renders for a curator under the heading Curator', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await CuratorPage());

    expect(requireCuratorSession).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { level: 1, name: 'Curator' })).toBeInTheDocument();
  });

  // The index is a table of contents read from the nav's own list, so the two name the same pages in the same order.
  it('links every page the Curator nav does, in its order', async () => {
    requireCuratorSession.mockResolvedValue(ADMIN);

    render(await CuratorLayout({ children: await CuratorPage() }));

    const row = within(nav())
      .getAllByRole('link')
      .filter((link) => !link.closest('details'));
    expect(ownPages(hrefs(row))).toEqual(CURATION);
    expect(mainHrefs()).toEqual(CURATION);
  });

  it('renders nothing when the guard refuses, without the layout having run', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(CuratorPage()).rejects.toThrow('forbidden');
  });
});

describe('the /curator section and the staff help pages', () => {
  it.each([
    ['a curator', CURATOR],
    ['a keeper', ADMIN],
  ])('links %s to the staff help pages', async (_, who) => {
    requireCuratorSession.mockResolvedValue(who);

    render(await CuratorLayout({ children: await CuratorPage() }));

    expect(requireCuratorSession).toHaveBeenCalled();
    expect(hrefs(screen.getAllByRole('link'))).toContain(STAFF_HELP);
  });
});
