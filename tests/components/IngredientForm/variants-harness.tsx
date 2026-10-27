import { act, fireEvent, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { expect, vi } from 'vitest';
import type { IngredientFormInput, IngredientFormValues } from '@/components/IngredientForm/types';
import { VariantsField, useVariantFolds } from '@/components/IngredientForm/variants';
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  compendiumResolver,
  ingredientResolver,
  openingValues,
} from '@/components/IngredientForm/values';
import { VARIANT_SECTIONS, openSectionsIn } from '../../support/ingredient-sections';
import { renderWithClient, waitFor } from '../../support/ingredient-form';
import { offerForms, offerIngredients, offerNothing } from '../../support/msw/ingredient-lookups';
import type { FormNode, IngredientNode } from './types';

// The Variants section's fixtures, locators and harness (MB.221), shared by
// variants.test.tsx, which renders the whole form, and variants-field,
// copy and substitutes, which render `VariantsField` alone. The harness is
// the field on react-hook-form with the form's own resolver, as
// list-field.test.tsx renders `ListField`: what a save sends is what the
// resolver gives `handleSubmit`, the input the form's save mutation
// carries. What the form adds around the field — a save opening the variant
// and section an error is in, Close All, undo, the unsaved-changes question
// — is not here, and stays in variants.test.tsx.

export const OIL_ID = '8d2c4e6f-1a3b-4c5d-9e7f-0a1b2c3d4e5f';
export const HERB_VARIANT_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
export const HERB_FORM_ID = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';

/** A curated form, Oil, under an invented group. */
export const OIL: FormNode = {
  id: OIL_ID,
  value: 'Oil',
  description: null,
  group: 'Preparation',
  icon: null,
  curated: true,
  claimants: [],
};

/** Invented substitutes (M1.25): one in no form, one in a form of Oil's group, one in oil itself. */
export const PLAINWORT_ID = '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d';
export const TINCTWORT_ID = '3b4c5d6e-7f8a-4b9c-8d0e-2f3a4b5c6d7e';
export const OILWORT_ID = '4c5d6e7f-8a9b-4c0d-9e1f-3a4b5c6d7e8f';
export const OILWORT_OIL_ID = '5d6e7f8a-9b0c-4d1e-8f2a-4b5c6d7e8f9a';
export const substitute = (
  id: string,
  name: string,
  variants: IngredientNode['variants'],
): IngredientNode => ({
  id,
  name,
  canonicalName: null,
  description: null,
  isGlobal: true,
  variants,
});
export const SUBSTITUTES = [
  substitute(PLAINWORT_ID, 'Plainwort', []),
  substitute(TINCTWORT_ID, 'Tinctwort', [
    {
      id: '6e7f8a9b-0c1d-4e2f-9a3b-5c6d7e8f9a0b',
      form: 'Tincture',
      formChoice: {
        id: '7f8a9b0c-1d2e-4f3a-8b4c-6d7e8f9a0b1c',
        group: { id: 'g', name: 'Preparation' },
      },
    },
  ]),
  substitute(OILWORT_ID, 'Oilwort', [{ id: OILWORT_OIL_ID, form: ' OIL', formChoice: null }]),
];
/** A saved substitute link to Plainwort, from before a link had to name a form. */
export const FORMLESS_PLAINWORT = {
  value: 'Plainwort',
  link: {
    id: PLAINWORT_ID,
    canonicalName: null,
    forms: [],
    description: null,
    isGlobal: true,
    variants: [],
  },
};

// Found by label, as tests/support/interact.tsx finds them (MB.181), but
// within a variant's card: its fields share their labels with the
// ingredient's and with each other variant's. The required marker, hidden
// from the name, is dropped from the label's text.
const byLabel = (scope: HTMLElement, name: string, selector: string) =>
  within(scope).getByLabelText(name, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });
export const control = (scope: HTMLElement, name: string) =>
  byLabel(scope, name, 'input:not([role]), textarea, [role="combobox"]');
export const type = (scope: HTMLElement, name: string, value: string) =>
  fireEvent.change(control(scope, name), { target: { value } });
export const newForm = () => control(document.body, 'New Form');

