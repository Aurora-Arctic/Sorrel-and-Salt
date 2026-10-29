import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardActionsProps } from '@/components/IngredientEntry/types';
import type { StockData } from '@/components/StockDialog/types';
import type {
  AddCupboardEntryMutation,
  MakeItOursMutation,
  RemoveCupboardEntryMutation,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Which cupboard choices a compendium entry offers (M12.23;
// claude-docs/components/ingredient-entry.md): the page decides from the
// member's permissions, the choices follow whether the coven holds the entry, and they are drawn
// as the list cards draw them: a main icon (Annotate on a
// coven's page, Edit in Compendium on the compendium's) and the three dots for what is further,
// Remove among it beside Make It Ours, the bin only where Remove is
// the one choice left.

const ANNOTATE = {
  href: '/coven/fixture-coven/ingredients/fixture?annotate' as Route,
  closeHref: '/coven/fixture-coven/ingredients/fixture' as Route,
  opened: false,
};

const BASE: CupboardActionsProps = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  covenSlug: 'fixture-coven',
  ingredientId: '00000000-0000-4000-8000-000000000002',
  held: false,
  canAdd: true,
  canAnnotate: true,
  canRemove: true,
  canMakeOurs: true,
  annotate: ANNOTATE,
  compendium: {
    name: 'Testwort',
    description: null,
    safetyNotes: null,
    elements: [],
    celestialBodies: [],
    zodiacSigns: [],
    colors: [],
  },
  overrides: {
    label: null,
    description: null,
    safetyNotes: null,
    elements: null,
    celestialBodies: null,
    zodiacSigns: null,
    colors: null,
  },
};

function renderActions(props: Partial<CupboardActionsProps> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <CupboardActions {...BASE} {...props} />
    </QueryClientProvider>,
  );
}

/** The actions under the entry's page heading, as the page draws them. */
const onPage = (props: Partial<CupboardActionsProps> = {}) => (
  <QueryClientProvider client={queryClient}>
    <main>
      <h1>Testwort</h1>
      <CupboardActions {...BASE} {...props} />
    </main>
  </QueryClientProvider>
);
let queryClient = makeQueryClient();
function renderOnPage(props: Partial<CupboardActionsProps> = {}) {
  queryClient = makeQueryClient();
  return render(onPage(props));
}

const button = (name: string) => screen.queryByRole('button', { name });

