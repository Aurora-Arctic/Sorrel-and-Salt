import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DuplicateSpellAction from '@/components/SpellRecipe/duplicate-spell';
import type { DuplicateSpellMutation, DuplicateSpellMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Duplicate on the recipe page: one press makes a private draft copy and leaves for the Drafts tab
// with the copy open in the builder (claude-docs/components/spell-recipe.md, "Duplicate").

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const COPY_ID = '00000000-0000-4000-8000-000000000003';

function renderAction() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <DuplicateSpellAction
        workspaceId={WORKSPACE_ID}
        covenSlug="fixture-coven"
        spellId={ID}
        name="Fixture Working"
      />
    </QueryClientProvider>,
  );
}

describe('DuplicateSpellAction', () => {
  beforeEach(() => {
    router.push.mockClear();
    router.replace.mockClear();
  });

  it("duplicates the spell and leaves for the Drafts tab with the copy's dialog open", async () => {
    const calls: DuplicateSpellMutationVariables[] = [];
    mockGraphQLMutation<DuplicateSpellMutation, DuplicateSpellMutationVariables>(
      'DuplicateSpell',
      (variables) => {
        calls.push(variables);
        return { duplicateSpell: { id: COPY_ID } };
      },
    );
    renderAction();

    press(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        `/coven/fixture-coven/grimoire/drafts?edit=${COPY_ID}`,
      ),
    );
    expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, id: ID }]);
  });

  it('says why when the service refuses, and goes nowhere', async () => {
    mockGraphQLError('DuplicateSpell', {
      code: 'FORBIDDEN',
      message: 'Not allowed to create a spell here.',
    });
    renderAction();

    press(screen.getByRole('button', { name: 'Duplicate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed/i);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled();
  });
});
