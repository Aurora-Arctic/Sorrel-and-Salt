import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardActionsProps } from '@/components/IngredientEntry/types';
import type { AddCupboardEntryMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Which of the three cupboard buttons a compendium entry shows (M12.17;
// claude-docs/components/ingredient-entry.md): the page decides from the
// member's permissions, and the buttons follow whether the coven holds the entry.

const BASE: CupboardActionsProps = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  ingredientId: '00000000-0000-4000-8000-000000000002',
  held: false,
  canAdd: true,
  canAnnotate: true,
  canRemove: true,
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

describe('CupboardActions', () => {
  it('offers Add to Cupboard alone while the coven does not hold the entry', () => {
    renderActions();

    expect(button('Add to Cupboard')).toBeInTheDocument();
    expect(button('Annotate This Entry')).not.toBeInTheDocument();
    expect(button('Remove from Cupboard')).not.toBeInTheDocument();
  });

  it('offers Annotate and Remove, not Add, once the coven holds it', () => {
    renderActions({ held: true });

    expect(button('Add to Cupboard')).not.toBeInTheDocument();
    expect(button('Annotate This Entry')).toBeInTheDocument();
    expect(button('Remove from Cupboard')).toBeInTheDocument();
  });

  it('draws nothing for a viewer', () => {
    const none = { canAdd: false, canAnnotate: false, canRemove: false };
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

  it('asks before removing, and removes nothing on the way out', () => {
    renderActions({ held: true });

    press('Remove from Cupboard');
    expect(button('Remove')).toBeInTheDocument();
    press('Cancel');

    expect(button('Remove')).not.toBeInTheDocument();
    expect(button('Remove from Cupboard')).toBeInTheDocument();
  });

  it("shows the service's refusal when a jar is still held", async () => {
    mockGraphQLError('RemoveCupboardEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['ingredientId'], message: 'Fixture refusal: a jar is held' }],
    });
    renderActions({ held: true });

    press('Remove from Cupboard');
    press('Remove');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
