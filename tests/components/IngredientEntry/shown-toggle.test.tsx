import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShownToggle from '@/components/IngredientEntry/shown-toggle';
import type {
  SetCompendiumEntryShownMutation,
  SetCompendiumEntryShownMutationVariables,
} from '@/gql/graphql';
import { press } from '../../support/interact';
import { HttpResponse } from 'msw/http';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { router } from '../../support/next-navigation';
import { renderWithQuery } from '../../support/render-with-query';

const ID = '00000000-0000-4000-8000-000000000002';

function renderToggle(shown: boolean) {
  return renderWithQuery(<ShownToggle ingredientId={ID} shown={shown} name="Testwort" />);
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

  it('hides a shown entry when flipped off', async () => {
    const calls = accept();
    renderToggle(true);

    press(screen.getByRole('switch', { name: 'Shown in Compendium: Testwort' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, shown: false }]);
  });

  it('shows a hidden entry when flipped on', async () => {
    const calls = accept();
    renderToggle(false);

    press(screen.getByRole('switch', { name: 'Shown in Compendium: Testwort' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, shown: true }]);
  });

  // Regression: off then straight back on saved the off and lost the on.
  it('keeps the last position when flipped twice while the first save is still out', async () => {
    // The first write's answer is held back so the second press lands while it is still out.
    let stored = true;
    const calls: SetCompendiumEntryShownMutationVariables[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstHeld = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    server.use(
      graphqlLink.mutation<
        SetCompendiumEntryShownMutation,
        SetCompendiumEntryShownMutationVariables
      >('SetCompendiumEntryShown', async ({ variables }) => {
        calls.push(variables);
        stored = variables.shown;
        if (calls.length === 1) await firstHeld;
        return HttpResponse.json({ data: { setCompendiumEntryShown: { id: ID } } });
      }),
    );
    renderToggle(true);
    const toggle = () => screen.getByRole('switch', { name: 'Shown in Compendium: Testwort' });

    press(toggle());
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: ID, shown: false });
    press(toggle());
    releaseFirst();

    await waitFor(() => expect(stored).toBe(true), { timeout: 3000 });
    await waitFor(() => expect(toggle()).toBeChecked());
    expect(calls[calls.length - 1]).toEqual({ id: ID, shown: true });
  });

  it("shows the service's refusal and does not read the page again", async () => {
    mockGraphQLError('SetCompendiumEntryShown', { code: 'FORBIDDEN', message: 'Forbidden' });
    renderToggle(true);

    press(screen.getByRole('switch', { name: 'Shown in Compendium: Testwort' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('only reports the flip when given onChange, sending nothing', async () => {
    const calls = accept();
    const onChange = vi.fn();
    renderWithQuery(
      <ShownToggle
        shown
        name="Testwort"
        onChange={onChange}
        accessibleName="Shown in Compendium"
      />,
    );

    press(screen.getByRole('switch', { name: 'Shown in Compendium' }));

    expect(onChange).toHaveBeenCalledWith(false);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(calls).toHaveLength(0);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
