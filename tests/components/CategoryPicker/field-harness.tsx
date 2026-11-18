import { fireEvent, screen } from '@testing-library/react';
import { FormProvider, type Resolver, useForm } from 'react-hook-form';
import { FormErrorSummary } from '@/components/Field';
import { CategoriesField } from '@/components/CategoryPicker/field';
import type { CategoryNode } from '../IngredientForm/types';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { renderWithQuery } from '../../support/render-with-query';

// Invented groups, given out of order: the picker sorts them and knows none by name, as it knows no group a keeper adds.
const WARDS = { id: 'a3e1c9b2-0d4f-4a8e-9c71-5b2f6e8d0a11', name: 'Wards & Fixtures' };
const CRAFT = { id: 'b7f2d0c3-1e5a-4b9f-8d82-6c3a7f9e1b22', name: 'Craft of Tests' };
const colours = { colorDark: '#8fb8de', colorLight: '#2f5d86' };
export const CATEGORIES: CategoryNode[] = [
  {
    id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e51',
    name: 'Testward',
    description: 'Keeps a fixture from harm.',
    group: { ...WARDS, ...colours },
  },
  {
    id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e52',
    name: 'Fixture Shield',
    description: 'Turns a failing test aside.',
    group: { ...WARDS, ...colours },
  },
  {
    id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e53',
    name: 'Trialcraft',
    description: 'Works a change by trial.',
    group: { ...CRAFT, ...colours },
  },
];

export const pickCategory = async (name: string) => {
  // Opened only when shut: a pick leaves the list open for the next, and the chevron would shut it.
  if (screen.getByRole('combobox', { name: 'Category' }).getAttribute('aria-expanded') !== 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
  // A longer wait than the default: nothing says the categories have loaded before the list opens, and a full-CPU run slows a whole-form file up to about 85 times, past 1000ms; 10s stays inside the 20s test timeout.
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(`^${name}`) }, { timeout: 10_000 }),
  );
};

type Values = { categoryIds: string[]; drafts: { categoryIds: string } };

// Passes every value, so a change after a save re-runs validation and clears what the save set, as a form's schema does.
const passing: Resolver<Values> = async (values) => ({ values, errors: {} });

/**
 * The Categories field alone in a form that lists its errors on Save, as the ingredient form does. Save
 * sets `issue` on the path it names, as a server's refusal of one pick is placed.
 */
export function renderCategoriesField({
  issue,
}: {
  issue: { path: `categoryIds.${number}`; message: string };
}) {
  offerCategories(CATEGORIES);
  const Harness = () => {
    const methods = useForm<Values>({
      defaultValues: { categoryIds: [], drafts: { categoryIds: '' } },
      resolver: passing,
      mode: 'onTouched',
      reValidateMode: 'onChange',
      shouldFocusError: false,
    });
    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(() =>
            methods.setError(issue.path, { type: 'server', message: issue.message }),
          )}
        >
          <FormErrorSummary />
          <CategoriesField name="categoryIds" boxName="drafts.categoryIds" />
          <button type="submit">Save</button>
        </form>
      </FormProvider>
    );
  };
  renderWithQuery(<Harness />);
}
