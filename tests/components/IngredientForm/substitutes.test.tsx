import { act, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openSectionsIn } from '../../support/ingredient-sections';
import { waitFor } from '../../support/ingredient-form';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { ENTRY_ID, WORKSPACE_ID } from '../../support/msw/ingredient-lookups';
import {
  HERB_VARIANT_ID,
  OILWORT_OIL_ID,
  addOil,
  control,
  openSubstitutes,
  openVariant,
  renderVariants,
  sent,
  substitute,
  twoForms,
  type,
  variant,
} from './variants-harness';
import { press } from '../../support/interact';

// A variant's substitutes: offered form by form, ranked by the variant's own form and group, a typed name kept as a name. Rendered by ./variants-harness.tsx.
// The link a picked row sends, and the save refusing a link that names no form, are variants.test.tsx's, on the whole form (claude-docs/components/ingredient-form.md, "The variants").

describe('a variant’s substitutes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ranks an ingredient in the same form first, then one in its group, then the rest', async () => {
    renderVariants({ workspaceId: WORKSPACE_ID });

    const list = await openSubstitutes(await addOil());

    await waitFor(() => within(list).getByRole('option', { name: /^Tinctwort/ }));
    const named = within(list)
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(named.map((text) => text.match(/^(Plainwort|Tinctwort|Oilwort)/)?.[0])).toEqual([
      'Oilwort',
      'Tinctwort',
    ]);
  });

  // A variant's substitute is picked form by
  // form, and a link always names one.
  it('offers an ingredient only as its forms, one row each, and one in no form not at all', async () => {
    renderVariants({ workspaceId: WORKSPACE_ID });

    const list = await openSubstitutes(await addOil());

    await waitFor(() => within(list).getByRole('option', { name: /^Tinctwort/ }));
    // Tinctwort and Oilwort come in one form each: that form's row alone.
    expect(within(list).getAllByRole('option')).toHaveLength(2);
    expect(within(list).getAllByRole('option', { name: /^Tinctwort · Tincture/ })).toHaveLength(1);
    expect(within(list).getAllByRole('option', { name: /^Oilwort · OIL/ })).toHaveLength(1);
    // Plainwort comes in none: nothing of it to link.
    expect(within(list).queryByRole('option', { name: /^Plainwort/ })).toBeNull();
    // There is no second picker to name a form with.
    expect(within(variant('Oil')).queryByRole('combobox', { name: /^Form of / })).toBeNull();
  });

  it('adds typed text as a name only, linking nothing', async () => {
    const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID });
    const oil = await addOil();

    type(oil, 'Substitute Ingredient', 'Plainwort');
    fireEvent.click(within(oil).getByRole('button', { name: 'Add Substitute Ingredient' }));
    press('Save Ingredient');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sent(onSubmit)?.variants?.[0]?.substitutes).toEqual([{ name: 'Plainwort' }]);
  });

  it('never offers the variant itself as its own substitute, its sibling forms still offered', async () => {
    renderVariants({ workspaceId: null, values: twoForms() });
    const asks: unknown[] = [];
    mockGraphQLQuery<Record<string, unknown>>('CompendiumSubstitutes', () => {
      asks.push(true);
      return {
        compendium: {
          edges: [
            {
              node: substitute(ENTRY_ID, 'Testwort', [
                { id: HERB_VARIANT_ID, form: 'Oil', formChoice: null },
                { id: OILWORT_OIL_ID, form: 'Herb', formChoice: null },
              ]),
            },
          ],
        },
      };
    });
    const oil = openVariant('Oil');
    openSectionsIn(oil, 'Relations');

    act(() => control(oil, 'Substitute Ingredient').focus());
    await waitFor(() => expect(asks.length).toBeGreaterThan(0));
    fireEvent.click(
      within(oil).getByRole('button', { name: 'Show Substitute Ingredient suggestions' }),
    );
    const list = await within(oil).findByRole('listbox', {
      name: 'Substitute Ingredient suggestions',
    });

    await waitFor(() => within(list).getByRole('option', { name: /^Testwort · Herb/ }));
    expect(within(list).queryByRole('option', { name: /^Testwort · Oil/ })).toBeNull();
  });
});
