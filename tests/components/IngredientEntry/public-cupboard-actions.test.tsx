import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardPlace, PublicCupboardActionsProps } from '@/components/IngredientEntry/types';
import type { StockData } from '@/components/StockDialog/types';
import type { AddCupboardEntryMutation, RemoveCupboardEntryMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The cupboard choices on the public entry page, across every coven the viewer may write in (claude-docs/components/ingredient-entry.md, "On the public page").
// The card's plus shows while any coven lacks the entry, just before the other icons and never among their choices; a curator's Edit is the main icon and never in the dots;
// the held choices sit in the dots and the bin while a holding coven permits them, acting in that coven alone or asking which where several do.

const PAGE = '/compendium/ingredients/testwort' as Route;

const place = (n: 1 | 2, over: Partial<CupboardPlace> = {}): CupboardPlace => ({
  workspaceId: `00000000-0000-4000-8000-00000000000${n}`,
  covenSlug: `fixture-coven-${n}`,
  name: `Fixture Coven ${n === 1 ? 'One' : 'Two'}`,
  held: false,
  canAdd: true,
  canAnnotate: true,
  canRemove: true,
  canMakeOurs: true,
  annotateHref: `${PAGE}?annotate=fixture-coven-${n}` as Route,
  ...over,
});

const INGREDIENT = '00000000-0000-4000-8000-0000000000aa';
const FLOWER = '00000000-0000-4000-8000-0000000000f1';

/** What Edit Stock reads for a coven: the entry's one form, and a jar of it. */
const stock = (quantity: number): StockData => ({
  forms: [{ variantId: FLOWER, label: 'Flower' }],
  jars: [
    {
      id: `00000000-0000-4000-8000-0000000009${quantity}`,
      variantId: FLOWER,
      quantity,
      unit: 'g',
      threshold: null,
    },
  ],
});

const EDIT = {
  href: `${PAGE}?edit` as Route,
  entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
} as const;

const props = (
  covens: CupboardPlace[],
  over: Partial<PublicCupboardActionsProps> = {},
): PublicCupboardActionsProps => ({
  covens,
  defaultWorkspaceId: covens[0].workspaceId,
  annotate: { closeHref: PAGE },
  ingredientId: INGREDIENT,
  compendium: {
    name: 'Testwort',
    description: null,
    safetyNotes: null,
    elements: [],
    celestialBodies: [],
    zodiacSigns: [],
    colors: [],
  },
  ...over,
});

let client = makeQueryClient();
const view = (p: PublicCupboardActionsProps) => (
  <QueryClientProvider client={client}>
    <main>
      <h1>Testwort</h1>
      <CupboardActions {...p} />
    </main>
  </QueryClientProvider>
);
function show(p: PublicCupboardActionsProps) {
  client = makeQueryClient();
  return render(view(p));
}

/** The open More menu's choices, read without pressing. */
function shownChoices(): string[] {
  return within(screen.getByRole('menu', { name: 'More for Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
  return shownChoices();
}

/** The bin where Remove is the one choice left, else an item of the three dots' menu. */
function choose(name: string): void {
  if (name === 'Remove' && screen.queryByRole('button', { name: 'Remove Testwort' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Remove Testwort' }));
    return;
  }
  fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

/** Picks a coven in a dialog's Coven dropdown. */
function pickCoven(dialog: HTMLElement, name: string): void {
  fireEvent.click(within(dialog).getByRole('combobox', { name: 'Coven' }));
  fireEvent.click(within(dialog).getByRole('option', { name: new RegExp(`^${name}`) }));
}

function mockWrite<T extends AddCupboardEntryMutation | RemoveCupboardEntryMutation>(
  name: string,
  data: T,
) {
  const calls: unknown[] = [];
  mockGraphQLMutation<T, Record<string, unknown>>(name, (variables) => {
    calls.push(variables);
    return data;
  });
  return calls;
}

describe('CupboardActions on the public page', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it('draws nothing where no coven permits any choice, as for a viewer', () => {
    show(
      props([
        place(1, { canAdd: false, canAnnotate: false, canRemove: false, canMakeOurs: false }),
      ]),
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  // The compendium's Edit is the page's main icon for a curator:
  // its own link, named for the compendium it changes, never folded into the three dots.
  it("draws a curator's Edit in Compendium as the main icon, a link, the other choices in the dots", async () => {
    show(props([place(1, { held: true })], { edit: EDIT }));

    const edit = screen.getByRole('link', { name: 'Edit in Compendium Testwort' });
    expect(edit).toHaveAttribute('href', `${PAGE}?edit`);
    expect(screen.queryByRole('link', { name: 'Annotate Testwort' })).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'More for Testwort' }));
    });
    // Only the coven's choices are left, in the one Coven section the dots always draw,
    // Remove among them and so no bin.
    expect(shownChoices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
    const menu = screen.getByRole('menu', { name: 'More for Testwort' });
    expect(within(menu).getByRole('group', { name: 'Coven' })).toBeInTheDocument();
    expect(within(menu).queryByRole('group', { name: 'Compendium' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Testwort' })).not.toBeInTheDocument();
  });

  // The same icon alone: no dots or bin, since the one coven permits nothing there.
  it("draws a curator's Edit in Compendium alone where nothing else is permitted", () => {
    // Why the dots could have shown: the one coven holds the entry, and nothing is permitted there.
    show(
      props([place(1, { held: true, canAnnotate: false, canRemove: false, canMakeOurs: false })], {
        edit: EDIT,
      }),
    );

    expect(screen.getByRole('link', { name: 'Edit in Compendium Testwort' })).toHaveAttribute(
      'href',
      `${PAGE}?edit`,
    );
    expect(screen.queryByRole('button', { name: /^(More|Remove)/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
  });

  // No right to write the compendium means no main icon, whatever else the viewer may do: the
  // owner's "always" is never hidden in the dots, not shown without permission.
  it('draws no main icon for a coven member who is not a curator, Annotate living in the dots', () => {
    show(props([place(1, { held: true })]));

    expect(screen.queryByRole('link')).toBeNull();
    expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
  });

  it('draws no main icon where the coven may only annotate nothing, the viewer of a coven', () => {
    show(
      props([place(1, { held: true, canAnnotate: false, canRemove: false, canMakeOurs: false })]),
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button', { name: /^(More|Remove)/ })).toBeNull();
  });

  // The plus, as the compendium card has it: just before the
  // pencil, and Add to Cupboard is no longer one of the pencil's choices.
  describe('the plus', () => {
    it('is a menu of both covens where one holds the entry, the holder disabled, with no Add in the dots', async () => {
      const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
        addCupboardEntry: { id: 'fixture' },
      });
      // Why Add could have been one of the dots': both covens may add and the second lacks it.
      show(props([place(1), place(2, { held: true })], { edit: EDIT }));

      const plus = screen.getByRole('button', { name: /^Add to My Ingredients: / });
      const edit = screen.getByRole('link', { name: 'Edit in Compendium Testwort' });
      // The plus first, then the icons.
      expect(plus.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      fireEvent.click(plus);
      const menu = screen.getByRole('menu', { name: /^Add to My Ingredients: / });
      const [one, two] = within(menu).getAllByRole('menuitem');
      expect(one).toHaveAccessibleName(place(1).name);
      expect(one).not.toHaveAttribute('aria-disabled');
      expect(two).toHaveAccessibleName(`${place(2).name}, in its cupboard`);
      expect(two).toHaveAttribute('aria-disabled', 'true');
      expect(two).not.toHaveAccessibleDescription();

      fireEvent.click(one!);
      await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ workspaceId: place(1).workspaceId, ingredientId: INGREDIENT }]);
    });

    it('adds at once to the one coven, with no menu and no icon', async () => {
      const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
        addCupboardEntry: { id: 'fixture' },
      });
      show(props([place(1)]));

      const plus = screen.getByRole('button', { name: /^Add to My Ingredients: / });
      expect(plus).not.toHaveAttribute('aria-haspopup');
      expect(screen.queryByRole('link')).toBeNull();
      fireEvent.click(plus);

      await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ workspaceId: place(1).workspaceId, ingredientId: INGREDIENT }]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it("gives way to the card's check once every coven holds the entry (the owner's call, 2026-10-20)", () => {
      // Why the plus could have shown: both covens may add.
      show(props([place(1, { held: true }), place(2, { held: true })], { edit: EDIT }));

      expect(screen.getByRole('link', { name: 'Edit in Compendium Testwort' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
      expect(screen.getByRole('button', { name: /^In Every Cupboard: / })).toBeInTheDocument();
    });

    it('is not drawn, nor the check, for covens that may not add', () => {
      show(props([place(1, { canAdd: false }), place(2, { held: true, canAdd: false })]));

      expect(screen.queryByRole('button', { name: /^Add to My Ingredients: / })).toBeNull();
      expect(screen.queryByRole('button', { name: /^In Every Cupboard: / })).toBeNull();
    });
  });

  it('shows the menu where only the non-default coven holds the entry, and acts on that coven', async () => {
    const calls = mockWrite<RemoveCupboardEntryMutation>('RemoveCupboardEntry', {
      removeCupboardEntry: INGREDIENT,
    });
    show(props([place(1), place(2, { held: true })]));

    expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
    expect(screen.getByRole('menuitem', { name: 'Annotate' })).toHaveAttribute(
      'href',
      place(2).annotateHref,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    // One coven holds it, so nothing to ask.
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    press(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(2).workspaceId, ingredientId: INGREDIENT }]);
  });

  it('asks which coven before removing where two hold the entry, and removes only that one', async () => {
    const calls = mockWrite<RemoveCupboardEntryMutation>('RemoveCupboardEntry', {
      removeCupboardEntry: INGREDIENT,
    });
    show(props([place(1, { held: true }), place(2, { held: true })]));

    choose('Remove');
    const dialog = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    expect(within(dialog).getByRole('combobox', { name: 'Coven' })).toHaveTextContent(
      place(1).name,
    );
    pickCoven(dialog, place(2).name);
    press(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(2).workspaceId, ingredientId: INGREDIENT }]);
  });

  it('lists only the holding covens whose role permits the write', () => {
    show(
      props([
        place(1, { held: true, canRemove: false }),
        place(2, { held: true }),
        place(1, {
          workspaceId: '00000000-0000-4000-8000-000000000003',
          name: 'Fixture Coven Three',
          held: true,
        }),
      ]),
    );

    choose('Remove');
    const dialog = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Coven' }));

    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([place(2).name, 'Fixture Coven Three']);
  });

  it('asks again unbusy after a remove from one coven, for the other still holding it', async () => {
    mockWrite<RemoveCupboardEntryMutation>('RemoveCupboardEntry', {
      removeCupboardEntry: INGREDIENT,
    });
    const rendered = show(props([place(1, { held: true }), place(2, { held: true })]));
    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());

    // The re-read: the first coven no longer holds it, so its confirmation closes.
    // The close hands the focus back to the three dots, which open their tip a step later (IconTip):
    // inside an async act, so that update is awaited rather than left outside it.
    await act(async () => {
      rendered.rerender(view(props([place(1), place(2, { held: true })])));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    choose('Remove');

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }),
    ).toBeEnabled();
    // The dots' tip, shown by the focus the first close handed them, fades out as the dialog
    // takes the focus: its fade timer ends inside an act, not after the test.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
  });

  it("asks which coven to annotate where two may, then goes to that coven's ?annotate", () => {
    show(props([place(1, { held: true }), place(2, { held: true })]));

    choose('Annotate');
    const dialog = screen.getByRole('dialog', { name: 'Annotate' });
    pickCoven(dialog, place(2).name);
    press(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(router.push.mock.calls.map(([href]) => href)).toEqual([place(2).annotateHref]);
  });

  it("opens the Annotate dialog for the coven the address names, on that coven's annotations", () => {
    show(
      props([place(1, { held: true }), place(2, { held: true })], {
        annotate: {
          closeHref: PAGE,
          opened: {
            workspaceId: place(2).workspaceId,
            overrides: {
              label: 'Their Testwort',
              description: null,
              safetyNotes: null,
              elements: null,
              celestialBodies: null,
              zodiacSigns: null,
              colors: null,
            },
          },
        },
      }),
    );

    const dialog = screen.getByRole('dialog', { name: /Annotate/ });
    expect(within(dialog).getByRole('textbox', { name: 'Label' })).toHaveValue('Their Testwort');
  });

  // Edit Stock, first in the dots: the coven card's own dialog,
  // for a coven that holds the entry and where the role may update stock.
  describe('Edit Stock', () => {
    it('goes first in the dots for a holding coven that may update stock', () => {
      show(props([place(1, { held: true, stock: stock(50) })]));
      expect(choices()).toEqual(['Edit Stock', 'Annotate', 'Make It Ours', 'Remove']);
    });

    it('is not offered for a coven that lacks the entry, or where the role may not update stock', () => {
      show(props([place(1, { held: true }), place(2, { held: false })]));
      expect(choices()).not.toContain('Edit Stock');
    });

    it("opens that coven's dialog at once for one coven", async () => {
      show(props([place(1, { held: true, stock: stock(50) }), place(2, { held: true })]));
      choose('Edit Stock');
      const dialog = await screen.findByRole('dialog', {
        name: 'Edit Stock for Fixture Coven One, Testwort',
      });
      expect(within(dialog).getByRole('button', { name: /^Flower\b/ })).toBeInTheDocument();
      expect(within(dialog).queryByRole('combobox', { name: 'Coven' })).toBeNull();
    });

    it("asks which coven where two may, then opens that coven's jar", async () => {
      show(
        props([
          place(1, { held: true, stock: stock(50) }),
          place(2, { held: true, stock: stock(20) }),
        ]),
      );
      choose('Edit Stock');
      const picker = await screen.findByRole('dialog', { name: 'Edit Stock' });
      pickCoven(picker, 'Fixture Coven Two');
      fireEvent.click(within(picker).getByRole('button', { name: 'Continue' }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Edit Stock for Fixture Coven Two, Testwort',
      });
      expect(within(dialog).getByRole('button', { name: /^Flower\b.*20 g/ })).toBeInTheDocument();
    });
  });
});
