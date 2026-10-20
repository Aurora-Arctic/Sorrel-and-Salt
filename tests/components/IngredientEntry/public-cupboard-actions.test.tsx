import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardPlace, PublicCupboardActionsProps } from '@/components/IngredientEntry/types';
import type { AddCupboardEntryMutation, RemoveCupboardEntryMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The cupboard choices on the public entry page (M9.12), across every coven the viewer may
// write in (claude-docs/components/ingredient-entry.md, "On the public page"): the card's plus
// while any lacks the entry, just before the pencil and never one of its choices; each held
// choice while a holding coven permits it, acting in that coven alone, or asking which where
// several do.

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

/** The Edit menu's choices, in order, after opening it. */
/** The open Edit menu's choices, read without pressing. */
function shownChoices(): string[] {
  return within(screen.getByRole('menu', { name: 'Edit Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Testwort' }));
  return within(screen.getByRole('menu', { name: 'Edit Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choose(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Testwort' }));
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

  // The pencil at the end of the name's row (the owner's call, 2026-10-20), for a curator here too.
  it("is a curator's pencil, a menu button named Edit and the entry, with the Edit tip", async () => {
    show(
      props([place(1, { held: true })], {
        edit: {
          href: `${PAGE}?edit` as Route,
          entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
        },
      }),
    );

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
    expect(shownChoices()).toEqual(['Edit Compendium Entry', 'Annotate', 'Make It Ours', 'Remove']);
  });

  // Edit alone, for a curator: still the pencil, a link straight into the edit dialog, so it
  // looks and sits as everyone's pencil does without a menu of one (the owner's call, 2026-10-20).
  it("is a curator's pencil link where Edit is the one choice, with no labelled Edit", () => {
    // Why Edit is the lone choice: the one coven holds the entry and permits nothing there.
    show(
      props([place(1, { held: true, canAnnotate: false, canRemove: false, canMakeOurs: false })], {
        edit: {
          href: `${PAGE}?edit` as Route,
          entry: {
            id: 'fixture',
            name: 'Testwort',
            canonicalName: null,
            nomenclature: 'unknown',
          },
        },
      }),
    );

    expect(screen.getByRole('link', { name: 'Edit Testwort' })).toHaveAttribute(
      'href',
      `${PAGE}?edit`,
    );
    expect(screen.queryByRole('link', { name: 'Edit Compendium Entry' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
  });

  // The plus, as the compendium card has it (the owner's calls, 2026-10-20): just before the
  // pencil, and Add to Cupboard is no longer one of the pencil's choices.
  describe('the plus', () => {
    const EDIT = {
      href: `${PAGE}?edit` as Route,
      entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
    } as const;

    it('is a menu of both covens where one holds the entry, the holder disabled, with no Add in the pencil', async () => {
      const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
        addCupboardEntry: { id: 'fixture' },
      });
      // Why Add could have been the pencil's: both covens may add and the second lacks it.
      show(props([place(1), place(2, { held: true })], { edit: EDIT }));

      const plus = screen.getByRole('button', { name: 'Add to My Ingredients' });
      const pencil = screen.getByRole('button', { name: 'Edit Testwort' });
      // The pair: the plus first, then the pencil.
      expect(plus.compareDocumentPosition(pencil) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(choices()).toEqual(['Edit Compendium Entry', 'Annotate', 'Make It Ours', 'Remove']);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      fireEvent.click(plus);
      const menu = screen.getByRole('menu', { name: 'Add to My Ingredients' });
      const [one, two] = within(menu).getAllByRole('menuitem');
      expect(one).toHaveAccessibleName(place(1).name);
      expect(one).not.toHaveAttribute('aria-disabled');
      expect(two).toHaveAccessibleName(`${place(2).name}, in My Ingredients`);
      expect(two).toHaveAttribute('aria-disabled', 'true');
      expect(two).not.toHaveAccessibleDescription();

      fireEvent.click(one!);
      await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ workspaceId: place(1).workspaceId, ingredientId: INGREDIENT }]);
    });

    it('adds at once to the one coven, with no menu and no pencil', async () => {
      const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
        addCupboardEntry: { id: 'fixture' },
      });
      show(props([place(1)]));

      const plus = screen.getByRole('button', { name: 'Add to My Ingredients' });
      expect(plus).not.toHaveAttribute('aria-haspopup');
      expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
      fireEvent.click(plus);

      await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ workspaceId: place(1).workspaceId, ingredientId: INGREDIENT }]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it("gives way to the card's check once every coven holds the entry (the owner's call, 2026-10-20)", () => {
      // Why the plus could have shown: both covens may add.
      show(props([place(1, { held: true }), place(2, { held: true })], { edit: EDIT }));

      expect(screen.getByRole('button', { name: 'Edit Testwort' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
      expect(screen.getByRole('button', { name: 'In All Covens' })).toBeInTheDocument();
    });

    it('is not drawn, nor the check, for covens that may not add', () => {
      show(props([place(1, { canAdd: false }), place(2, { held: true, canAdd: false })]));

      expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'In All Covens' })).toBeNull();
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
    rendered.rerender(view(props([place(1), place(2, { held: true })])));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    choose('Remove');

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }),
    ).toBeEnabled();
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
});
