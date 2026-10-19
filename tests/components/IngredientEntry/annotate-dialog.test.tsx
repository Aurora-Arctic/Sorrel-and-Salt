import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnotateDialog from '@/components/IngredientEntry/annotate-dialog';
import { CUPBOARD_MENU_LABEL } from '@/components/IngredientEntry/cupboard-writes';
import type { AnnotateDialogProps } from '@/components/IngredientEntry/types';
import type { MakeItOursMutation, RemoveCupboardEntryMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The Annotate dialog's More menu (M8.17; claude-docs/components/ingredient-entry.md):
// Make It Ours and Remove from the dialog's foot, each behind the same question
// the entry page asks, each offered only on the member's permission. A remove
// leaves for where the dialog closes to; Make It Ours for the own entry it writes.

const CLOSE = '/coven/fixture-coven/ingredients?q=test' as Route;

const OPENED: NonNullable<AnnotateDialogProps['opened']> = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  ingredientId: '00000000-0000-4000-8000-000000000002',
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

const MORE: NonNullable<AnnotateDialogProps['more']> = {
  covenSlug: 'fixture-coven',
  canMakeOurs: true,
  canRemove: true,
};

function renderDialog(props: Partial<AnnotateDialogProps> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AnnotateDialog closeHref={CLOSE} opened={OPENED} more={MORE} {...props} />
    </QueryClientProvider>,
  );
}

const dialog = () => screen.getByRole('dialog', { name: 'Annotate This Entry' });
const more = () => within(dialog()).queryByRole('button', { name: CUPBOARD_MENU_LABEL });

function choices(): string[] {
  fireEvent.click(more()!);
  const menu = within(dialog()).getByRole('menu', { name: CUPBOARD_MENU_LABEL });
  return within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choose(name: string): void {
  fireEvent.click(more()!);
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

describe('AnnotateDialog: the More menu', () => {
  beforeEach(() => {
    router.push.mockClear();
    router.replace.mockClear();
    router.refresh.mockClear();
  });

  it('offers Make It Ours and Remove in the More menu, in that order', () => {
    renderDialog();

    expect(choices()).toEqual(['Make It Ours', 'Remove']);
  });

  it('offers each only on its permission, and no menu with neither', () => {
    const view = renderDialog({ more: { ...MORE, canMakeOurs: false } });
    expect(choices()).toEqual(['Remove']);

    view.unmount();
    renderDialog({ more: { ...MORE, canMakeOurs: false, canRemove: false } });
    expect(more()).not.toBeInTheDocument();
  });

  it('draws no menu where the caller gives none', () => {
    renderDialog({ more: undefined });

    expect(more()).not.toBeInTheDocument();
  });

  it('asks before removing, and removes nothing on Cancel', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      (variables) => {
        calls.push(variables);
        return { removeCupboardEntry: OPENED.ingredientId };
      },
    );
    renderDialog();

    choose('Remove');
    const ask = screen.getByRole('group', { name: /Remove Testwort from your cupboard/ });
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('group', { name: /Remove/ })).toBeNull());
    expect(dialog()).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it('removes the entry and leaves for where the dialog closes to, replacing the address', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      (variables) => {
        calls.push(variables);
        return { removeCupboardEntry: OPENED.ingredientId };
      },
    );
    renderDialog();

    choose('Remove');
    press(
      within(screen.getByRole('group', { name: /Remove/ })).getByRole('button', { name: 'Remove' }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(CLOSE));
    expect(router.push).not.toHaveBeenCalled();
    expect(calls).toEqual([{ workspaceId: OPENED.workspaceId, ingredientId: OPENED.ingredientId }]);
  });

  it("leads to the caller's removedHref where it gives one", async () => {
    mockGraphQLMutation<RemoveCupboardEntryMutation, Record<string, unknown>>(
      'RemoveCupboardEntry',
      () => ({ removeCupboardEntry: OPENED.ingredientId }),
    );
    renderDialog({ more: { ...MORE, removedHref: '/coven/fixture-coven/ingredients' as Route } });

    choose('Remove');
    press(
      within(screen.getByRole('group', { name: /Remove/ })).getByRole('button', { name: 'Remove' }),
    );

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven/ingredients'),
    );
  });

  it("shows the service's refusal in the form and keeps the dialog open", async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderDialog();

    choose('Remove');
    press(
      within(screen.getByRole('group', { name: /Remove/ })).getByRole('button', { name: 'Remove' }),
    );

    expect(await within(dialog()).findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Remove/ })).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('makes it ours behind its question and goes to the own entry', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation<MakeItOursMutation, Record<string, unknown>>('MakeItOurs', (variables) => {
      calls.push(variables);
      return { convertCompendiumEntryToLocal: { entry: { id: 'fixture-own' } } };
    });
    renderDialog();

    choose('Make It Ours');
    const ask = screen.getByRole('group', { name: /Make Testwort your coven's own/ });
    press(within(ask).getByRole('button', { name: 'Make It Ours' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/coven/fixture-coven/ingredients/fixture-own'),
    );
    expect(calls).toEqual([{ workspaceId: OPENED.workspaceId, ingredientId: OPENED.ingredientId }]);
  });
});
