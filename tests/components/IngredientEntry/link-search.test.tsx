import { act, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkSearch from '@/components/IngredientEntry/link-search';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCompendium } from '../../support/msw/ingredient-lookups';
import { renderWithClient, waitFor } from '../../support/ingredient-form';
import { press, type } from '../../support/interact';

// The edit dialog's Link to the Compendium (M8.17): a search of the
// compendium, then Link, which asks over the form before it sends M12.21's
// conversion and moves on only when that succeeds. The question's own
// behaviour on the page is link-to-compendium.test.tsx's.

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const FIXTURE_ONE = 'c0ffee00-0000-4000-8000-000000000001';

function show() {
  offerCompendium([
    {
      id: FIXTURE_ONE,
      name: 'Fixture One',
      canonicalName: 'Fixtura una',
      description: null,
      isGlobal: true,
      variants: [],
    },
  ]);
  renderWithClient(
    <LinkSearch
      workspaceId="w-1"
      localId="l-1"
      name="Fixture Own"
      ingredientsHref="/coven/fixture-coven/ingredients"
    />,
  );
}

const box = () => screen.getByRole('combobox', { name: 'Compendium Entry' });
const link = () => screen.getByRole('button', { name: 'Link' });

async function pick() {
  act(() => box().focus());
  type('Compendium Entry', 'Fixture');
  const list = await screen.findByRole('listbox');
  fireEvent.click(await within(list).findByRole('option', { name: /^Fixture One/ }));
}

/** The question over the form, named by what it asks. */
const question = () => screen.getByRole('group', { name: /Link Fixture Own to Fixture One/ });

beforeEach(() => vi.clearAllMocks());

describe('LinkSearch', () => {
  it('offers Link only once a compendium entry is picked, and an edit after drops the pick', async () => {
    show();

    expect(screen.getByRole('heading', { name: 'Link to the Compendium' })).toBeInTheDocument();
    expect(link()).toBeDisabled();

    await pick();
    expect(link()).toBeEnabled();

    type('Compendium Entry', 'Fixture On');
    expect(link()).toBeDisabled();
  });

  it('asks first, saying unsaved changes go, and Cancel sends nothing', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('ConvertLocalToCompendiumEntry', (variables) => {
      calls.push(variables);
      return { convertLocalToCompendiumEntry: { entry: { id: FIXTURE_ONE } } };
    });
    show();
    await pick();

    press(link());

    expect(question()).toHaveTextContent('Changes you have not saved here are not kept.');
    press(within(question()).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('group', { name: /Link Fixture Own/ })).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("sends the three ids and goes to the compendium entry's page in the coven", async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('ConvertLocalToCompendiumEntry', (variables) => {
      calls.push(variables);
      return { convertLocalToCompendiumEntry: { entry: { id: FIXTURE_ONE } } };
    });
    show();
    await pick();
    press(link());

    press(within(question()).getByRole('button', { name: 'Link' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(`/coven/fixture-coven/ingredients/${FIXTURE_ONE}`),
    );
    expect(calls).toEqual([{ workspaceId: 'w-1', localId: 'l-1', compendiumId: FIXTURE_ONE }]);
  });

  it('says a refusal in the question and moves nothing', async () => {
    mockGraphQLError('ConvertLocalToCompendiumEntry', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['forms'], message: 'The compendium entry has no Fixture form' }],
    });
    show();
    await pick();
    press(link());

    press(within(question()).getByRole('button', { name: 'Link' }));

    expect(await within(question()).findByRole('alert')).toHaveTextContent('no Fixture form');
    expect(router.push).not.toHaveBeenCalled();
  });
});