/** The fieldset a variant is, named by its form. */
export const variant = (form: string) => screen.getByRole('group', { name: form });
export const noVariant = (form: string) =>
  expect(screen.queryByRole('group', { name: form })).not.toBeInTheDocument();

/** A variant's Edit, which opens and closes it (MB.115). */
export const editOf = (form: string) =>
  within(variant(form)).getByRole('button', { name: `Edit ${form}` });
/** Opens a closed variant by its Edit, as a person would before typing in it. */
export const openVariant = (form: string) => {
  const edit = editOf(form);
  if (edit.getAttribute('aria-expanded') !== 'true') fireEvent.click(edit);
  return variant(form);
};
/** Opens a closed variant and every one of its own sections, closed as an edit's are (MB.115). */
export const openWhole = (form: string) => {
  const card = openVariant(form);
  openSectionsIn(card, ...VARIANT_SECTIONS);
  return card;
};
/** A variant's section heading's button, which opens and closes it. */
export const sectionOf = (card: HTMLElement, title: string) =>
  within(card).getByRole('button', { name: title });
/** Which of a variant's sections are open, by title, in page order. */
export const openIn = (card: HTMLElement) =>
  VARIANT_SECTIONS.filter(
    (title) => sectionOf(card, title).getAttribute('aria-expanded') === 'true',
  );
/** An entry with two closed forms, Oil and Herb, Oil carrying a colour left in its box. */
export const twoForms = (
  oil: Partial<IngredientFormValues['variants'][number]> = {},
): IngredientFormValues => ({
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'none' as const,
  variants: [
    {
      ...EMPTY_VARIANT,
      variantId: HERB_VARIANT_ID,
      form: 'Oil',
      formLink: { id: OIL_ID, name: 'Oil', group: 'Preparation', icon: null, description: null },
      ...oil,
    },
    {
      ...EMPTY_VARIANT,
      form: 'Herb',
      formLink: {
        id: HERB_FORM_ID,
        name: 'Herb',
        group: 'Plant part',
        icon: null,
        description: null,
      },
    },
  ],
});

// What a variant copies from the ingredient (MB.115), and an entry holding
// something in each.
export const CATEGORY_A = '8a9b0c1d-2e3f-4b4c-8d5e-6f7a8b9c0d1e';
export const CATEGORY_B = '9b0c1d2e-3f4a-4c5d-9e6f-7a8b9c0d1e2f';
export const REFERENCE_ID = '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c';
export const OTHER_REFERENCE_ID = '7a8b9c0d-1e2f-4a3b-9c4d-5e6f7a8b9c0d';
export const reference = (id: string, title: string, locator: string) => ({
  value: title,
  link: { id, isGlobal: true, kind: 'book' as const, title, authors: null, container: null },
  locator,
});
export const COPIED = [
  'Description',
  'Safety Notes',
  'Element',
  'Celestial Bodies',
  'Zodiac Signs',
  'Colours',
  'Categories',
  'Substitute Ingredients',
  'References',
];
export const copyOf = (scope: HTMLElement, field: string) =>
  within(scope).getByRole('button', { name: `Copy From Ingredient: ${field}` });

