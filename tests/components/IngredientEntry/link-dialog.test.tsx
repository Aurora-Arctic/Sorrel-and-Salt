import { act, fireEvent, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkForm from '@/components/IngredientEntry/link-form';
import type { FormHolding } from '@/modules/ingredients';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCompendium } from '../../support/msw/ingredient-lookups';
import { renderWithClient, waitFor } from '../../support/ingredient-form';
import { press, type } from '../../support/interact';

// The Link dialog's body (M8.17): a search of the compendium whose picks list
// as rows beneath it, and the form map, which says where each of the coven's
// forms goes: to the one pick with a form of its name, or, where two picks
// have it, to the one chosen. Link waits until every form that holds
// something has a home, then sends the split and leaves for the first pick's
// page in the coven; a refusal stays in the dialog.

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const SPLIT = 'c0ffee00-0000-4000-8000-000000000001';
const TWIN = 'c0ffee00-0000-4000-8000-000000000002';

const variant = (id: string, form: string) => ({ id, form, formChoice: null });

function show(holdings: FormHolding[]) {
  offerCompendium([
    {
      id: SPLIT,
      name: 'Splitwort',
      canonicalName: 'Fixtura splitta',
      description: null,
      isGlobal: true,
      variants: [variant('s-root', 'Rootform'), variant('s-leaf', 'Leafform')],
    },
    {
      id: TWIN,
      name: 'Twinwort',
      canonicalName: 'Fixtura gemina',
      description: null,
      isGlobal: true,
      variants: [variant('t-leaf', 'Leafform'), variant('t-bark', 'Barkform')],
    },
  ]);
  renderWithClient(
    <LinkForm
      workspaceId="w-1"
      localId="l-1"
      ingredientsHref={'/coven/fixture-coven/ingredients' as Route}
      holdings={holdings}
      onCancel={vi.fn()}
    />,
  );
}

const ROOT: FormHolding = { formId: 'f-root', form: 'rootform', jars: 1, spells: 0 };
const LEAF: FormHolding = { formId: 'f-leaf', form: 'leafform', jars: 2, spells: 1 };
const BARK: FormHolding = { formId: 'f-bark', form: 'barkform', jars: 0, spells: 0 };

const link = () => screen.getByRole('button', { name: 'Link' });
const picks = () => screen.queryByRole('list', { name: 'Picked Entries' });
const goesTo = (form: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${form}`) })).getAllByRole('cell')[1];

async function pick(name: string) {
  act(() => screen.getByRole('combobox', { name: 'Compendium Entry' }).focus());
  type('Compendium Entry', 'wort');
  const list = await screen.findByRole('listbox');
  fireEvent.click(await within(list).findByRole('option', { name: new RegExp(`^${name}`) }));
}

beforeEach(() => vi.clearAllMocks());

describe('LinkForm', () => {
  it('lists each pick once beneath the box, and its × takes it out', async () => {
    show([ROOT]);
    expect(link()).toBeDisabled();

    await pick('Splitwort');
    await pick('Twinwort');
    await pick('Splitwort');

    const rows = within(picks()!).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Splitwort');
    expect(rows[1]).toHaveTextContent('Twinwort');
    // The box is cleared for the next search.
    expect(screen.getByRole('combobox', { name: 'Compendium Entry' })).toHaveValue('');

    press(screen.getByRole('button', { name: 'Remove Twinwort' }));
    expect(within(picks()!).getAllByRole('listitem')).toHaveLength(1);
  });

  it("opens a pick's summary from its ⓘ", async () => {
    // The summary's own read, answered with a refusal so its sentence shows where it opened.
    mockGraphQLError('IngredientSummary', { code: 'NOT_FOUND', message: 'No such ingredient' });
    show([ROOT]);
    await pick('Splitwort');
    const about = screen.getByRole('button', { name: 'About Splitwort' });
    expect(about).toHaveAttribute('aria-expanded', 'false');

    press(about);

    expect(about).toHaveAttribute('aria-expanded', 'true');
    expect(await within(picks()!).findByRole('alert')).toHaveTextContent('No such ingredient');
  });

  it('sends a form one pick has there, and asks where a form two picks share goes', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('SplitLocalIntoCompendiumEntries', (variables) => {
      calls.push(variables);
      return {
        splitLocalIntoCompendiumEntries: { entries: [{ id: 'cupboard-1' }, { id: 'cupboard-2' }] },
      };
    });
    show([BARK, LEAF, ROOT]);
    await pick('Splitwort');
    await pick('Twinwort');

    // What each form holds, counted: the form map's reason for asking.
    expect(screen.getByRole('row', { name: /^Leafform/ })).toHaveTextContent('2 jars · 1 spell');
    expect(goesTo('Rootform')).toHaveTextContent('Splitwort');
    expect(goesTo('Barkform')).toHaveTextContent('Twinwort');
    const leaf = screen.getByRole('combobox', { name: 'Leafform Goes To' });
    expect(leaf).toHaveValue('');
    // Leafform holds jars and has no home yet.
    expect(link()).toBeDisabled();

    fireEvent.change(leaf, { target: { value: TWIN } });
    expect(link()).toBeEnabled();
    press(link());

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(`/coven/fixture-coven/ingredients/${SPLIT}`),
    );
    expect(calls).toEqual([
      {
        workspaceId: 'w-1',
        localId: 'l-1',
        picks: [SPLIT, TWIN],
        assignments: [{ formId: 'f-leaf', compendiumId: TWIN }],
      },
    ]);
  });

  it('holds Link while a form holding something has no pick with its form', async () => {
    show([ROOT, BARK]);
    await pick('Splitwort');
    // Barkform holds nothing, and Splitwort has no Barkform: it may go.
    expect(link()).toBeEnabled();

    press(screen.getByRole('button', { name: 'Remove Splitwort' }));
    await pick('Twinwort');
    // Rootform holds a jar, and Twinwort has no Rootform.
    expect(link()).toBeDisabled();
  });

  it('says a refusal in the dialog and goes nowhere', async () => {
    mockGraphQLError('SplitLocalIntoCompendiumEntries', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['jars'], message: 'A jar of Rootform would meet one of Splitwort' }],
    });
    show([ROOT]);
    await pick('Splitwort');

    press(link());

    expect(await screen.findByRole('alert')).toHaveTextContent('would meet one of Splitwort');
    expect(router.push).not.toHaveBeenCalled();
    expect(link()).toBeEnabled();
  });
});
