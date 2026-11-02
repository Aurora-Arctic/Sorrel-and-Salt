import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin` layout and its index page each run the guard themselves: a layout does not re-run on client-side navigation, so a page that trusted it would render for whoever reached it that way (claude-docs/auth/admin-guard.md, "The admin guard").
// The guard is mocked (tests/lib/request-session.test.ts's), to prove each route awaits it before rendering. It is the curation guard, which a curator passes too; the people pages beneath call the admin one.

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));
const countSupportViews = vi.fn();
vi.mock('@/modules/support', () => ({ countSupportViews }));
// AdminNav marks the page you are on from the address, which Next reads from
// the App Router's state; a test mounts no router, so the address is given,
// and the route-modal provider's router is a stand-in that goes nowhere.
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({}) }));

const { default: AdminLayout } = await import('@/app/(shell)/admin/layout');
const { default: AdminPage } = await import('@/app/(shell)/admin/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;
const CURATOR = { ...ADMIN, role: 'curator' } as const;

const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));
const navHrefs = () =>
  hrefs(within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link'));

beforeEach(() => {
  requireCuratorSession.mockReset();
  countSupportViews.mockReset().mockResolvedValue({ needs_staff: 5 });
});

describe('the /admin layout', () => {
  it('says the requests waiting on staff in the Support link', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await AdminLayout({ children: <p>The page itself</p> }));

    expect(
      within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', {
        name: /Support/,
      }),
    ).toHaveTextContent('Support 5');
    expect(countSupportViews).toHaveBeenCalledWith(CURATOR, {});
  });

  // The row's name is the area's home, as the coven row's switcher is.
  it('leads the row with Admin linking to the admin index', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await AdminLayout({ children: <p>The page itself</p> }));

    const nav = screen.getByRole('navigation', { name: 'Admin' });
    const lead = screen.getAllByRole('link', { name: 'Admin' }).find((link) => !nav.contains(link));
    expect(lead).toHaveAttribute('href', '/admin');
  });

  it('shows a curator the nav without People, and an admin with it, around the page', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);
    const { unmount } = render(await AdminLayout({ children: <p>The page itself</p> }));
    expect(navHrefs()).not.toContain('/admin/users');
    expect(navHrefs()).toContain('/admin/compendium');
    unmount();

    requireCuratorSession.mockResolvedValue(ADMIN);
    render(await AdminLayout({ children: <p>The page itself</p> }));
    expect(navHrefs()).toContain('/admin/users');
    expect(screen.getByText('The page itself')).toBeInTheDocument();
    expect(requireCuratorSession).toHaveBeenCalledTimes(2);
  });

  it('renders nothing when the guard refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminLayout({ children: <p>The page itself</p> })).rejects.toThrow('forbidden');
  });
});

describe('the /admin page', () => {
  it('renders for an admin', async () => {
    requireCuratorSession.mockResolvedValue(ADMIN);

    render(await AdminPage());

    expect(requireCuratorSession).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  // The index is a table of contents read from the nav's own list,
  // so the two name the same pages in the same order.
  it('links every page the admin nav does, in its order', async () => {
    requireCuratorSession.mockResolvedValue(ADMIN);

    render(await AdminLayout({ children: await AdminPage() }));

    const navLinks = within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link');
    const row = navLinks.filter((link) => !link.closest('details'));
    expect(row).toHaveLength(7);
    expect(hrefs(within(screen.getByRole('main')).getAllByRole('link'))).toEqual(hrefs(row));
  });

  it('links a curator to the curation pages and not to People', async () => {
    requireCuratorSession.mockResolvedValue(CURATOR);

    render(await AdminPage());

    const links = hrefs(within(screen.getByRole('main')).getAllByRole('link'));
    expect(links).toContain('/admin/compendium');
    expect(links).not.toContain('/admin/users');
  });

  it('renders nothing when the guard refuses, without the layout having run', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminPage()).rejects.toThrow('forbidden');
  });
});
