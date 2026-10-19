import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const button = (name: string) => screen.queryByRole('button', { name });

/** The Edit menu's choices, in order, after opening it. */
function choices(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  const items = within(screen.getByRole('menu', { name: 'Edit' })).getAllByRole('menuitem');
  return items.map((item) => item.textContent ?? '');
}

/** Opens the Edit menu and chooses one of its items. */
function choose(name: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

describe('CupboardActions', () => {
  beforeEach(() => router.push.mockClear());

  it('offers Add to Cupboard alone, as a plain button, while the coven does not hold the entry', () => {
    renderActions();

    expect(button('Add to Cupboard')).toBeInTheDocument();
    expect(button('Edit')).not.toBeInTheDocument();
  });

  it('offers Annotate, Make It Ours and Remove, not Add, in the Edit menu once the coven holds it', () => {
    renderActions({ held: true });

    expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
  });

  it("puts a curator's Edit Compendium Entry first in the menu, a link to the page's edit address", () => {
    renderActions({
      edit: {
        href: '/coven/fixture-coven/ingredients/fixture?edit' as Route,
        entry: { id: 'fixture', name: 'Testwort', canonicalName: null, nomenclature: 'unknown' },
      },
    });

    expect(choices()).toEqual(['Edit Compendium Entry', 'Add to Cupboard']);
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
    await waitFor(() => expect(button('Edit')).toHaveFocus());
  });

  it('asks before removing, in a dialog, and removes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Remove');
    const ask = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    expect(within(ask).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(button('Edit')).toHaveFocus());
  });

  it('closes the question and reads the page again once the entry is removed', async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: BASE.ingredientId }),
    );
    renderActions({ held: true });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.refresh).toHaveBeenCalled();
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

  it("shows the service's refusal when a jar is still held", async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderActions({ held: true });

    choose('Remove');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('asks before making it ours, in a dialog, and changes nothing on the way out', async () => {
    renderActions({ held: true });

    choose('Make It Ours');
    const ask = screen.getByRole('dialog', { name: 'Make It Ours' });
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button('Edit')).toBeInTheDocument();
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
    expect(button('Edit')).toBeInTheDocument();
  });
});
