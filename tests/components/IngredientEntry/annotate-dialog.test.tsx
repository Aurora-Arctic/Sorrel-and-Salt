import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnotateDialog from '@/components/IngredientEntry/annotate-dialog';
import { CUPBOARD_MENU_LABEL } from '@/components/IngredientEntry/cupboard-writes';
import { UNSAVED_CHANGES_LOST } from '@/components/Modal';
import type { AnnotateDialogProps } from '@/components/IngredientEntry/types';
import type {
  AnnotateCupboardEntryMutation,
  MakeItOursMutation,
  RemoveCupboardEntryMutation,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The Annotate dialog's foot (claude-docs/components/ingredient-entry.md): Make It Ours and Remove, each offered only on the member's permission,
// in a More menu when both are and as a button of its own when one is, each asked in the form's own question card, as Delete asks, not in a second dialog.
// A remove leaves for where the dialog closes to; Make It Ours goes to the own entry it writes, warning first when the form holds unsaved changes.

const CLOSE = '/coven/fixture-coven/ingredients?q=test' as Route;

const OPENED: NonNullable<AnnotateDialogProps['opened']> = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  ingredientId: '00000000-0000-4000-8000-000000000002',
  revision: 3,
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
const REMOVE = /^Remove Testwort from your cupboard\?/;
const OURS = /^Make Testwort your coven's own\?/;
/** The question card, a group named by its question, inside the Annotate dialog. */
const asked = (name: RegExp) => within(dialog()).getByRole('group', { name });
const gone = (name: RegExp) => screen.queryByRole('group', { name });

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

describe('AnnotateDialog: Make It Ours and Remove', () => {
  beforeEach(() => {
    router.push.mockClear();
    router.replace.mockClear();
    router.refresh.mockClear();
  });

  it('offers Make It Ours and Remove in the More menu, in that order, when both are permitted', () => {
    renderDialog();

    expect(choices()).toEqual(['Make It Ours', 'Remove']);
    // In the one Coven section every More draws.
    const menu = within(dialog()).getByRole('menu', { name: CUPBOARD_MENU_LABEL });
    expect(within(menu).getByRole('group', { name: 'Coven' })).toContainElement(
      within(menu).getByRole('menuitem', { name: 'Remove' }),
    );
  });

  it('offers the one permitted as a button of its own, with no menu, and neither with neither', () => {
    const view = renderDialog({ more: { ...MORE, canMakeOurs: false } });
    expect(more()).not.toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Remove' }));
    expect(asked(REMOVE)).toBeInTheDocument();

    view.unmount();
    const ours = renderDialog({ more: { ...MORE, canRemove: false } });
    expect(more()).not.toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: 'Remove' })).toBeNull();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Make It Ours' }));
    expect(asked(OURS)).toBeInTheDocument();

    ours.unmount();
    renderDialog({ more: { ...MORE, canMakeOurs: false, canRemove: false } });
    expect(more()).not.toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: /Remove|Make It Ours/ })).toBeNull();
  });

  it('draws neither where the caller gives none', () => {
    renderDialog({ more: undefined });

    expect(more()).not.toBeInTheDocument();
  });

  it('asks before removing, and on Cancel removes nothing and keeps the Annotate dialog', async () => {
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
    expect(asked(REMOVE)).toBeInTheDocument();
    // Over the form in its own dialog, not a dialog of its own.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    press(within(asked(REMOVE)).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(gone(REMOVE)).toBeNull());
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
    press(within(asked(REMOVE)).getByRole('button', { name: 'Remove' }));

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
    press(within(asked(REMOVE)).getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/coven/fixture-coven/ingredients'),
    );
  });

  it("shows the service's refusal in the form, closes the question and keeps the dialog open", async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderDialog();

    choose('Remove');
    press(within(asked(REMOVE)).getByRole('button', { name: 'Remove' }));

    expect(await within(dialog()).findByRole('alert')).toBeInTheDocument();
    expect(gone(REMOVE)).toBeNull();
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
    expect(asked(OURS)).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    press(within(asked(OURS)).getByRole('button', { name: 'Make It Ours' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/coven/fixture-coven/ingredients/fixture-own'),
    );
    expect(calls).toEqual([{ workspaceId: OPENED.workspaceId, ingredientId: OPENED.ingredientId }]);
  });

  // Make It Ours copies the saved annotations, so the form's unsaved ones are
  // lost with the dialog: the question says so.
  it('warns that unsaved changes are lost only while the form holds some', () => {
    mockGraphQLMutation<AnnotateCupboardEntryMutation>('AnnotateCupboardEntry', () => ({
      annotateCupboardEntry: { id: 'fixture', revision: 4 },
    }));
    renderDialog();

    choose('Make It Ours');
    expect(within(asked(OURS)).queryByRole('alert')).toBeNull();
    press(within(asked(OURS)).getByRole('button', { name: 'Cancel' }));

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Fixture unsaved note' },
    });
    choose('Make It Ours');
    expect(within(asked(OURS)).getByRole('alert')).toHaveTextContent(UNSAVED_CHANGES_LOST);
  });

  it("has no Cancel button of its own, only the dialog's Close", () => {
    renderDialog();

    expect(within(dialog()).queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(within(dialog()).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  // The form autosaves, so Close saves what is unsaved instead of asking.
  it("saves the form's unsaved changes on Close and closes", async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation<AnnotateCupboardEntryMutation, Record<string, unknown>>(
      'AnnotateCupboardEntry',
      (variables) => {
        calls.push(variables);
        return { annotateCupboardEntry: { id: 'fixture', revision: 4 } };
      },
    );
    renderDialog();
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Fixture unsaved note' },
    });

    press(within(dialog()).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(CLOSE));
    expect(calls).toEqual([
      expect.objectContaining({
        input: { description: 'Fixture unsaved note' },
        expectedRevision: 3,
      }),
    ]);
  });
});
