import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

const pathname = vi.fn<() => string>();
// A push moves the address as the router's would, so a save's navigation
// to the new entry's page closes the dialog here as it does in the app.
const push = vi.fn((href: string) => {
  window.history.pushState(null, '', href);
  pathname.mockReturnValue(new URL(href, window.location.origin).pathname);
});
// The address is the window's: the dialog is opened and closed by `?new`
// through the history API, which Next's router follows in the app and the
// test follows by drawing again (`sync`).
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push }),
}));
// The form is Lane B's and tested on its own: a stub that shows which coven it
// writes to and saves on request, in either way.
vi.mock('@/components/IngredientForm', () => ({
  default: ({
    workspaceId,
    onSaved,
    duplicateHref,
    entryHref,
  }: {
    workspaceId: string | null;
    duplicateHref: (match: { id: string }) => string;
    entryHref: (entry: { slug: string; isGlobal: boolean }) => string | undefined;
    onSaved: (
      saved: { id: string; name: string; slug: string; stock?: unknown[] },
      next: 'open' | 'another',
    ) => void;
  }) => (
    <form aria-label="Ingredient Form" data-workspace={workspaceId}>
      <a href={duplicateHref({ id: 'near-id' })}>Near Match</a>
      <a href={entryHref({ slug: 'testwort', isGlobal: true })}>Compendium Substitute</a>
      <a href={entryHref({ slug: 'mine', isGlobal: false })}>Own Substitute</a>
      <button
        type="button"
        onClick={() => onSaved({ id: 'saved-id', name: 'Testwort', slug: 'testwort' }, 'open')}
      >
        Save Ingredient
      </button>
      <button
        type="button"
        onClick={() =>
          onSaved(
            {
              id: 'saved-id',
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
        onClick={() => onSaved({ id: 'saved-id', name: 'Testwort', slug: 'testwort' }, 'another')}
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
  canInvite: false,
  canWrite,
});
const FIXTURE = coven('fixture-coven');
const TESTWORT = coven('testwort-circle');
const VIEW_ONLY = coven('testwort-circle', false);

let sync = () => {};
const draw = (viewer: ShellViewer, workspaces: ShellWorkspace[]) => {
  const view = render(<AddIngredientButton viewer={viewer} workspaces={workspaces} />);
  sync = () => view.rerender(<AddIngredientButton viewer={viewer} workspaces={workspaces} />);
  return view;
};
const press = (element: HTMLElement) => {
  fireEvent.click(element);
  sync();
};
const open = () => press(screen.getByRole('button', { name: 'Add Ingredient' }));
/** The dialog gone, once its close has moved the address on. */
const closed = () =>
  waitFor(() => {
    sync();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
const target = () => screen.getByRole('form', { name: 'Ingredient Form' }).dataset.workspace;

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  window.history.replaceState(null, '', '/coven/fixture-coven');
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

    it('lists the compendium then the coven for a curator, and opens a coven chosen on an admin page in place', () => {
      pathname.mockReturnValue('/admin/users');
      draw(ADMIN, [FIXTURE]);
      expect(chevron()).toHaveAttribute('aria-haspopup', 'menu');
      expect(chevron()).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(chevron());
      expect(chevron()).toHaveAttribute('aria-expanded', 'true');
      const items = within(menuOf()).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual(['to Compendium', 'to Fixture Coven']);

      // The coven's value names it, so the admin page's own `?new` cannot take it,
      // and the page stays where it is.
      press(items[1]!);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(window.location.search).toBe('?new=ingredient-coven-fixture-coven');
      expect(target()).toBe('id-fixture-coven');
      expect(push).not.toHaveBeenCalled();
    });

    it('opens the coven chosen off the admin pages, naming it on the address', () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());
      press(within(menuOf()).getByRole('menuitem', { name: 'to Testwort Circle' }));

      expect(window.location.search).toBe('?new=ingredient-coven-testwort-circle');
      expect(
        screen.getByRole('dialog', { name: 'Add Ingredient to Testwort Circle' }),
      ).toBeInTheDocument();
      expect(target()).toBe('id-testwort-circle');
      expect(push).not.toHaveBeenCalled();
    });

    it('sends the compendium choice to its add dialog', () => {
      draw(ADMIN, [FIXTURE]);
      fireEvent.click(chevron());
      press(within(menuOf()).getByRole('menuitem', { name: 'to Compendium' }));

      expect(push).toHaveBeenCalledWith('/admin/compendium?new=ingredient-compendium');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens the compendium from the main part on an admin page', () => {
      pathname.mockReturnValue('/admin/users');
      draw(ADMIN, [FIXTURE]);
      open();

      expect(push).toHaveBeenCalledWith('/admin/compendium?new=ingredient-compendium');
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
      ).toEqual(['to Fixture Coven', 'to Testwort Circle']);
    });

    // Where the viewer may add to the compendium and to a coven the places are two named groups,
    // the side they are on first (the owner's call, 2026-10-20).
    const groups = () =>
      within(menuOf())
        .getAllByRole('group')
        .map((group) => [
          group.getAttribute('aria-labelledby') &&
            document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent,
          within(group)
            .getAllByRole('menuitem')
            .map((item) => item.textContent),
        ]);

    it.each([
      [
        '/compendium',
        [
          ['Compendium', ['to Compendium']],
          ['Coven', ['to Fixture Coven']],
        ],
      ],
      [
        '/admin/users',
        [
          ['Compendium', ['to Compendium']],
          ['Coven', ['to Fixture Coven']],
        ],
      ],
      [
        '/coven/fixture-coven',
        [
          ['Coven', ['to Fixture Coven']],
          ['Compendium', ['to Compendium']],
        ],
      ],
    ] as const)(
      'groups a curator’s places, the side they are on first, on %s',
      (path, expected) => {
        pathname.mockReturnValue(path);
        draw(ADMIN, [FIXTURE]);
        fireEvent.click(chevron());

        expect(groups()).toEqual(expected);
        expect(within(menuOf()).getAllByRole('separator')).toHaveLength(1);
      },
    );

    it('draws a plain list, with no group, where there is one kind of place', () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());

      // Why it could have grouped: the menu is open with several places in it.
      expect(within(menuOf()).getAllByRole('menuitem')).toHaveLength(2);
      expect(within(menuOf()).queryByRole('group')).toBeNull();
      expect(within(menuOf()).queryByRole('separator')).toBeNull();
    });

    it('has no accessibility violations with the menu open', async () => {
      const { container } = draw(MEMBER, [FIXTURE, TESTWORT]);
      // Async, so the menu's placement (Floating UI) settles inside act.
      await act(async () => {
        fireEvent.click(chevron());
      });

      const { violations } = await axe.run(container);
      expect(violations).toEqual([]);
    });
  });

  describe('by its address', () => {
    it('writes ?new=ingredient-coven-<slug> onto the address when pressed, over the parameters already there', () => {
      window.history.replaceState(null, '', '/coven/fixture-coven?query=rose');
      draw(MEMBER, [FIXTURE]);
      open();

      expect(window.location.search).toBe('?query=rose&new=ingredient-coven-fixture-coven');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens from the address alone, for the default coven and for a named one', () => {
      window.history.replaceState(null, '', '/coven/fixture-coven?new=ingredient');
      let view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(target()).toBe('id-fixture-coven');
      view.unmount();

      // A bare `?new` is read as `?new=ingredient`, so a link saved before the value
      // existed still opens the default coven's dialog.
      window.history.replaceState(null, '', '/coven/fixture-coven?new');
      view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(target()).toBe('id-fixture-coven');
      view.unmount();

      window.history.replaceState(
        null,
        '',
        '/coven/fixture-coven?new=ingredient-coven-testwort-circle',
      );
      view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(target()).toBe('id-testwort-circle');
      view.unmount();

      // On an admin page too, where a bare `?new` is the page's own.
      pathname.mockReturnValue('/admin/users');
      window.history.replaceState(null, '', '/admin/users?new=ingredient-coven-fixture-coven');
      view = draw(ADMIN, [FIXTURE, TESTWORT]);
      expect(target()).toBe('id-fixture-coven');
      view.unmount();

      window.history.replaceState(null, '', '/admin/users?new=ingredient');
      draw(ADMIN, [FIXTURE, TESTWORT]);
      expect(target()).toBe('id-fixture-coven');
    });

    it('opens nothing for a coven the viewer cannot write to, or for an admin page’s own ?new', () => {
      window.history.replaceState(
        null,
        '',
        '/coven/fixture-coven?new=ingredient-coven-testwort-circle',
      );
      const view = draw(MEMBER, [FIXTURE, VIEW_ONLY]);
      expect(screen.queryByRole('dialog')).toBeNull();
      view.unmount();

      pathname.mockReturnValue('/admin/users');
      window.history.replaceState(null, '', '/admin/users?new');
      let admin = draw(ADMIN, [FIXTURE]);
      expect(screen.queryByRole('dialog')).toBeNull();
      admin.unmount();

      pathname.mockReturnValue('/admin/compendium');
      window.history.replaceState(null, '', '/admin/compendium?new=ingredient-compendium');
      admin = draw(ADMIN, [FIXTURE]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens nothing for a spell’s ?new, the grimoire’s New Spell, on any page', () => {
      // The same writer and coven that open the dialog under ?new=ingredient, so only the
      // value keeps it shut.
      pathname.mockReturnValue('/coven/fixture-coven/ingredients');
      for (const value of ['spell', 'spell-fixture-coven']) {
        window.history.replaceState(null, '', `/coven/fixture-coven/ingredients?new=${value}`);
        const view = draw(MEMBER, [FIXTURE]);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(window.location.search).toBe(`?new=${value}`);
        view.unmount();
      }
    });

    it('drops ?new from the address on close, keeping the rest, and the focus returns to the button', async () => {
      window.history.replaceState(null, '', '/coven/fixture-coven?query=rose');
      draw(MEMBER, [FIXTURE]);
      open();

      // Escape, as the dialog element reports it.
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      await closed();

      expect(window.location.search).toBe('?query=rose');
      expect(screen.getByRole('button', { name: 'Add Ingredient' })).toHaveFocus();
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

    await closed();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('opens the saved ingredient’s page in the coven after Save Ingredient', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

    await closed();
    expect(push).toHaveBeenCalledExactlyOnceWith(`/coven/${FIXTURE.slug}/ingredients/saved-id`);
    // The address is the push's to move: a replace under it would hold the page where it was.
    expect(window.location.pathname).toBe(`/coven/${FIXTURE.slug}/ingredients/saved-id`);
  });

  it('links a near match to the coven’s page for it, and a compendium substitute to its public page', () => {
    draw(MEMBER, [FIXTURE]);
    open();

    expect(screen.getByRole('link', { name: 'Near Match' })).toHaveAttribute(
      'href',
      `/coven/${FIXTURE.slug}/ingredients/near-id`,
    );
    expect(screen.getByRole('link', { name: 'Compendium Substitute' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort',
    );
    expect(screen.queryByRole('link', { name: 'Own Substitute' })).toBeNull();
  });

  it('names the jars that came with the new entry in its status', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save With Jars' }));

    await closed();
    expect(screen.getByRole('status')).toHaveTextContent(/Dried.*Fresh/);
  });

  it('keeps the dialog open after Save & Add Another', () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
