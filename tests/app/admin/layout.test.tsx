import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/admin` layout and its index page each run the guard themselves: a
// layout does not re-run on client-side navigation, so a page that trusted it
// would render for whoever reached it that way (claude-docs/auth/admin-guard.md, "The
// admin guard"). What the guard decides is tests/lib/request-session.test.ts's;
// here it is mocked, to prove each route awaits it before rendering anything.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

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

  it('renders nothing when the guard refuses, without the layout having run', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(AdminPage()).rejects.toThrow('forbidden');
  });
});
