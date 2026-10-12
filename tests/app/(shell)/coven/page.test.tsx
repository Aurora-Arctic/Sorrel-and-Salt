import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';

// The `/coven/[slug]` index page (M9.15): the page every coven opens on. It
// runs the coven guard on its own slug, since a layout does not re-run on
// client-side navigation, and offers Leave, which every role sees, and
// Delete, which only an owner does. What the guard decides is
// tests/lib/request-session.test.ts's and the service's; here it is mocked.
// The role check is the real one, read off the access-control statements.

// The Delete control reads the router, which a page test has no app to give.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership }));
vi.mock('@/modules/coven', async () => ({
  rolePermits: (
    await vi.importActual<typeof import('@/modules/coven/services/access-control')>(
      '@/modules/coven/services/access-control',
    )
  ).rolePermits,
}));

const { default: CovenPage } = await import('@/app/(shell)/coven/[slug]/page');

const params = (slug: string) => Promise.resolve({ slug });

async function renderAs(role: WorkspaceRole) {
  requireCovenMembership.mockResolvedValue({
    workspace: { id: 'w', name: 'Fixture Coven', slug: 'fixture-coven' },
    membership: { workspaceId: 'w', userId: 'u', role },
  });
  render(await CovenPage({ params: params('fixture-coven') }));
}

beforeEach(() => {
  requireCovenMembership.mockReset();
});

describe('the /coven/[slug] page', () => {
  it('guards the slug from its own URL segment', async () => {
    await renderAs('viewer');

    expect(requireCovenMembership).toHaveBeenCalledExactlyOnceWith('fixture-coven');
    expect(screen.getByRole('heading', { level: 1, name: 'Fixture Coven' })).toBeInTheDocument();
  });

  it('renders nothing when the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('not-found'));

    await expect(CovenPage({ params: params('fixture-coven') })).rejects.toThrow('not-found');
  });

  it.each<WorkspaceRole>(['viewer', 'member'])('offers a %s Leave and no Delete', async (role) => {
    await renderAs(role);

    expect(screen.getByRole('button', { name: 'Leave Workspace' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Delete Workspace' })).not.toBeInTheDocument();
  });

  it('offers an owner Leave and Delete', async () => {
    await renderAs('owner');

    expect(screen.getByRole('button', { name: 'Leave Workspace' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Workspace' })).toBeEnabled();
  });
});
