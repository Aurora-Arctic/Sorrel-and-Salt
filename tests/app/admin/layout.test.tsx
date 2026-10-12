import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin` layout and its index page each run the guard themselves: a
// layout does not re-run on client-side navigation, so a page that trusted it
// would render for whoever reached it that way (claude-docs/auth/admin-guard.md, "The
// admin guard"). What the guard decides is tests/lib/request-session.test.ts's;
// here it is mocked, to prove each route awaits it before rendering anything.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));
// AdminNav marks the page you are on from the address, which Next reads from
// the App Router's state; a test mounts no router, so the address is given,
// and the route-modal provider's router is a stand-in that goes nowhere.
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({}) }));

const { default: AdminLayout } = await import('@/app/admin/layout');
const { default: AdminPage } = await import('@/app/admin/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

beforeEach(() => {
  requireAdminSession.mockReset();
});

describe('the /admin layout', () => {
  it('shows an admin the admin nav around the page', async () => {
    requireAdminSession.mockResolvedValue(ADMIN);

    render(await AdminLayout({ children: <p>The page itself</p> }));

    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByText('The page itself')).toBeInTheDocument();
  });

  it('renders nothing when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminLayout({ children: <p>The page itself</p> })).rejects.toThrow('forbidden');
  });
});

describe('the /admin page', () => {
  it('renders for an admin', async () => {
    requireAdminSession.mockResolvedValue(ADMIN);

    render(await AdminPage());

    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  // MB.115: the index is a table of contents read from the nav's own list,
  // so the two name the same pages in the same order.
  it('links every page the admin nav does, in its order', async () => {
    requireAdminSession.mockResolvedValue(ADMIN);
    const hrefs = (links: HTMLElement[]) => links.map((link) => link.getAttribute('href'));

    render(await AdminLayout({ children: await AdminPage() }));

    const navLinks = within(screen.getByRole('navigation', { name: 'Admin' })).getAllByRole('link');
    const row = navLinks.filter((link) => !link.closest('details'));
    expect(row).toHaveLength(6);
    expect(hrefs(within(screen.getByRole('main')).getAllByRole('link'))).toEqual(hrefs(row));
  });

  it('renders nothing when the guard refuses, without the layout having run', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminPage()).rejects.toThrow('forbidden');
  });
});
