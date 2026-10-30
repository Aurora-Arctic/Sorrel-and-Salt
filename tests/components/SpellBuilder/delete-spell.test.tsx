import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DeleteSpellMutation,
  DeleteSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// Delete in the spell builder's Edit dialog, as the ingredient's Edit dialog has its
// Delete: a button at the far end of the row, which asks over the form, and once confirmed
// leaves the autosave and the save on close nothing to send.

const SPELL = {
  id: 's9',
  revision: 3,
  title: 'Fixture Working',
  intent: 'Calm',
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'private' as const,
  status: 'draft' as const,
  steps: [],
  updatedAt: '2026-10-27T14:00:00.000Z',
};
const deletedHrefOf = (title: string | null) =>
  `/coven/fixture-coven/grimoire?deleted=${encodeURIComponent(title ?? 'Untitled')}` as Route;

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" userId="u1" {...props} />
    </QueryClientProvider>,
  );
}
const del = () => screen.queryByRole('button', { name: 'Delete Spell' });

// Outside a modal the question stands in the form as a fieldset.
const asked = async () =>
  (await screen.findByRole('button', { name: 'Keep It' })).closest('fieldset') as HTMLElement;

function accept() {
  const deleted: DeleteSpellMutationVariables[] = [];
  const updated: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<DeleteSpellMutation, DeleteSpellMutationVariables>('DeleteSpell', (v) => {
    deleted.push(v);
    return { deleteSpell: String(v.id) };
  });
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>('UpdateSpell', (v) => {
    updated.push(v);
    return {
      updateSpell: { ...SPELL, ...v.input, revision: 4 },
    } as unknown as UpdateSpellMutation;
  });
  return { deleted, updated };
}

beforeEach(() => {
  window.localStorage.clear();
  router.replace.mockClear();
  offerCategories([]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Delete in the spell builder', () => {
  it('is offered on a saved spell to a role that may delete it', () => {
    renderBuilder({ spell: SPELL, deletedHrefOf });
    expect(del()).toBeInTheDocument();
  });

  it('is not offered without the permission, nor on a spell not yet created', () => {
    const { unmount } = renderBuilder({ spell: SPELL });
    expect(del()).toBeNull();
    unmount();
    renderBuilder({ deletedHrefOf });
    expect(del()).toBeNull();
  });

  it('leaves everything as it was on Keep It', async () => {
    const { deleted } = accept();
    renderBuilder({ spell: SPELL, deletedHrefOf });
    fireEvent.click(del()!);
    const question = await asked();
    expect(question).toHaveTextContent(
      'Delete Fixture Working? It leaves the grimoire for every member of the coven. Nothing in stock changes.',
    );
    fireEvent.click(within(question).getByRole('button', { name: 'Keep It' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull());
    expect(deleted).toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('deletes on confirm, sends no save, and leaves for the list', async () => {
    const { deleted, updated } = accept();
    renderBuilder({ spell: SPELL, deletedHrefOf });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Unsaved, so the autosave has a save waiting.
    fireEvent.click(screen.getByRole('button', { name: 'Purpose' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed Working' },
    });
    fireEvent.click(del()!);
    const question = await asked();
    expect(question).toHaveTextContent('Delete Renamed Working?');
    fireEvent.click(within(question).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toEqual([{ workspaceId: 'w1', id: 's9' }]));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/coven/fixture-coven/grimoire?deleted=Renamed%20Working',
      ),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
      window.dispatchEvent(new Event('pagehide'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(updated).toHaveLength(0);
  });

  it('shows a refusal and keeps the form', async () => {
    mockGraphQLError('DeleteSpell', { message: 'You cannot delete this spell', code: 'FORBIDDEN' });
    renderBuilder({ spell: SPELL, deletedHrefOf });
    fireEvent.click(del()!);
    const question = await asked();
    fireEvent.click(within(question).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('You cannot delete this spell')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
