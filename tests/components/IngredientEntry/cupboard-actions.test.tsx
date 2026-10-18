import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CupboardActions from '@/components/IngredientEntry/cupboard-actions';
import type { CupboardActionsProps } from '@/components/IngredientEntry/types';
import type { AddCupboardEntryMutation, MakeItOursMutation } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Which of the cupboard buttons a compendium entry shows (M12.17, M12.23;
// claude-docs/components/ingredient-entry.md): the page decides from the
// member's permissions, and the buttons follow whether the coven holds the entry.

const BASE: CupboardActionsProps = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  covenSlug: 'fixture-coven',
  ingredientId: '00000000-0000-4000-8000-000000000002',
  held: false,
  canAdd: true,
  canAnnotate: true,
  canRemove: true,
  canMakeOurs: true,
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
  beforeEach(() => router.push.mockClear());

  it('offers Add to Cupboard alone while the coven does not hold the entry', () => {
    renderActions();

    expect(button('Add to Cupboard')).toBeInTheDocument();
    expect(button('Annotate This Entry')).not.toBeInTheDocument();
    expect(button('Remove from Cupboard')).not.toBeInTheDocument();
    expect(button('Make It Ours')).not.toBeInTheDocument();
  });

  it('offers Annotate, Make It Ours and Remove, not Add, once the coven holds it', () => {
    renderActions({ held: true });

    expect(button('Add to Cupboard')).not.toBeInTheDocument();
    expect(button('Annotate This Entry')).toBeInTheDocument();
    expect(button('Make It Ours')).toBeInTheDocument();
    expect(button('Remove from Cupboard')).toBeInTheDocument();
  });

  it('offers Make It Ours alone where it is the one write permitted', () => {
    renderActions({ held: true, canAnnotate: false, canRemove: false });

    expect(button('Make It Ours')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('draws no Make It Ours without its permission', () => {
    renderActions({ held: true, canMakeOurs: false });

    expect(button('Annotate This Entry')).toBeInTheDocument();
    expect(button('Make It Ours')).not.toBeInTheDocument();
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

  it('asks before making it ours, and changes nothing on the way out', () => {
    renderActions({ held: true });

    press('Make It Ours');
    const ask = screen.getByRole('group', { name: 'Make It Ours' });
    expect(ask).toBeInTheDocument();
    press('Cancel');

    expect(screen.queryByRole('group', { name: 'Make It Ours' })).not.toBeInTheDocument();
    expect(button('Make It Ours')).toBeInTheDocument();
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

    press('Make It Ours');
    press('Make It Ours');

    const ask = screen.getByRole('group', { name: 'Make It Ours' });
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

    press('Make It Ours');
    press('Make It Ours');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(button('Make It Ours')).toBeInTheDocument();
  });
});
