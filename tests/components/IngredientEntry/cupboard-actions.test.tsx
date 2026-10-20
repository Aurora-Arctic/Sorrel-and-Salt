import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardActionsProps } from '@/components/IngredientEntry/types';
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

// Which cupboard choices a compendium entry offers (M12.17, M12.23;
// claude-docs/components/ingredient-entry.md): the page decides from the
// member's permissions, the choices follow whether the coven holds the entry,
// and two or more share one Edit menu while one alone is a plain button.

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

/** The Edit menu's choices, in order, after opening it. */
/** The open Edit menu's choices, read without pressing. */
function shownChoices(): string[] {
  return within(screen.getByRole('menu', { name: 'Edit Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Testwort' }));
  const items = within(screen.getByRole('menu', { name: 'Edit Testwort' })).getAllByRole(
    'menuitem',
  );
  return items.map((item) => item.textContent ?? '');
}

/** Opens the Edit menu and chooses one of its items. */
function choose(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Testwort' }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

describe('CupboardActions', () => {
  beforeEach(() => router.push.mockClear());

  // The pencil at the end of the name's row (the owner's call, 2026-10-20): MenuButton's icon
  // form, named for the entry as the modal's pencil is, with the Edit tip and no word of its own.
  it('is the pencil, a menu button named Edit and the entry, with the Edit tip, and no plain Edit', async () => {
    renderActions({ held: true });

    const pencil = screen.getByRole('button', { name: 'Edit Testwort' });
    expect(pencil).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(pencil);
    // After the 300ms a hover waits for (IconTip).
    expect(await screen.findByRole('tooltip', { hidden: true })).toHaveTextContent('Edit');
    fireEvent.mouseLeave(pencil);
    // Opening the menu shuts the tip from IconTip's MutationObserver, a step after the
    // press: inside an async act, so that update is awaited rather than left outside it.
    await act(async () => {
      fireEvent.click(pencil);
    });
    expect(shownChoices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
  });

  it('offers Add to Cupboard alone, as a plain button, while the coven does not hold the entry', () => {
    renderActions();

    expect(button('Add to Cupboard')).toBeInTheDocument();
    expect(button('Edit Testwort')).not.toBeInTheDocument();
  });

  it('offers Annotate, Make It Ours and Remove, not Add, in the Edit menu once the coven holds it', () => {
    renderActions({ held: true });

    expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
  });

  it("puts Add to Cupboard first, then a curator's Edit Compendium Entry, a link to the page's edit address", () => {
    renderActions({
      edit: {
        href: '/coven/fixture-coven/ingredients/fixture?edit' as Route,
        entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
      },
    });

    expect(choices()).toEqual(['Add to Cupboard', 'Edit Compendium Entry']);
    expect(screen.getByRole('menuitem', { name: 'Edit Compendium Entry' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients/fixture?edit',
    );
  });

  it('offers Make It Ours alone, as a plain button, where it is the one write permitted', () => {
    renderActions({ held: true, canAnnotate: false, canRemove: false });

    expect(button('Make It Ours')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('draws no Make It Ours without its permission', () => {
    renderActions({ held: true, canMakeOurs: false });

    expect(choices()).toEqual(['Annotate', 'Remove']);
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

  it('adds the entry and reads the page again', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation<AddCupboardEntryMutation, Record<string, unknown>>(
      'AddCupboardEntry',
      (variables) => {
        calls.push(variables);
        return { addCupboardEntry: { id: 'fixture' } };
      },
    );
    renderActions();

    press('Add to Cupboard');

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ workspaceId: BASE.workspaceId, ingredientId: BASE.ingredientId }]);
  });

  it("offers Annotate as a link to the page's ?annotate address", () => {
    renderActions({ held: true, annotate: ANNOTATE });

    choices();
    expect(screen.getByRole('menuitem', { name: 'Annotate' })).toHaveAttribute(
      'href',
      ANNOTATE.href,
    );
  });

  it('offers Annotate alone as a link, not a button, where it is the one write permitted', () => {
    renderActions({
      held: true,
      canRemove: false,
      canMakeOurs: false,
      annotate: ANNOTATE,
    });

    expect(screen.getByRole('link', { name: 'Annotate' })).toHaveAttribute('href', ANNOTATE.href);
    expect(button('Annotate')).not.toBeInTheDocument();
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

  it('puts the focus back on Edit once the address drops ?annotate', async () => {
    const view = renderActions({ held: true, annotate: { ...ANNOTATE, opened: true } });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <CupboardActions {...BASE} held annotate={ANNOTATE} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button('Edit Testwort')).toHaveFocus());
  });

  it('asks before removing, in a dialog, and removes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Remove');
    const ask = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    expect(within(ask).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button('Edit Testwort')).toHaveFocus());
  });

  // The entry's page heading takes the focus once the re-read says the coven no
  // longer holds it: Remove went with its menu, and the control left may be
  // another element (M8.17, after M12.31's follow-up 5). Until then the
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
    // The entry stays held, so the focus goes back to its menu, not the heading.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button('Edit Testwort')).toHaveFocus();
    // The refusal is the menu's callout, which can be brought back by its badge.
    expect(button('Show the error for Edit Testwort')).toBeInTheDocument();
  });

  it('asks before making it ours, in a dialog, and changes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Make It Ours');
    const ask = screen.getByRole('dialog', { name: 'Make It Ours' });
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button('Edit Testwort')).toBeInTheDocument();
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
    expect(button('Edit Testwort')).toBeInTheDocument();
    expect(button('Show the error for Edit Testwort')).toBeInTheDocument();
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
    expect(
      screen.getAllByRole('button', { name: 'Show the error for Edit Testwort' }),
    ).toHaveLength(1);

    // Opening a question again forgets the last refusal.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    choose('Make It Ours');
    await waitFor(() => expect(button('Show the error for Edit Testwort')).not.toBeInTheDocument());
  });

  it("shows Add to Cupboard's refusal under the Edit menu when Add is a menu item, and it can be dismissed", async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Fixture refusal: not in the Compendium',
    });
    renderActions({
      edit: {
        href: '/coven/fixture-coven/ingredients/fixture?edit' as Route,
        entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
      },
    });

    choose('Add to Cupboard');

    expect(await screen.findByRole('alert')).toHaveTextContent('not in the Compendium');
    expect(button('Show the error for Edit Testwort')).toBeInTheDocument();
    expect(button('Edit Testwort')).toHaveAccessibleDescription(/not in the Compendium/);

    press('Dismiss');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(button('Edit Testwort')).toHaveFocus();
  });

  it("shows Add to Cupboard's refusal under the button itself when it stands alone, and a new press clears it", async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Fixture refusal: not in the Compendium',
    });
    renderActions();

    press('Add to Cupboard');

    expect(await screen.findByRole('alert')).toHaveTextContent('not in the Compendium');
    expect(button('Show the error for Add to Cupboard')).toBeInTheDocument();
    expect(button('Add to Cupboard')).toHaveFocus();

    mockGraphQLMutation<AddCupboardEntryMutation, Record<string, unknown>>(
      'AddCupboardEntry',
      () => ({ addCupboardEntry: { id: 'fixture' } }),
    );
    press('Add to Cupboard');

    await waitFor(() =>
      expect(button('Show the error for Add to Cupboard')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // The plus beside the pencil on a coven's page too (the owner's call, 2026-10-20): the page's
  // `plus` names every coven the viewer may add in and which of them hold the entry.
  describe('the plus', () => {
    const OTHER = { id: '00000000-0000-4000-8000-000000000009', name: 'Other Coven' };
    const HERE = { id: BASE.workspaceId, name: 'Fixture Coven' };

    it('stands before the pencil and takes Add out of it, a menu of the covens with this one disabled once it holds the entry', async () => {
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

      const plus = screen.getByRole('button', { name: 'Add to My Ingredients' });
      const pencil = screen.getByRole('button', { name: 'Edit Testwort' });
      expect(plus.compareDocumentPosition(pencil) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      fireEvent.click(plus);
      const [here, other] = within(
        screen.getByRole('menu', { name: 'Add to My Ingredients' }),
      ).getAllByRole('menuitem');
      expect(here).toHaveAccessibleName(`${HERE.name}, in My Ingredients`);
      expect(here).toHaveAttribute('aria-disabled', 'true');
      expect(other).toHaveAccessibleName(OTHER.name);
      expect(other).not.toHaveAttribute('aria-disabled');

      fireEvent.click(other!);
      await waitFor(() => expect(router.refresh).toHaveBeenCalled());
      expect(calls).toEqual([{ workspaceId: OTHER.id, ingredientId: BASE.ingredientId }]);
    });

    it('stands in for Add to Cupboard while this coven, the only one that may add, lacks the entry', () => {
      renderActions({ plus: { workspaceId: HERE.id, covens: [HERE], heldIn: [] } });

      expect(button('Add to My Ingredients')).not.toHaveAttribute('aria-haspopup');
      expect(button('Add to Cupboard')).not.toBeInTheDocument();
    });

    it("gives way to the card's check once every coven that may add holds the entry", () => {
      renderActions({
        held: true,
        plus: { workspaceId: HERE.id, covens: [HERE], heldIn: [HERE.id] },
      });

      expect(button('Add to My Ingredients')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'In All Covens' })).toBeInTheDocument();
      expect(button('Edit Testwort')).toBeInTheDocument();
    });

    it('draws neither plus nor check without one', () => {
      // Why one could have shown: the same props with a `plus` draw it (above).
      renderActions({ held: true });

      expect(button('Add to My Ingredients')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'In All Covens' })).toBeNull();
    });
  });
});
