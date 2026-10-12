import { fireEvent, render, screen, within } from '@testing-library/react';
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
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));
const memberRoster = vi.fn();
vi.mock('@/modules/identity', () => ({
  displayNamesOf: async (_session: unknown, ids: string[]) => ids.map((id) => `Name of ${id}`),
}));
vi.mock('@/modules/coven', async () => ({
  memberRoster,
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
  requireSession.mockResolvedValue({ userId: 'u', role: 'user' });
  memberRoster.mockReset();
  memberRoster.mockResolvedValue([{ userId: 'u', role: 'owner' }]);
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

  // The guided exit (M6.16): the only owner is shown both ways out on click;
  // one of several owners, a member and a viewer leave as before.
  describe('the only owner', () => {
    it('opens a dialog offering a hand-over to each other member, and the deletion', async () => {
      memberRoster.mockResolvedValue([
        { userId: 'u', role: 'owner' },
        { userId: 'm', role: 'member' },
        { userId: 'v', role: 'viewer' },
      ]);
      await renderAs('owner');

      fireEvent.click(screen.getByRole('button', { name: 'Leave Workspace' }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByRole('radio', { name: /^Hand it/ })).toBeChecked();
      const box = await within(dialog).findByRole('combobox', { name: 'New Owner' });
      fireEvent.focus(box);
      fireEvent.change(box, { target: { value: 'Name of' } });
      // The owner themselves is not a choice; the others come with their roles.
      expect(within(dialog).getAllByRole('option')).toHaveLength(2);
      expect(within(dialog).getByRole('option', { name: /Name of m.*Member/ })).toBeInTheDocument();
      expect(within(dialog).getByRole('option', { name: /Name of v.*Viewer/ })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Promote and Leave' })).toBeDisabled();

      fireEvent.click(within(dialog).getByRole('radio', { name: /^Delete it/ }));
      expect(within(dialog).getByRole('button', { name: 'Delete Workspace' })).toBeEnabled();
    });

    it('offers the one other member by name, with nothing to search', async () => {
      memberRoster.mockResolvedValue([
        { userId: 'u', role: 'owner' },
        { userId: 'm', role: 'member' },
      ]);
      await renderAs('owner');

      fireEvent.click(screen.getByRole('button', { name: 'Leave Workspace' }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByRole('radio', { name: /Name of m/ })).toBeChecked();
      expect(within(dialog).queryByRole('combobox')).toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Promote and Leave' })).toBeEnabled();
    });

    it('is offered only the deletion when no one else is in the coven', async () => {
      await renderAs('owner');

      fireEvent.click(screen.getByRole('button', { name: 'Leave Workspace' }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).queryByRole('button', { name: 'Promote and Leave' })).toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Delete Workspace' })).toBeEnabled();
    });
  });

  it('gives one of two owners the plain confirmation', async () => {
    memberRoster.mockResolvedValue([
      { userId: 'u', role: 'owner' },
      { userId: 'o', role: 'owner' },
    ]);
    await renderAs('owner');

    fireEvent.click(screen.getByRole('button', { name: 'Leave Workspace' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByRole('button', { name: 'Promote and Leave' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Leave Workspace' })).toBeEnabled();
  });

  it.each<WorkspaceRole>(['member', 'viewer'])('never reads the roll for a %s', async (role) => {
    await renderAs(role);

    expect(memberRoster).not.toHaveBeenCalled();
  });
});
