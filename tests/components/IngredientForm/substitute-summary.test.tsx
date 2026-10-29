import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { EntryHrefContext } from '@/components/IngredientForm/substitute-summary';
import { LookupListField, useSubstituteSuggestions } from '@/components/IngredientForm/suggestions';
import type {
  IngredientFormInput,
  IngredientFormValues,
  SubstituteListEntry,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import type { IngredientSummaryQuery, IngredientSummaryQueryVariables } from '@/gql/graphql';
import { renderWithClient } from '../../support/ingredient-form';
import { mockGraphQLError, mockGraphQLQuery } from '../../support/msw/graphql';
import { WORKSPACE_ID } from '../../support/msw/ingredient-lookups';

// A substitute list's chips: a linked ingredient's
// chip is a button that opens a summary of it, read through /api/graphql on
// opening, and a typed name's is plain text that opens nothing. How the panel
// opens and shuts — a second press, Escape, a press outside — is Combobox's
// (tests/components/Combobox/index.test.tsx, "with a summary").

const MOCKWORT_ID = '0d4f2c1a-6b3e-4a5d-8c7f-9e0a1b2c3d4e';
const DRIED_LEAF_ID = '71c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';

const LINKED: SubstituteListEntry = {
  value: 'Mockwort',
  link: {
    id: MOCKWORT_ID,
    canonicalName: 'Fixtura vulgaris',
    forms: ['Dried leaf'],
    description: null,
    isGlobal: true,
    variants: [{ id: DRIED_LEAF_ID, form: 'Dried leaf', group: null }],
  },
  variantId: DRIED_LEAF_ID,
};
const TYPED: SubstituteListEntry = { value: 'Zest Root' };

const MOCKWORT: IngredientSummaryQuery['ingredient'] = {
  id: MOCKWORT_ID,
  name: 'Mockwort',
  canonicalName: 'Fixtura vulgaris',
  description: 'A fixture herb, invented for the tests.',
  nomenclature: 'botanical',
  isGlobal: true,
  slug: 'mockwort-fixtura-vulgaris',
  elements: ['water'],
  celestialBodies: ['Moon'],
  zodiacSigns: null,
  colors: [],
  // The form adds a celestial body of its own to the ingredient's.
  variants: [
    {
      id: DRIED_LEAF_ID,
      form: 'Dried leaf',
      formChoice: null,
      elements: null,
      celestialBodies: ['Saturn'],
      zodiacSigns: null,
      colors: null,
    },
  ],
};

/** Answers `IngredientSummary` with `ingredient`, recording each ask. */
function offerSummary(ingredient = MOCKWORT) {
  const calls: IngredientSummaryQueryVariables[] = [];
  mockGraphQLQuery<IngredientSummaryQuery, IngredientSummaryQueryVariables>(
    'IngredientSummary',
    (variables) => {
      calls.push(variables);
      return { ingredient };
    },
  );
  return calls;
}

/** The ingredient's substitutes, one linked and one typed, as an edit opens them. */
function renderSubstitutes(entryHref?: (ingredient: { slug: string }) => string) {
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort', substitutes: [LINKED, TYPED] },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <EntryHrefContext.Provider value={entryHref}>
          <LookupListField
            workspaceId={WORKSPACE_ID}
            useSuggestions={useSubstituteSuggestions}
            name="substitutes"
            legend="Substitute Ingredients"
            entry="Substitute Ingredient"
          />
        </EntryHrefContext.Provider>
      </FormProvider>
    );
  };
  renderWithClient(<Harness />);
}

const LINKED_TEXT = 'Mockwort (Fixtura vulgaris) · Dried Leaf';
const opener = () => screen.getByRole('button', { name: LINKED_TEXT });
const summary = () => screen.getByRole('dialog', { name: `About ${LINKED_TEXT}` });
/** What the summary says of `term`, as its description list pairs them. */
const fact = (term: string) =>
  within(summary()).getByText(term, { selector: 'dt' }).nextElementSibling;

describe('a substitute list’s chips', () => {
  it('draws a linked ingredient as a button that opens a dialog, and a typed name as text alone, asking nothing', () => {
    const calls = offerSummary();
    renderSubstitutes();

    expect(opener()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(opener()).toHaveAttribute('aria-expanded', 'false');
    // Both keep their x, named as before.
    expect(screen.getByRole('button', { name: `Remove ${LINKED_TEXT}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Zest Root' })).toBeInTheDocument();
    // The typed name is text, with nothing to press but its x.
    expect(screen.queryByRole('button', { name: 'Zest Root' })).not.toBeInTheDocument();
    // Nothing is read until a chip is opened.
    expect(calls).toHaveLength(0);
  });

  it('opens the linked ingredient’s summary, read for this coven, with the form it names', async () => {
    const calls = offerSummary();
    renderSubstitutes();

    fireEvent.click(opener());

    await waitFor(() => expect(fact('Classification')).toHaveTextContent('Botanical'));
    expect(calls).toEqual([{ id: MOCKWORT_ID, workspaceId: WORKSPACE_ID }]);
    expect(within(summary()).getByText('Fixtura vulgaris')).toBeInTheDocument();
    expect(within(summary()).getByText(MOCKWORT.description ?? '')).toBeInTheDocument();
    expect(fact('Form')).toHaveTextContent('Dried Leaf');
    expect(fact('Elements')).toHaveTextContent('Water');
    // The ingredient's celestial body and the form's own, together.
    expect(fact('Celestial Bodies')).toHaveTextContent('Moon, Saturn');
    // A list with nothing in it is left out.
    expect(within(summary()).queryByText('Colours', { selector: 'dt' })).not.toBeInTheDocument();
    // No page to link, so no link.
    expect(within(summary()).queryByRole('link')).not.toBeInTheDocument();
  });

  it('links the entry’s page, in a new tab, where the form is given one', async () => {
    offerSummary();
    renderSubstitutes(({ slug }) => `/admin/compendium?edit=${slug}`);

    fireEvent.click(opener());

    const link = await within(summary()).findByRole('link');
    expect(link).toHaveAttribute('href', '/admin/compendium?edit=mockwort-fixtura-vulgaris');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('says a failed read failed, and reads again on Try Again', async () => {
    mockGraphQLError('IngredientSummary', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderSubstitutes();

    fireEvent.click(opener());
    expect(await within(summary()).findByRole('alert')).toBeInTheDocument();

    offerSummary();
    fireEvent.click(within(summary()).getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(fact('Classification')).toHaveTextContent('Botanical'));
    expect(within(summary()).queryByRole('alert')).not.toBeInTheDocument();
  });
});