/** The open More menu's choices, read without pressing. */
function shownChoices(): string[] {
  return within(screen.getByRole('menu', { name: 'More for Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

/** Opens the three dots and reads the choices in it, in order. */
function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
  return shownChoices();
}

/** The bin where Remove is the one choice left, else an item of the three dots' menu. */
function choose(name: string): void {
  if (name === 'Remove' && button('Remove Testwort')) {
    fireEvent.click(screen.getByRole('button', { name: 'Remove Testwort' }));
    return;
  }
  fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

describe('CupboardActions', () => {
  beforeEach(() => router.push.mockClear());

  // The icons at the end of the name's row, the cards' own: on a
  // coven's page the main one is Annotate, a link to the page's `?annotate`, named for the entry
  // (its tip is IconTip's to prove); then the three dots, a menu. No plain Annotate or Edit.
  it('draws Annotate as the main icon, a link named for the entry, then the three dots', async () => {
    renderActions({ held: true });

    const annotate = screen.getByRole('link', { name: 'Annotate Testwort' });
    expect(annotate).toHaveAttribute('href', ANNOTATE.href);
    expect(screen.queryByRole('link', { name: 'Annotate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'More for Testwort' });
    expect(more).toHaveAttribute('aria-haspopup', 'menu');
    await act(async () => {
      fireEvent.click(more);
    });
    expect(shownChoices()).toEqual(['Make It Ours', 'Remove']);
    // Remove is in the menu, so there is no bin beside it.
    expect(button('Remove Testwort')).not.toBeInTheDocument();
  });

  // Adding is the plus's alone: the old Add to Cupboard is gone.
  it('offers no Add without a plus while the coven lacks the entry, though its role may add', () => {
    // Why Add could have shown: the role may add (`canAdd`) and the coven lacks the entry.
    expect(BASE.canAdd && !BASE.held).toBe(true);
    const { container } = renderActions();

    expect(container).toBeEmptyDOMElement();
  });

  // The dots draw the labelled section even though every choice is the coven's (the owner's call,
  // 2026-10-20): the lone Coven section, and no Compendium one for an empty side.
  it('puts Make It Ours and Remove in the three dots, in a Coven section, not Add, once the coven holds it', () => {
    renderActions({ held: true });

    expect(choices()).toEqual(['Make It Ours', 'Remove']);
    const menu = screen.getByRole('menu', { name: 'More for Testwort' });
    expect(within(menu).getByRole('group', { name: 'Coven' })).toContainElement(
      within(menu).getByRole('menuitem', { name: 'Remove' }),
    );
    expect(within(menu).queryByRole('group', { name: 'Compendium' })).not.toBeInTheDocument();
    expect(button('Remove Testwort')).not.toBeInTheDocument();
  });

  // A lone choice is its own icon, so a member who may remove but
  // not make it ours has the bin, and no menu of one.
  it('draws Remove as the bin, with no three dots, where it is the one choice left', () => {
    // Why the dots could have shown: with Make It Ours permitted too they do (the test above).
    expect(BASE.canMakeOurs).toBe(true);
    renderActions({ held: true, canMakeOurs: false });

    expect(button('Remove Testwort')).toBeInTheDocument();
    expect(button('More for Testwort')).not.toBeInTheDocument();
  });

  describe("a curator's Edit in Compendium", () => {
    const edit = {
      href: '/coven/fixture-coven/ingredients/fixture?edit' as Route,
      entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
    } as const;

    it("joins the three dots on a coven's page, in its own section after the coven's, a link to the edit address", () => {
      renderActions({ held: true, edit });

      // Annotate is the main icon here, so the menu holds the other two, in two sections with the
      // viewer's side, the coven's, first.
      expect(screen.getByRole('link', { name: 'Annotate Testwort' })).toBeInTheDocument();
      expect(choices()).toEqual(['Make It Ours', 'Remove', 'Edit in Compendium']);
      const menu = screen.getByRole('menu', { name: 'More for Testwort' });
      expect(within(menu).getByRole('group', { name: 'Coven' })).toContainElement(
        within(menu).getByRole('menuitem', { name: 'Make It Ours' }),
      );
      expect(within(menu).getByRole('group', { name: 'Compendium' })).toContainElement(
        within(menu).getByRole('menuitem', { name: 'Edit in Compendium' }),
      );
      expect(screen.getByRole('menuitem', { name: 'Edit in Compendium' })).toHaveAttribute(
        'href',
        edit.href,
      );
    });

    it("is the main icon where the coven's own has no right behind it, so never hidden in the menu", () => {
      renderActions({ held: true, edit, canAnnotate: false, canMakeOurs: false, canRemove: false });

      const link = screen.getByRole('link', { name: 'Edit in Compendium Testwort' });
      expect(link).toHaveAttribute('href', edit.href);
      expect(screen.queryByRole('button', { name: 'More for Testwort' })).not.toBeInTheDocument();
    });
  });

  it('offers Make It Ours alone, as a menu of one, where it is the one write permitted', () => {
    renderActions({ held: true, canAnnotate: false, canRemove: false });

    expect(choices()).toEqual(['Make It Ours']);
    expect(screen.getByRole('group', { name: 'Coven' })).toBeInTheDocument();
    // No main icon without a right behind it, and no bin.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(button('Remove Testwort')).not.toBeInTheDocument();
  });

  it('draws no Make It Ours without its permission, and so no three dots', () => {
    renderActions({ held: true, canMakeOurs: false });

    expect(screen.getByRole('link', { name: 'Annotate Testwort' })).toBeInTheDocument();
    expect(button('Remove Testwort')).toBeInTheDocument();
    expect(button('More for Testwort')).not.toBeInTheDocument();
  });

  it('draws nothing for a viewer', () => {
    const none = { canAdd: false, canAnnotate: false, canRemove: false, canMakeOurs: false };
    const { container, rerender } = renderActions(none);
    expect(container).toBeEmptyDOMElement();

    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <CupboardActions {...BASE} {...none} held />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('draws no main icon for a viewer who may not annotate', () => {
    renderActions({ held: true, canAnnotate: false });

    expect(screen.queryByRole('link', { name: /^(Annotate|Edit)/ })).not.toBeInTheDocument();
    expect(button('More for Testwort')).toBeInTheDocument();
  });

  it('offers Annotate alone as a link, not a button, where it is the one write permitted', () => {
    renderActions({
      held: true,
      canRemove: false,
      canMakeOurs: false,
      annotate: ANNOTATE,
    });

    expect(screen.getByRole('link', { name: 'Annotate Testwort' })).toHaveAttribute(
      'href',
      ANNOTATE.href,
    );
    expect(button('Annotate Testwort')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('draws no dialog while the address does not ask for it', () => {
    renderActions({ held: true, annotate: ANNOTATE });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the annotate form in a dialog when the address asks for it, and closing goes back to the bare address', async () => {
    router.replace.mockClear();
    renderActions({ held: true, annotate: { ...ANNOTATE, opened: true } });

    const dialog = screen.getByRole('dialog', { name: 'Annotate This Entry' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ANNOTATE.closeHref));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('puts the focus back on Annotate once the address drops ?annotate', async () => {
    const view = renderActions({ held: true, annotate: { ...ANNOTATE, opened: true } });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <CupboardActions {...BASE} held annotate={ANNOTATE} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Annotate Testwort' })).toHaveFocus(),
    );
  });

  it('asks before removing, in a dialog, and removes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Remove');
    const ask = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    expect(within(ask).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button('More for Testwort')).toHaveFocus());
  });

  // The entry's page heading takes the focus once the re-read says the coven no
  // longer holds it: Remove went with its menu, and the control left may be
  // another element (after M12.31's follow-up 5). Until then the
  // confirmation stays, busy, as ConfirmedAction's does.
  it("reads the page again once the entry is removed, and closes onto the page's heading when the re-read drops it", async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: BASE.ingredientId }),
    );
    router.refresh.mockClear();
    const view = renderOnPage({ held: true });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Remov/ }),
    ).toBeDisabled();

    view.rerender(onPage({ held: false }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toHaveFocus();
  });

  it("closes the Annotate dialog's Remove onto the page's heading once the coven no longer holds the entry", async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: BASE.ingredientId }),
    );
    router.replace.mockClear();
    const view = renderOnPage({ held: true, annotate: { ...ANNOTATE, opened: true } });
    const annotating = screen.getByRole('dialog', { name: 'Annotate This Entry' });

    fireEvent.click(within(annotating).getByRole('button', { name: 'More' }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Remove' }));
    const card = within(annotating).getByRole('group', { name: /^Remove Testwort/ });
    press(within(card).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ANNOTATE.closeHref));

    // The address drops ?annotate and the re-read, in one, drops the entry.
    view.rerender(onPage({ held: false, annotate: ANNOTATE }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toHaveFocus();
  });

  it('leads to removedHref once a retired entry is removed, since its page reads nothing then', async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: BASE.ingredientId }),
    );
    router.refresh.mockClear();
    router.replace.mockClear();
    renderActions({ held: true, removedHref: '/coven/fixture-coven/ingredients' as Route });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven/ingredients'),
    );
    // Replaced, not pushed: Back must not return to a page that is gone.
    expect(router.push).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("gives the Ingredients list's heading the focus once a retired entry's Remove has led there", async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: BASE.ingredientId }),
    );
    router.replace.mockClear();
    const view = renderOnPage({
      held: true,
      removedHref: '/coven/fixture-coven/ingredients' as Route,
    });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven/ingredients'),
    );
    // Busy until the list arrives: closed here, it would hand the focus to
    // Edit, which the page swap then takes away with it.
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Remov/ }),
    ).toBeDisabled();

    // The navigation lands: the list's page replaces the entry's in one commit.
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <main>
          <h1>Ingredients</h1>
        </main>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toHaveFocus(),
    );
  });

  it("shows the service's refusal when a jar is still held", async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderActions({ held: true });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // The entry stays held, so the focus goes back to the three dots, not the heading.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button('More for Testwort')).toHaveFocus();
    // The refusal is the dots' callout, which can be brought back by its badge.
    expect(button('Show the error for More for Testwort')).toBeInTheDocument();
  });

  it('anchors a Remove refusal on the bin where Remove is the one choice, so the callout follows it', async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderActions({ held: true, canMakeOurs: false });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button('Remove Testwort')).toHaveFocus();
    expect(button('Show the error for Remove Testwort')).toBeInTheDocument();
  });

  it('asks before making it ours, in a dialog, and changes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Make It Ours');
    const ask = screen.getByRole('dialog', { name: 'Make It Ours' });
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button('More for Testwort')).toHaveFocus());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('makes it ours, pending meanwhile, and goes to the own entry', async () => {
    let answer: () => void = () => {};
    const gate = new Promise<void>((resolve) => (answer = resolve));
    const calls: unknown[] = [];
    const data: MakeItOursMutation = {
      convertCompendiumEntryToLocal: { entry: { id: 'fixture-own' } },
    };
    server.use(
      graphqlLink.mutation('MakeItOurs', async ({ variables }) => {
        calls.push(variables);
        await gate;
        return HttpResponse.json({ data });
      }),
    );
    renderActions({ held: true });

    choose('Make It Ours');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Make It Ours' }));

    const ask = screen.getByRole('dialog', { name: 'Make It Ours' });
    await waitFor(() => expect(within(ask).getByRole('button', { name: 'Cancel' })).toBeDisabled());
    expect(router.push).not.toHaveBeenCalled();
    answer();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/coven/fixture-coven/ingredients/fixture-own'),
    );
    expect(calls).toEqual([{ workspaceId: BASE.workspaceId, ingredientId: BASE.ingredientId }]);
  });

  it("shows the service's refusal and stays on the entry", async () => {
    mockGraphQLError('MakeItOurs', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['label'], message: 'Fixture refusal: an own entry has the name' }],
    });
    renderActions({ held: true });

    choose('Make It Ours');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Make It Ours' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(button('More for Testwort')).toBeInTheDocument();
    expect(button('Show the error for More for Testwort')).toBeInTheDocument();
  });

  it('shares one callout between the writes: a later refusal replaces the first, and the next press clears it', async () => {
    mockGraphQLError('MakeItOurs', {
      code: 'FORBIDDEN',
      message: 'Fixture refusal: the name is taken',
    });
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Fixture refusal: a jar is held',
    });
    renderActions({ held: true });

    choose('Make It Ours');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Make It Ours' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('a jar is held'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Show the error for / })).toHaveLength(1);

    // Opening a question again forgets the last refusal.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    choose('Make It Ours');
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /^Show the error for / }),
      ).not.toBeInTheDocument(),
    );
  });

  // The plus beside the pencil on a coven's page too: the page's
  // `plus` names every coven the viewer may add in and which of them hold the entry.
  // Edit Stock on the coven's own page: first in the dots,
  // this coven's dialog at once with no coven to choose, for a coven that holds the entry and
  // where the role may update stock. The page hands over the stock only then.
  describe('Edit Stock', () => {
    const FLOWER = '00000000-0000-4000-8000-0000000000f1';
    const STOCK: StockData = {
      forms: [{ variantId: FLOWER, label: 'Flower' }],
      jars: [
        {
          id: '00000000-0000-4000-8000-000000000991',
          variantId: FLOWER,
          quantity: 50,
          unit: 'g',
          threshold: null,
        },
      ],
    };

    it('goes first in the dots once the coven holds the entry and the page gave it the stock', () => {
      renderActions({ held: true, stock: STOCK });

      expect(choices()).toEqual(['Edit Stock', 'Make It Ours', 'Remove']);
    });

    it('is not offered without the stock, which the page withholds from a role that may not update it', () => {
      // Why it could have been: the coven holds the entry and the other choices show.
      renderActions({ held: true });

      expect(choices()).toEqual(['Make It Ours', 'Remove']);
    });

    it('is not offered while the coven lacks the entry, whatever stock came', () => {
      renderActions({ held: false, stock: STOCK });

      // With nothing else to offer the dots are not even drawn.
      expect(screen.queryByRole('button', { name: 'More for Testwort' })).toBeNull();
      expect(screen.queryByRole('menuitem', { name: 'Edit Stock' })).toBeNull();
    });

    it("opens this coven's dialog at once, with no coven to choose", async () => {
      renderActions({ held: true, stock: STOCK });
      fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
      fireEvent.click(
        within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Edit Stock' }),
      );

      const dialog = await screen.findByRole('dialog', { name: 'Edit Stock, Testwort' });
      expect(within(dialog).getByRole('button', { name: /^Flower\b.*50 g/ })).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Coven' })).toBeNull();
    });
  });

  describe('the plus', () => {
    const OTHER = { id: '00000000-0000-4000-8000-000000000009', name: 'Other Coven' };
    const HERE = { id: BASE.workspaceId, name: 'Fixture Coven' };

    it('stands before the icons and takes Add out of them, a menu of the covens with this one disabled once it holds the entry', async () => {
      const calls: unknown[] = [];
      mockGraphQLMutation<AddCupboardEntryMutation, Record<string, unknown>>(
        'AddCupboardEntry',
        (variables) => {
          calls.push(variables);
          return { addCupboardEntry: { id: 'fixture' } };
        },
      );
      renderActions({
        held: true,
        plus: { workspaceId: HERE.id, covens: [HERE, OTHER], heldIn: [HERE.id] },
      });

      const plus = screen.getByRole('button', { name: /^Add to My Ingredients: / });
      const annotate = screen.getByRole('link', { name: 'Annotate Testwort' });
      expect(
        plus.compareDocumentPosition(annotate) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(choices()).toEqual(['Make It Ours', 'Remove']);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      fireEvent.click(plus);
      const [here, other] = within(
        screen.getByRole('menu', { name: /^Add to My Ingredients: / }),
      ).getAllByRole('menuitem');
      expect(here).toHaveAccessibleName(`${HERE.name}, in its cupboard`);
      expect(here).toHaveAttribute('aria-disabled', 'true');
      expect(other).toHaveAccessibleName(OTHER.name);
      expect(other).not.toHaveAttribute('aria-disabled');

      fireEvent.click(other!);
      await waitFor(() => expect(router.refresh).toHaveBeenCalled());
      expect(calls).toEqual([{ workspaceId: OTHER.id, ingredientId: BASE.ingredientId }]);
    });

    it('is a plain button, no menu, while this coven, the only one that may add, lacks the entry', () => {
      renderActions({ plus: { workspaceId: HERE.id, covens: [HERE], heldIn: [] } });

      expect(
        screen.queryByRole('button', { name: /^Add to My Ingredients: / }),
      ).not.toHaveAttribute('aria-haspopup');
    });

    it("gives way to the card's check once every coven that may add holds the entry", () => {
      renderActions({
        held: true,
        plus: { workspaceId: HERE.id, covens: [HERE], heldIn: [HERE.id] },
      });

      expect(
        screen.queryByRole('button', { name: /^Add to My Ingredients: / }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^In Every Cupboard: / })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Annotate Testwort' })).toBeInTheDocument();
    });

    it('draws neither plus nor check without one', () => {
      // Why one could have shown: the same props with a `plus` draw it (above).
      renderActions({ held: true });

      expect(
        screen.queryByRole('button', { name: /^Add to My Ingredients: / }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
    });
  });
});
