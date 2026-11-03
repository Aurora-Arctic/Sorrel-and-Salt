import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hrefs } from '../../../support/links';

// The `/keepers` layout and its index page each run the guard themselves: a layout does not re-run on client-side navigation, so a page that trusted it would render for whoever reached it that way (claude-docs/auth/admin-guard.md).
// The guard is mocked (tests/lib/request-session.test.ts's), to prove each route awaits it before rendering. It is the curation guard, which a curator passes too, since a curator reaches the index and Support; the people and invitation pages beneath call the admin one.

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));
const countSupportViews = vi.fn();
vi.mock('@/modules/support', () => ({ countSupportViews }));
// The nav marks the page you are on from the address, which Next reads from
// the App Router's state; a test mounts no router, so the address is given,
// and the route-modal provider's router is a stand-in that goes nowhere.
vi.mock('next/navigation', () => ({ usePathname: () => '/keepers', useRouter: () => ({}) }));

const { default: KeepersLayout } = await import('@/app/(shell)/keepers/layout');
const { default: KeepersPage } = await import('@/app/(shell)/keepers/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const CURATOR = { ...ADMIN, role: 'curator' } as const;

const SUPPORT = '/keepers/support';
const ADMIN_ONLY = ['/keepers/users', '/keepers/invitations'];

const nav = () => screen.getByRole('navigation', { name: 'Keepers' });
const navHrefs = () => hrefs(within(nav()).getAllByRole('link'));
const mainHrefs = () => hrefs(within(screen.getByRole('main')).getAllByRole('link'));

beforeEach(() => {
  requireCuratorSession.mockReset();
  countSupportViews.mockReset().mockResolvedValue({ needs_staff: 5 });
});

describe('the /keepers layout', () => {
  it('says the requests waiting on staff in the Support link', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await KeepersLayout({ children: <p>The page itself</p> }));

    expect(within(nav()).getByRole('link', { name: /Support/ })).toHaveTextContent('Support 5');
    expect(countSupportViews).toHaveBeenCalledWith(CURATOR, {});
  });

  // The row's name is the area's home, as the coven row's switcher is.
  it('leads the row with Keepers linking to the keepers index', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await KeepersLayout({ children: <p>The page itself</p> }));

    const lead = screen
      .getAllByRole('link', { name: 'Keepers' })
      .find((link) => !nav().contains(link));
    expect(lead).toHaveAttribute('href', '/keepers');
  });

  // Why the curator's nav could have listed more: the same layout lists People and Invitations to a keeper.
  it('shows a curator Support alone and a keeper Support, People and Invitations, around the page', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);
    const { unmount } = render(await KeepersLayout({ children: <p>The page itself</p> }));
    expect(navHrefs()).toEqual([SUPPORT]);
    unmount();

    requireCuratorSession.mockResolvedValue(ADMIN);
    render(await KeepersLayout({ children: <p>The page itself</p> }));
    expect(navHrefs()).toEqual(expect.arrayContaining([SUPPORT, ...ADMIN_ONLY]));
    expect(navHrefs().filter((href) => href?.startsWith('/curator'))).toEqual([]);
    expect(screen.getByText('The page itself')).toBeInTheDocument();
    expect(requireCuratorSession).toHaveBeenCalledTimes(2);
  });

  it('renders nothing when the guard refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(KeepersLayout({ children: <p>The page itself</p> })).rejects.toThrow('forbidden');
  });
});

describe('the /keepers page', () => {
  it('renders for a keeper under the heading Keepers', async () => {
    requireCuratorSession.mockResolvedValue(ADMIN);

    render(await KeepersPage());

    expect(requireCuratorSession).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { level: 1, name: 'Keepers' })).toBeInTheDocument();
  });

  // The index is a table of contents read from the nav's own list,
  // so the two name the same pages in the same order.
  it('links a keeper to every page the Keepers nav does, in its order', async () => {
    requireCuratorSession.mockResolvedValue(ADMIN);

    render(await KeepersLayout({ children: await KeepersPage() }));

    const row = within(nav())
      .getAllByRole('link')
      .filter((link) => !link.closest('details'));
    expect(hrefs(row)).toEqual(expect.arrayContaining([SUPPORT, ...ADMIN_ONLY]));
    expect(mainHrefs()).toEqual(hrefs(row));
  });

  it('links a curator to Support alone', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await KeepersPage());

    expect(mainHrefs()).toEqual([SUPPORT]);
  });

  it('renders nothing when the guard refuses, without the layout having run', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(KeepersPage()).rejects.toThrow('forbidden');
  });
});