/** An entry whose ingredient holds something in every field a variant copies, its Oil some of it already. */
export const filled = (): IngredientFormValues => {
  const base = twoForms({
    safetyNotes: 'Dilute before use.',
    celestialBodies: [{ value: 'venus' }],
    colors: [{ value: 'Fixture Red' }],
    elements: ['fire'],
    categoryIds: [CATEGORY_B],
    substitutes: [{ value: 'Fixture fern' }],
    references: [reference(OTHER_REFERENCE_ID, 'The Second Herbal', '')],
  });
  return {
    ...base,
    description: 'A fixture herb.',
    safetyNotes: 'Keep from children.',
    elements: ['fire', 'water'],
    celestialBodies: [{ value: 'Mercury' }, { value: 'Venus' }],
    zodiacSigns: [{ value: 'Gemini' }],
    colors: [{ value: 'Fixture Red' }, { value: 'Fixture Green' }],
    categoryIds: [CATEGORY_A, CATEGORY_B],
    substitutes: [
      {
        value: 'Oilwort',
        link: {
          id: OILWORT_ID,
          canonicalName: null,
          forms: [' OIL'],
          description: null,
          isGlobal: true,
          variants: [{ id: OILWORT_OIL_ID, form: ' OIL', group: null }],
        },
      },
      {
        value: 'Tinctwort',
        link: {
          id: TINCTWORT_ID,
          canonicalName: null,
          forms: ['Tincture'],
          description: null,
          isGlobal: true,
          variants: [{ id: '6e7f8a9b-0c1d-4e2f-9a3b-5c6d7e8f9a0b', form: 'Tincture', group: null }],
        },
      },
      {
        value: 'Plainwort',
        link: {
          id: PLAINWORT_ID,
          canonicalName: null,
          forms: [],
          description: null,
          isGlobal: true,
          variants: [],
        },
      },
      { value: 'Fixture moss' },
    ],
    references: [
      reference(REFERENCE_ID, 'The Fixture Herbal', 'p. 112'),
      reference(OTHER_REFERENCE_ID, 'The Second Herbal', 'p. 9'),
    ],
  };
};

/** The notice beneath a variant's substitutes of what a copy skipped. */
export const skippedNotice = (scope: HTMLElement) =>
  within(scope).getByRole('status', { name: 'Substitute Ingredients skipped' });

/** Types a form into the New Form box and presses its Add. */
export const addVariant = (form: string) => {
  type(document.body, 'New Form', form);
  fireEvent.click(screen.getByLabelText('Add Variant', { selector: 'button' }));
};

/** Picks Oil from the New Form box, so the variant carries Oil's group. */
export async function addOil() {
  const forms = offerForms([OIL]);
  act(() => newForm().focus());
  await waitFor(() => expect(forms.length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole('button', { name: 'Show New Form suggestions' }));
  fireEvent.click(await screen.findByRole('option', { name: /^Oil \(Preparation\)/ }));
  return variant('Oil');
}
/** Opens a variant's substitute box on the lookup's answer. */
export async function openSubstitutes(oil: HTMLElement) {
  const asks = offerIngredients(SUBSTITUTES);
  const box = control(oil, 'Substitute Ingredient');
  act(() => box.focus());
  await waitFor(() => expect(asks.length).toBeGreaterThan(0));
  fireEvent.click(
    within(oil).getByRole('button', { name: 'Show Substitute Ingredient suggestions' }),
  );
  return within(oil).findByRole('listbox', { name: 'Substitute Ingredient suggestions' });
}

/**
 * `VariantsField` on its own, its section open, under the resolver the form
 * uses for `workspaceId` (null, the compendium's). `values` are an entry's,
 * opened as the form opens an edit's; without them the field starts on a new
 * coven ingredient named Testwort. Beside it, the ingredient's own
 * Description, which a variant copies from, and Save Ingredient, which
 * submits: `onSubmit` is called with what the resolver passes, the input a
 * save sends.
 */
export function renderVariants({
  workspaceId,
  values,
}: {
  workspaceId: string | null;
  values?: IngredientFormValues;
}) {
  offerNothing();
  const onSubmit = vi.fn<(input: IngredientFormInput) => void>();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: values
        ? openingValues(values)
        : { ...EMPTY_VALUES, name: 'Testwort', nomenclature: 'none' },
      resolver: workspaceId === null ? compendiumResolver : ingredientResolver,
      mode: 'onTouched',
      reValidateMode: 'onChange',
    });
    const folds = useVariantFolds();
    const [open, setOpen] = useState(true);
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit((input) => onSubmit(input))}>
          <textarea aria-label="Ingredient Description" {...methods.register('description')} />
          <VariantsField
            workspaceId={workspaceId}
            fold={{ open, invalid: false, onToggle: () => setOpen((now) => !now) }}
            folds={folds}
          />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  renderWithClient(<Harness />);
  return onSubmit;
}

/** What the harness's last save sent, once one has. */
export const sent = (
  onSubmit: ReturnType<typeof renderVariants>,
): IngredientFormInput | undefined => onSubmit.mock.lastCall?.[0];
