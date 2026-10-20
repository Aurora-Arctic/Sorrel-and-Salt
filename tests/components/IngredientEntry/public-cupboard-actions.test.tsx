import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardPlace, PublicCupboardActionsProps } from '@/components/IngredientEntry/types';
import type { AddCupboardEntryMutation, RemoveCupboardEntryMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { expectRefusalUnder } from '../../support/click-feedback';
import { press } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The cupboard choices on the public entry page (M9.12), across every coven the viewer may
// write in (claude-docs/components/ingredient-entry.md, "On the public page"): Add while any
// lacks the entry, a menu of the covens that lack it where several do, or a dialog asking which
// where Add is one of the Edit menu's choices; each held choice while a holding coven
// permits it, acting in that coven alone, or asking which where several do.

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
function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  return within(screen.getByRole('menu', { name: 'Edit' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choose(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
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

  it('adds at once to the one coven, with no picker', async () => {
    const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
      addCupboardEntry: { id: 'fixture' },
    });
    show(props([place(1)]));

    press('Add to Cupboard');

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(1).workspaceId, ingredientId: INGREDIENT }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a menu of the covens where several may add, and adds to the one chosen at once', async () => {
    const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
      addCupboardEntry: { id: 'fixture' },
    });
    show(props([place(1), place(2)]));

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cupboard' }));
    const menu = screen.getByRole('menu', { name: 'Add to Cupboard' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([place(1).name, place(2).name]);
    expect(calls).toEqual([]);
    fireEvent.click(within(menu).getByRole('menuitem', { name: place(2).name }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(2).workspaceId, ingredientId: INGREDIENT }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the lone menu busy, Adding, while the add is on its way', async () => {
    let answer: () => void = () => {};
    const gate = new Promise<void>((resolve) => (answer = resolve));
    server.use(
      graphqlLink.mutation('AddCupboardEntry', async () => {
        await gate;
        return HttpResponse.json({ data: { addCupboardEntry: { id: 'fixture' } } });
      }),
    );
    show(props([place(1), place(2)]));

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cupboard' }));
    fireEvent.click(screen.getByRole('menuitem', { name: place(1).name }));

    const busy = await screen.findByRole('button', { name: 'Adding' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await act(async () => answer());
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  });

  it('adds at once to the one coven left without the entry, with no menu', async () => {
    const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
      addCupboardEntry: { id: 'fixture' },
    });
    // Why a menu could have shown: both covens may add, and the default one holds the entry,
    // though it permits nothing else there, so Add to Cupboard is still the lone choice.
    show(
      props([
        place(1, { held: true, canAnnotate: false, canRemove: false, canMakeOurs: false }),
        place(2),
      ]),
    );

    press('Add to Cupboard');

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(2).workspaceId, ingredientId: INGREDIENT }]);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says a refusal of the lone menu under it, with the focus on it', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    show(props([place(1), place(2)]));

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cupboard' }));
    fireEvent.click(screen.getByRole('menuitem', { name: place(1).name }));

    const button = await screen.findByRole('button', { name: 'Add to Cupboard' });
    expect(await expectRefusalUnder(button, 'Add to Cupboard')).toContain(
      'Viewers cannot add ingredients.',
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("asks which coven in a dialog where Add to Cupboard is one of the Edit menu's choices", async () => {
    const calls = mockWrite<AddCupboardEntryMutation>('AddCupboardEntry', {
      addCupboardEntry: { id: 'fixture' },
    });
    show(
      props([place(1), place(2)], {
        edit: {
          href: `${PAGE}?edit` as Route,
          entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
        },
      }),
    );

    choose('Add to Cupboard');
    const dialog = screen.getByRole('dialog', { name: 'Add to Cupboard' });
    expect(calls).toEqual([]);
    pickCoven(dialog, place(2).name);
    press(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: place(2).workspaceId, ingredientId: INGREDIENT }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it("puts a curator's Edit Compendium Entry first in the menu", () => {
    show(
      props([place(1)], {
        edit: {
          href: `${PAGE}?edit` as Route,
          entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
        },
      }),
    );

    expect(choices()).toEqual(['Edit Compendium Entry', 'Add to Cupboard']);
  });

  it('shows the menu where only the non-default coven holds the entry, and acts on that coven', async () => {
    const calls = mockWrite<RemoveCupboardEntryMutation>('RemoveCupboardEntry', {
      removeCupboardEntry: INGREDIENT,
    });
    show(props([place(1), place(2, { held: true })]));

    expect(choices()).toEqual(['Add to Cupboard', 'Annotate', 'Make It Ours', 'Remove']);
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
