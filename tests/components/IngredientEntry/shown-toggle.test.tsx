import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShownToggle from '@/components/IngredientEntry/shown-toggle';
import type {
  SetCompendiumEntryShownMutation,
  SetCompendiumEntryShownMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The curator's Hide and Show button on a compendium entry.

const ID = '00000000-0000-4000-8000-000000000002';

function renderToggle(shown: boolean) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ShownToggle ingredientId={ID} shown={shown} name="Testwort" />
    </QueryClientProvider>,
  );
}

function accept() {
  const calls: SetCompendiumEntryShownMutationVariables[] = [];
  mockGraphQLMutation<SetCompendiumEntryShownMutation, SetCompendiumEntryShownMutationVariables>(
    'SetCompendiumEntryShown',
    (variables) => {
      calls.push(variables);
      return { setCompendiumEntryShown: { id: ID } };
    },
  );
  return calls;
}

describe('ShownToggle', () => {
  beforeEach(() => {
    router.refresh.mockClear();
  });

  it('offers Hide on a shown entry and hides it', async () => {
    const calls = accept();
    renderToggle(true);

    press(screen.getByRole('button', { name: 'Hide Testwort' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, shown: false }]);
  });

  it('offers Show on a hidden entry and shows it', async () => {
    const calls = accept();
    renderToggle(false);

    press(screen.getByRole('button', { name: 'Show Testwort' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, shown: true }]);
  });

  it("shows the service's refusal and does not read the page again", async () => {
    mockGraphQLError('SetCompendiumEntryShown', { code: 'FORBIDDEN', message: 'Forbidden' });
    renderToggle(true);

    press(screen.getByRole('button', { name: 'Hide Testwort' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('only reports the flip when given onChange, sending nothing', async () => {
    const calls = accept();
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <ShownToggle shown name="Testwort" onChange={onChange} label="Shown in Compendium" />
      </QueryClientProvider>,
    );

    press(screen.getByRole('switch', { name: 'Shown in Compendium' }));

    expect(onChange).toHaveBeenCalledWith(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toHaveLength(0);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
