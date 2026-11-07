import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer, ShellWorkspace } from '@/lib/types';

const pathname = vi.fn<() => string>();
// A push moves the address as the router's would, so a save's navigation closes the dialog.
const push = vi.fn((href: string) => {
  window.history.pushState(null, '', href);
  pathname.mockReturnValue(new URL(href, window.location.origin).pathname);
});
// `?new` moves through the history API, which Next's router follows and the test follows by drawing again (`sync`).
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push }),
}));
vi.mock('@/components/IngredientForm', () => ({
  default: ({
    workspaceId,
    onSaved,
    onCancel,
    duplicateHref,
    entryHref,
  }: {
    onCancel?: () => void;
    workspaceId: string | null;
    duplicateHref: (match: { id: string }) => string;
    entryHref: (entry: { slug: string; isGlobal: boolean }) => string | undefined;
    onSaved: (
      saved: { id: string; name: string; slug: string; stock?: unknown[] },
      next: 'open' | 'another',
    ) => void;
  }) => (
    <form aria-label="Ingredient Form" data-workspace={workspaceId}>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
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

const MEMBER: ShellViewer = {
  name: 'Fixture Member',
  canCurate: false,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
  assignedSupport: 0,
  waitingSupport: 0,
};
const ADMIN: ShellViewer = { ...MEMBER, canCurate: true };
const coven = (slug: string, canWrite = true): ShellWorkspace => ({
  id: `id-${slug}`,
  slug,
  name: slug === 'fixture-coven' ? 'Fixture Coven' : 'Testwort Circle',
  canReadMembers: true,
  canInvite: false,
  canWrite,
  paused: null,
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
const closed = () =>
  waitFor(() => {
    sync();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
/** The form, once its code has arrived in the open dialog. */
const formArrived = () => screen.findByRole('form', { name: 'Ingredient Form' });
const target = async () => (await formArrived()).dataset.workspace;

beforeEach(() => {
  pathname.mockReturnValue('/coven/fixture-coven');
  window.history.replaceState(null, '', '/coven/fixture-coven');
  push.mockClear();
});

describe('AddIngredientButton', () => {
  it('targets the coven the address names', async () => {
    pathname.mockReturnValue('/coven/testwort-circle/ingredients');
    draw(MEMBER, [FIXTURE, TESTWORT]);
    open();

    expect(await target()).toBe('id-testwort-circle');
  });

  it('targets the only writable coven when the address names none', async () => {
    pathname.mockReturnValue('/account');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(await target()).toBe('id-fixture-coven');
  });

  it('falls back to the writable coven when the address names a view-only one', async () => {
    pathname.mockReturnValue('/coven/testwort-circle');
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);
    open();

    expect(await target()).toBe('id-fixture-coven');
  });

  it('is a plain button, with no menu, for one destination', () => {
    draw(MEMBER, [FIXTURE, VIEW_ONLY]);

    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose Where to Add' })).toBeNull();
  });

  describe('as a split button', () => {
    const chevron = () => screen.getByRole('button', { name: 'Choose Where to Add' });
    const menuOf = () => screen.getByRole('menu');

    it('lists the compendium then the coven for a curator, and opens a coven chosen on an admin page in place', async () => {
      pathname.mockReturnValue('/keepers/users');
      draw(ADMIN, [FIXTURE]);
      expect(chevron()).toHaveAttribute('aria-haspopup', 'menu');
      expect(chevron()).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(chevron());
      expect(chevron()).toHaveAttribute('aria-expanded', 'true');
      const items = within(menuOf()).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual(['to Compendium', 'to Fixture Coven']);

      // The coven's value names it, so the admin page's own `?new` cannot take it.
      press(items[1]!);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(window.location.search).toBe('?new=ingredient-coven-fixture-coven');
      expect(await target()).toBe('id-fixture-coven');
      expect(push).not.toHaveBeenCalled();
    });

    it('opens the coven chosen off the admin pages, naming it on the address', async () => {
      draw(MEMBER, [FIXTURE, TESTWORT]);
      fireEvent.click(chevron());
      press(within(menuOf()).getByRole('menuitem', { name: 'to Testwort Circle' }));

      expect(window.location.search).toBe('?new=ingredient-coven-testwort-circle');
      expect(
        screen.getByRole('dialog', { name: 'Add Ingredient to Testwort Circle' }),
      ).toBeInTheDocument();
      expect(await target()).toBe('id-testwort-circle');
      expect(push).not.toHaveBeenCalled();
    });

    it('sends the compendium choice to its add dialog', () => {
      draw(ADMIN, [FIXTURE]);
      fireEvent.click(chevron());
      press(within(menuOf()).getByRole('menuitem', { name: 'to Compendium' }));

      expect(push).toHaveBeenCalledWith('/curator/compendium?new=ingredient-compendium');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it.each(['/curator/categories', '/keepers/users'])(
      'opens the compendium from the main part on %s, a curator or keepers page',
      (path) => {
        pathname.mockReturnValue(path);
        draw(ADMIN, [FIXTURE]);
        open();

        expect(push).toHaveBeenCalledWith('/curator/compendium?new=ingredient-compendium');
      },
    );

    it('opens the coven the address names from the main part, a curator off the admin pages', async () => {
      pathname.mockReturnValue('/coven/testwort-circle');
      draw(ADMIN, [FIXTURE, TESTWORT]);
      open();

      expect(push).not.toHaveBeenCalled();
      expect(await target()).toBe('id-testwort-circle');
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
        '/keepers/users',
        [
          ['Compendium', ['to Compendium']],
          ['Coven', ['to Fixture Coven']],
        ],
      ],
      [
        '/curator/categories',
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
  });

  describe('by its address', () => {
    it('writes ?new=ingredient-coven-<slug> onto the address when pressed, over the parameters already there', async () => {
      window.history.replaceState(null, '', '/coven/fixture-coven?query=rose');
      draw(MEMBER, [FIXTURE]);
      open();

      expect(window.location.search).toBe('?query=rose&new=ingredient-coven-fixture-coven');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await formArrived();
    });

    it('opens from the address alone, for the default coven and for a named one', async () => {
      window.history.replaceState(null, '', '/coven/fixture-coven?new=ingredient');
      let view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(await target()).toBe('id-fixture-coven');
      view.unmount();

      // A bare `?new` is read as `?new=ingredient`, so a link saved before the value existed still opens the dialog.
      window.history.replaceState(null, '', '/coven/fixture-coven?new');
      view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(await target()).toBe('id-fixture-coven');
      view.unmount();

      window.history.replaceState(
        null,
        '',
        '/coven/fixture-coven?new=ingredient-coven-testwort-circle',
      );
      view = draw(MEMBER, [FIXTURE, TESTWORT]);
      expect(await target()).toBe('id-testwort-circle');
      view.unmount();

      pathname.mockReturnValue('/keepers/users');
      window.history.replaceState(null, '', '/keepers/users?new=ingredient-coven-fixture-coven');
      view = draw(ADMIN, [FIXTURE, TESTWORT]);
      expect(await target()).toBe('id-fixture-coven');
      view.unmount();

      window.history.replaceState(null, '', '/keepers/users?new=ingredient');
      draw(ADMIN, [FIXTURE, TESTWORT]);
      expect(await target()).toBe('id-fixture-coven');
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

      pathname.mockReturnValue('/keepers/users');
      window.history.replaceState(null, '', '/keepers/users?new');
      let admin = draw(ADMIN, [FIXTURE]);
      expect(screen.queryByRole('dialog')).toBeNull();
      admin.unmount();

      pathname.mockReturnValue('/curator/compendium');
      window.history.replaceState(null, '', '/curator/compendium?new=ingredient-compendium');
      admin = draw(ADMIN, [FIXTURE]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens nothing for a spell’s ?new, the grimoire’s New Spell, on any page', () => {
      // The same writer and coven that open the dialog under ?new=ingredient, so only the value keeps it shut.
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

      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      await closed();

      expect(window.location.search).toBe('?query=rose');
      expect(screen.getByRole('button', { name: 'Add Ingredient' })).toHaveFocus();
    });
  });

  it('has no Cancel button, and closes from its close button', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Cancel' })).toBeNull();
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await closed();
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
    await formArrived();
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Save Ingredient' }));

    await closed();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('opens the saved ingredient’s page in the coven after Save Ingredient', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'Save Ingredient' }));

    await closed();
    expect(push).toHaveBeenCalledExactlyOnceWith(`/coven/${FIXTURE.slug}/ingredients/saved-id`);
    // The address is the push's to move: a replace under it would hold the page where it was.
    expect(window.location.pathname).toBe(`/coven/${FIXTURE.slug}/ingredients/saved-id`);
  });

  it('links a near match to the coven’s page for it, and a compendium substitute to its public page', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    expect(await screen.findByRole('link', { name: 'Near Match' })).toHaveAttribute(
      'href',
      `/coven/${FIXTURE.slug}/ingredients/near-id`,
    );
    expect(await screen.findByRole('link', { name: 'Compendium Substitute' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort',
    );
    expect(screen.queryByRole('link', { name: 'Own Substitute' })).toBeNull();
  });

  it('names the jars that came with the new entry in its status', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'Save With Jars' }));

    await closed();
    expect(screen.getByRole('status')).toHaveTextContent(/Dried.*Fresh/);
  });

  it('keeps the dialog open after Save & Add Another', async () => {
    draw(MEMBER, [FIXTURE]);
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'Save & Add Another' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
