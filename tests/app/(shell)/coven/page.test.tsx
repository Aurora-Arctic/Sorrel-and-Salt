import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';

// The `/coven/[slug]` index page. It runs the coven guard on its own slug, since a layout does not re-run on client-side navigation, and offers Leave to every role and Delete to an owner only.
// The guard is mocked (tests/lib/request-session.test.ts's and the service's); the role check is real, read off the access-control statements.

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

    expect(screen.getByRole('button', { name: 'Leave Coven' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Delete Coven' })).not.toBeInTheDocument();
  });

  it('offers an owner Leave and Delete', async () => {
    await renderAs('owner');

    expect(screen.getByRole('button', { name: 'Leave Coven' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Coven' })).toBeEnabled();
  });

  // The guided exit: the only owner is shown both ways out on click;
  // one of several owners, a member and a viewer leave as before.
  describe('the only owner', () => {
    // What the dialog does with the roster is LeaveWorkspaceButton's owner-exit tests'; the page
    // hands it the roster without the viewer, and flags the only owner.
    it('opens a dialog offering a hand-over to each other member, and the deletion', async () => {
      memberRoster.mockResolvedValue([
        { userId: 'u', role: 'owner' },
        { userId: 'm', role: 'member' },
        { userId: 'v', role: 'viewer' },
      ]);
      await renderAs('owner');

      fireEvent.click(screen.getByRole('button', { name: 'Leave Coven' }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByRole('radio', { name: /^Hand It/ })).toBeChecked();
      expect(within(dialog).getByRole('radio', { name: /^Delete Coven/ })).toBeInTheDocument();
      const box = await within(dialog).findByRole('combobox', { name: 'New Owner' });
      fireEvent.focus(box);
      fireEvent.change(box, { target: { value: 'Name of' } });
      // The owner themselves is not a choice; the others come with their roles.
      expect(within(dialog).getAllByRole('option')).toHaveLength(2);
      expect(within(dialog).getByRole('option', { name: /Name of m.*Member/ })).toBeInTheDocument();
      expect(within(dialog).getByRole('option', { name: /Name of v.*Viewer/ })).toBeInTheDocument();
    });
  });

  it('gives one of two owners the plain confirmation', async () => {
    memberRoster.mockResolvedValue([
      { userId: 'u', role: 'owner' },
      { userId: 'o', role: 'owner' },
    ]);
    await renderAs('owner');

    fireEvent.click(screen.getByRole('button', { name: 'Leave Coven' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByRole('button', { name: 'Promote and Leave' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Leave Coven' })).toBeEnabled();
  });

  it.each<WorkspaceRole>(['member', 'viewer'])('never reads the roll for a %s', async (role) => {
    await renderAs(role);

    expect(memberRoster).not.toHaveBeenCalled();
  });

  // Contents lists the pages the caller can reach, Your Membership holds Leave alone, and Delete has its own section for an owner,
  // so the button that ends a seat and the one that ends a coven are never side by side.
  describe('the sections', () => {
    it('lists the members page in Contents for a member, who may read members', async () => {
      await renderAs('member');

      const contents = screen.getByRole('region', { name: 'Contents' });
      expect(within(contents).getByRole('link', { name: 'Members' })).toHaveAttribute(
        'href',
        '/coven/fixture-coven/members',
      );
    });

    it('lists the ingredients page in Contents for a viewer, the least role', async () => {
      await renderAs('viewer');

      const contents = screen.getByRole('region', { name: 'Contents' });
      expect(within(contents).getByRole('link', { name: 'Ingredients' })).toHaveAttribute(
        'href',
        '/coven/fixture-coven/ingredients',
      );
    });

    it('lists the grimoire in Contents for a viewer, who reads it', async () => {
      await renderAs('viewer');

      const contents = screen.getByRole('region', { name: 'Contents' });
      const grimoire = within(contents).getByRole('link', { name: 'Grimoire' });
      expect(grimoire).toHaveAttribute('href', '/coven/fixture-coven/grimoire');
      expect(grimoire).toHaveAccessibleDescription(
        'What the coven makes: its spells, and the workings it has recorded.',
      );
    });

    it('lists Ingredients, Grimoire and Members in that order for a member', async () => {
      await renderAs('member');

      const contents = screen.getByRole('region', { name: 'Contents' });
      const links = within(contents).getAllByRole('link');
      expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Ingredients', '/coven/fixture-coven/ingredients'],
        ['Grimoire', '/coven/fixture-coven/grimoire'],
        ['Members', '/coven/fixture-coven/members'],
      ]);
    });

    it('lists no Members for a viewer, who cannot read it', async () => {
      await renderAs('viewer');

      expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    });

    it('keeps Leave in Your Membership and Delete in a section of its own for an owner', async () => {
      await renderAs('owner');

      const membership = screen.getByRole('region', { name: 'Your Membership' });
      expect(within(membership).getByRole('button', { name: 'Leave Coven' })).toBeEnabled();
      expect(within(membership).queryByRole('button', { name: 'Delete Coven' })).toBeNull();
      const owners = screen.getByRole('region', { name: 'Delete Coven' });
      expect(within(owners).getByRole('button', { name: 'Delete Coven' })).toBeEnabled();
    });

    it('shows a viewer no Delete section', async () => {
      await renderAs('viewer');

      expect(screen.queryByRole('region', { name: 'Delete Coven' })).not.toBeInTheDocument();
    });
  });

  // The jump menu (PageNav): an entry per section shown, each landing on a
  // section that exists. A viewer has Contents and Your Membership.
  describe('the jump menu', () => {
    const menu = () => screen.queryByRole('navigation', { name: 'On This Page' });

    it.each<[WorkspaceRole, number]>([
      ['owner', 3],
      ['viewer', 2],
    ])('has an entry for each of a %s’s sections', async (role, count) => {
      await renderAs(role);

      const links = within(menu() as HTMLElement).getAllByRole('link');
      expect(links).toHaveLength(count);
      for (const link of links) {
        const target = document.getElementById(link.getAttribute('href')?.slice(1) ?? '');
        expect(target).toBeInstanceOf(HTMLElement);
        expect(target?.tagName).toBe('SECTION');
      }
    });
  });
});
