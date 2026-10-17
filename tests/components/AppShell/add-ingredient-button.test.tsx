import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

const pathname = vi.fn<() => string>();
const push = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => pathname(), useRouter: () => ({ push }) }));
// The form is Lane B's and tested on its own: a stub that shows which coven it
// writes to and saves on request, in either way.
vi.mock('@/components/IngredientForm', () => ({
  default: ({
    workspaceId,
    onSaved,
  }: {
    workspaceId: string | null;
    onSaved: (
      saved: { name: string; slug: string; stock?: unknown[] },
      next: 'open' | 'another',
    ) => void;
  }) => (
    <form aria-label="Ingredient Form" data-workspace={workspaceId}>
      <button type="button" onClick={() => onSaved({ name: 'Testwort', slug: 'testwort' }, 'open')}>
        Save Ingredient
      </button>
      <button
        type="button"
        onClick={() =>
          onSaved(
            {
              name: 'Testwort',
              slug: 'testwort',
              stock: [
                { quantityOnHand: 5, unit: 'g', variant: { form: 'Dried' } },
                { quantityOnHand: null, unit: null, variant: { form: 'Fresh' } },
              ],
            },
            'open',
          )
        }
      >
        Save With Jars
      </button>
      <button
        type="button"
        onClick={() => onSaved({ name: 'Testwort', slug: 'testwort' }, 'another')}
      >
        Save & Add Another
      </button>
    </form>
  ),
}));

const { default: AddIngredientButton } =
  await import('@/components/AppShell/add-ingredient-button');

// The shell's one global action (MB.7, M8.16): where it leads follows the
// area the viewer is in.

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
};
const ADMIN: ShellViewer = { ...MEMBER, canCurate: true };
const coven = (slug: string, canWrite = true): ShellWorkspace => ({
  id: `id-${slug}`,
  slug,
  name: slug === 'fixture-coven' ? 'Fixture Coven' : 'Testwort Circle',
  canReadMembers: true,
  canWrite,
});
const FIXTURE = coven('fixture-coven');
const TESTWORT = coven('testwort-circle');
const VIEW_ONLY = coven('testwort-circle', false);

const draw = (viewer: ShellViewer, workspaces: ShellWorkspace[]) =>
  render(<AddIngredientButton viewer={viewer} workspaces={workspaces} />);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }));
const target = () => screen.getByRole('form', { name: 'Ingredient Form' }).dataset.workspace;

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  push.mockClear();
});

describe('AddIngredientButton', () => {
  it('targets the coven the address names', () => {
    pathname.mockReturnValue('/coven/testwort-circle/ingredients');
    draw(MEMBER, [FIXTURE, TESTWORT]);
    open();

    expect(target()).toBe('id-testwort-circle');
  });

  it('targets the only writable coven when the address names none', () => {
    pathname.mockReturnValue('/account');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(target()).toBe('id-fixture-coven');
  });

  it('falls back to the writable coven when the address names a view-only one', () => {
    pathname.mockReturnValue('/coven/testwort-circle');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(target()).toBe('id-fixture-coven');
  });

  it('is a plain button, with no menu, for one destination', () => {
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);

    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose Where to Add' })).toBeNull();
  });

  describe('as a split button', () => {
    const chevron = () => screen.getByRole('button', { name: 'Choose Where to Add' });
    const menuOf = () => screen.getByRole('menu');

    it('lists the compendium then the coven for a curator, and opens the coven chosen', () => {
      pathname.mockReturnValue('/admin/users');
      draw(ADMIN, [FIXTURE]);
      expect(chevron()).toHaveAttribute('aria-haspopup', 'menu');
      expect(chevron()).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(chevron());
      expect(chevron()).toHaveAttribute('aria-expanded', 'true');
      const items = within(menuOf()).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual(['Compendium', 'Fixture Coven']);

      fireEvent.click(items[1]!);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(
        screen.getByRole('dialog', { name: 'Add Ingredient to Fixture Coven' }),
      ).toBeInTheDocument();
      expect(target()).toBe('id-fixture-coven');
      expect(push).not.toHaveBeenCalled();
    });

    it('sends the compendium choice to its add dialog', () => {
      draw(ADMIN, [FIXTURE]);
      fireEvent.click(chevron());
      fireEvent.click(within(menuOf()).getByRole('menuitem', { name: 'Compendium' }));

      expect(push).toHaveBeenCalledWith('/admin/compendium?new');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens the compendium from the main part on an admin page', () => {
      pathname.mockReturnValue('/admin/users');
      draw(ADMIN, [FIXTURE]);
      open();

      expect(push).toHaveBeenCalledWith('/admin/compendium?new');
    });

    it('opens the coven the address names from the main part, a curator off the admin pages', () => {
      pathname.mockReturnValue('/coven/testwort-circle');
      draw(ADMIN, [FIXTURE, TESTWORT]);
      open();

      expect(push).not.toHaveBeenCalled();
      expect(target()).toBe('id-testwort-circle');
    });

    it('lists both covens and no compendium for a member of two', () => {
      draw(MEMBER, [FIXTURE, TESTWORT, coven('viewed-circle', false)]);
      fireEvent.click(chevron());

      expect(
        within(menuOf())
          .getAllByRole('menuitem')
          .map((item) => item.textContent),
      ).toEqual(['Fixture Coven', 'Testwort Circle']);
    });

    it('roves with the arrow keys', () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());
      const [first, second] = within(menuOf()).getAllByRole('menuitem');
      expect(first).toHaveFocus();

      fireEvent.keyDown(first!, { key: 'ArrowDown' });
      expect(second).toHaveFocus();
      fireEvent.keyDown(second!, { key: 'ArrowDown' });
      expect(first).toHaveFocus();
      fireEvent.keyDown(first!, { key: 'ArrowUp' });
      expect(second).toHaveFocus();
    });

    it('closes on Escape, the focus back on the chevron', () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());
      fireEvent.keyDown(within(menuOf()).getAllByRole('menuitem')[0]!, { key: 'Escape' });

      expect(screen.queryByRole('menu')).toBeNull();
      expect(chevron()).toHaveFocus();
    });

    it('closes on a press outside', () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());
      fireEvent.pointerDown(document.body);

      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('has no accessibility violations with the menu open', async () => {
      const { container } = draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());

      const { violations } = await axe.run(container);
      expect(violations).toEqual([]);
    });
  });

  it('renders nothing when no coven can be written to', () => {
    const { container } = draw(MEMBER, [VIEW_ONLY]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unverified viewer', () => {
    const { container } = draw({ ...MEMBER, verified: false }, [FIXTURE]);

    expect(container).toBeEmptyDOMElement();
  });

  it('closes the dialog after Save Ingredient and leaves a status behind', async () => {
    draw(MEMBER, [FIXTURE]);
    open();
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('names the jars that came with the new entry in its status', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save With Jars' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent(/Dried.*Fresh/);
  });

  it('keeps the dialog open after Save & Add Another', () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
