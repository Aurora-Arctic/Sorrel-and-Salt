import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { VARIANT_SECTIONS, openSections, openSectionsIn } from '../../support/ingredient-sections';
import { renderWithClient, waitFor, duplicateHref } from '../../support/ingredient-form';
import { press, redo, undo } from '../../support/interact';
import { mockGraphQLError } from '../../support/msw/graphql';
import {
  ENTRY_ID,
  WORKSPACE_ID,
  acceptCompendiumCreate,
  acceptCreate,
  acceptUpdate,
  offerForms,
  offerNothing,
} from '../../support/msw/ingredient-lookups';
import {
  CATEGORY_A,
  CATEGORY_B,
  FORMLESS_PLAINWORT,
  HERB_VARIANT_ID,
  OIL,
  OILWORT_ID,
  OILWORT_OIL_ID,
  OIL_ID,
  OTHER_REFERENCE_ID,
  REFERENCE_ID,
  addOil,
  addVariant,
  control,
  copyOf,
  editOf,
  filled,
  newForm,
  noVariant,
  openIn,
  openSubstitutes,
  openVariant,
  openWhole,
  sectionOf,
  twoForms,
  type,
  variant,
} from './variants-harness';

// What the whole form adds around its Variants section: the curated
// pick and the typed form refused on the compendium, the unsaved-changes
// question, each variant saved back by its id, a save opening the variant
// and section a schema or server error is in, Close All and Open All, the
// links a substitute pick and a copy send, and undo and redo. The section's
// own behaviour is variants-field.test.tsx's, a variant's substitute offers
// substitutes.test.tsx's and its copy buttons copy.test.tsx's, each on
// ./variants-harness.tsx; a field inside a variant behaves as the same field
// does on the ingredient, which index.test.tsx and the fields' own files
// prove (claude-docs/components/ingredient-form.md, "The variants").

function renderForm(props: { workspaceId: string | null; values?: IngredientFormValues }) {
  offerNothing();
  const onSaved = vi.fn();
  const form =
    props.workspaceId === null ? (
      <IngredientForm
        duplicateHref={duplicateHref}
        workspaceId={null}
        onSaved={onSaved}
        entry={props.values && { id: ENTRY_ID, values: props.values }}
      />
    ) : (
      <IngredientForm
        duplicateHref={duplicateHref}
        workspaceId={props.workspaceId}
        onSaved={onSaved}
        entry={props.values && { id: ENTRY_ID, values: props.values }}
      />
    );
  renderWithClient(form);
  // An edit opens with every section closed: its variants are what
  // these tests work in.
  if (props.values) openSections('Variants');
  return onSaved;
}

const save = () => press('Save Ingredient');

describe('IngredientForm’s variants', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a curated form picked on the compendium, the variant’s Form field carrying the pick', async () => {
    const calls = acceptCompendiumCreate();
    renderForm({ workspaceId: null });
    const asks = offerForms([OIL]);

    act(() => newForm().focus());
    await waitFor(() => expect(asks.length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Show New Form suggestions' }));
    fireEvent.click(await screen.findByRole('option', { name: /^Oil \(Preparation\)/ }));

    const form = control(variant('Oil'), 'Form');
    expect(form).toHaveValue('Oil');
    expect(form).toHaveAccessibleDescription(expect.stringContaining('Preparation'));
    expect(asks[0].workspaceId).toBeNull();

    type(document.body, 'Name', 'Testwort');
    fireEvent.click(screen.getByRole('combobox', { name: 'Classification' }));
    fireEvent.click(screen.getByRole('option', { name: 'None' }));
    save();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants).toEqual([
      expect.objectContaining({ form: 'Oil', formId: OIL_ID }),
    ]);
  });

  it('marks a compendium variant’s typed form invalid beside its Form box, focused, and sends nothing', async () => {
    const calls = acceptUpdate();
    renderForm({
      workspaceId: null,
      values: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'none',
        variants: [
          {
            ...EMPTY_VARIANT,
            variantId: HERB_VARIANT_ID,
            form: 'Oil',
            formLink: {
              id: OIL_ID,
              name: 'Oil',
              group: 'Preparation',
              icon: null,
              description: null,
            },
          },
        ],
      },
    });

    const form = control(openVariant('Oil'), 'Form');
    fireEvent.change(form, { target: { value: 'Oyl' } });
    save();

    await waitFor(() => expect(form).toBeInvalid());
    expect(form).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('asks one question at a time: Cancel while a removal asks shows the unsaved changes instead', async () => {
    offerNothing();
    renderWithClient(
      <IngredientForm
        duplicateHref={duplicateHref}
        workspaceId={WORKSPACE_ID}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    addVariant('Oil');
    press(within(variant('Oil')).getByRole('button', { name: 'Remove Oil' }));
    // Outside a modal nothing holds the form inert, so Cancel is still in reach.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
    press('Keep Editing');

    expect(screen.getByRole('button', { name: 'Keep It' })).toBeInTheDocument();
    expect(variant('Oil')).toBeInTheDocument();
    // Leaving a field validates it; let that land inside the test.
    await act(async () => {});
  });

  it('opens an entry’s variants as fieldsets and saves each back by its id', async () => {
    const calls = acceptUpdate();
    renderForm({
      workspaceId: null,
      values: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'none',
        variants: [
          {
            ...EMPTY_VARIANT,
            variantId: HERB_VARIANT_ID,
            form: 'Oil',
            formLink: {
              id: OIL_ID,
              name: 'Oil',
              group: 'Preparation',
              icon: null,
              description: null,
            },
            safetyNotes: 'Dilute before use.',
          },
        ],
      },
    });

    type(openVariant('Oil'), 'Description', 'Pressed from the fixture.');
    save();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants).toEqual([
      expect.objectContaining({
        id: HERB_VARIANT_ID,
        form: 'Oil',
        formId: OIL_ID,
        description: 'Pressed from the fixture.',
        safetyNotes: 'Dilute before use.',
      }),
    ]);
  });

  describe('a save, and the variant it opens', () => {
    it('opens the closed variant and section a save finds the schema’s error in, closing the one open, its field focused, and sends nothing', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({ drafts: { ...EMPTY_VARIANT.drafts, colors: 'Fixture Red' } }),
      });
      const herb = openVariant('Herb');
      openSectionsIn(herb, 'Details & Care');
      type(herb, 'Description', 'Dug in autumn.');

      save();

      await waitFor(() => expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true'));
      const oil = variant('Oil');
      expect(openIn(oil)).toEqual(['Correspondences']);
      const colour = control(oil, 'Colour');
      expect(colour).toBeVisible();
      expect(colour).toBeInvalid();
      expect(colour).toHaveFocus();
      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'false');
      expect(calls).toHaveLength(0);
    });

    it('marks the field a server issue pathed to variants.1.form names, and only that one, opening its closed variant and section', async () => {
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['variants', 1, 'form'], message: 'No such form to pick' }],
      });
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');
      openSectionsIn(oil, 'Details & Care');
      type(oil, 'Description', 'Pressed from the fixture.');

      save();

      // Herb is the second variant.
      await waitFor(() => expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'true'));
      const herb = variant('Herb');
      expect(openIn(herb)).toEqual(['Identity']);
      const form = control(herb, 'Form');
      expect(form).toBeInvalid();
      expect(form).toHaveFocus();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      openSectionsIn(openVariant('Oil'), 'Identity');
      expect(control(variant('Oil'), 'Form')).not.toBeInvalid();
    });

    it('closes every variant’s sections with Close All, and opens every one with Open All', () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');
      fireEvent.click(sectionOf(oil, 'Correspondences'));

      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
      openSections('Variants');
      expect(openIn(variant('Oil'))).toEqual([]);

      // Variants open, so the control reads Close All: closed first, then opened.
      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
      expect(openIn(variant('Oil'))).toEqual(VARIANT_SECTIONS);
      expect(within(variant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });
  });

  describe('a variant’s substitutes', () => {
    it('links the form a row names, sent as substituteVariantId, its pill naming the form', async () => {
      const calls = acceptCreate();
      renderForm({ workspaceId: WORKSPACE_ID });
      type(document.body, 'Name', 'Testwort');
      const oil = await addOil();

      const list = await openSubstitutes(oil);
      fireEvent.click(await within(list).findByRole('option', { name: /^Oilwort · / }));
      save();

      // One pill, for Oilwort's form rather than Oilwort whole.
      expect(within(oil).getAllByRole('button', { name: /^Remove Oilwort/ })).toHaveLength(1);
      expect(within(oil).queryByRole('button', { name: 'Remove Oilwort' })).toBeNull();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([
        { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
      ]);
    });

    // Old data, from before a link had to name a form: the chip stays to be
    // read, and the save is refused beside it until it is replaced.
    it('refuses a save holding a link that names no form, the error on that entry alone', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({
          substitutes: [{ value: 'Fixture moss' }, FORMLESS_PLAINWORT],
        }),
      });
      const oil = openVariant('Oil');
      const remove = (name: string) => within(oil).getByRole('button', { name: `Remove ${name}` });
      const described = (element: HTMLElement) =>
        element.getAttribute('aria-describedby')?.split(' ') ?? [];
      type(oil, 'Description', 'A fixture oil.');

      save();

      const box = control(oil, 'Substitute Ingredient');
      await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
      expect(openIn(oil)).toEqual(['Relations']);
      const [errorId] = described(remove('Plainwort'));
      expect(described(box)).toContain(errorId);
      expect(described(remove('Fixture moss'))).not.toContain(errorId);
      expect(calls).toHaveLength(0);

      // Why: the same save, the formless link removed, goes.
      fireEvent.click(remove('Plainwort'));
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([{ name: 'Fixture moss' }]);
    });
  });

  // The owner's call: each of an open variant's fields but its form
  // fills from the ingredient's own, adding and never taking away.
  describe('copying from the ingredient', () => {
    it('adds the ingredient’s entries the variant lacks after its own, removing none, and sends them', async () => {
      const calls = acceptUpdate();
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');
      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();
      // The ingredient's own fields have none: every copy button is the variant's.
      for (const button of screen.getAllByRole('button', { name: /^Copy From Ingredient/ })) {
        expect(oil).toContainElement(button);
      }

      for (const field of [
        'Element',
        'Celestial Bodies',
        'Zodiac Signs',
        'Colours',
        'Categories',
        'References',
      ]) {
        const button = copyOf(oil, field);
        act(() => button.focus());
        fireEvent.click(button);
        expect(button).toHaveFocus();
      }
      // Pressed again, it adds nothing more.
      fireEvent.click(copyOf(oil, 'Celestial Bodies'));
      expect(
        within(oil).getByRole('status', { name: 'Celestial Bodies changes' }),
      ).not.toBeEmptyDOMElement();

      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeEnabled();
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]).toEqual(
        expect.objectContaining({
          elements: ['fire', 'water'],
          celestialBodies: ['venus', 'Mercury'],
          zodiacSigns: ['Gemini'],
          colors: ['Fixture Red', 'Fixture Green'],
          categoryIds: [CATEGORY_B, CATEGORY_A],
          references: [
            { referenceId: OTHER_REFERENCE_ID, locator: '' },
            { referenceId: REFERENCE_ID, locator: 'p. 112' },
          ],
        }),
      );
    });
  });

  describe('its undo and redo', () => {
    const settle = () => act(async () => {});
    const listedIn = (card: HTMLElement) => openIn(card);

    it('takes an added variant out, and gives back the form typed for it, on one undo; a redo adds it again', async () => {
      renderForm({ workspaceId: WORKSPACE_ID });
      type(document.body, 'Name', 'Testwort');
      addVariant('Oil');
      await settle();
      expect(variant('Oil')).toBeInTheDocument();
      expect(newForm()).toHaveValue('');

      undo();

      noVariant('Oil');
      expect(newForm()).toHaveValue('Oil');

      redo();

      expect(variant('Oil')).toBeInTheDocument();
      expect(newForm()).toHaveValue('');
      // Leaving a field validates it; let that land inside the test.
      await act(async () => {});
    });

    it('opens the closed section an undone change was made in, and redoes it', async () => {
      renderForm({
        workspaceId: null,
        values: { ...EMPTY_VALUES, name: 'Testwort', nomenclature: 'none' },
      });
      openSections('Correspondences');
      type(document.body, 'Colour', 'Silver');
      fireEvent.click(screen.getByLabelText('Add Colour', { selector: 'button' }));
      await settle();
      const toggle = screen.getByRole('button', { name: 'Correspondences' });
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      act(() => toggle.focus());

      undo();

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByRole('button', { name: 'Remove Silver' })).toBeNull();

      redo();

      expect(screen.getByRole('button', { name: 'Remove Silver' })).toBeInTheDocument();
      // Leaving a field validates it; let that land inside the test.
      await act(async () => {});
    });

    it('opens the closed variant, and the closed section in it, that an undone change was made in', async () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');
      openSectionsIn(oil, 'Details & Care');
      type(oil, 'Description', 'Pressed from the fixture.');
      await settle();
      // Closed, Done and the section both, as a person tidies up after.
      fireEvent.click(sectionOf(oil, 'Details & Care'));
      fireEvent.click(editOf('Oil'));
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
      act(() => editOf('Oil').focus());

      undo();

      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true');
      expect(listedIn(variant('Oil'))).toEqual(['Details & Care']);
      expect(control(variant('Oil'), 'Description')).toHaveValue('');
    });
  });
});

// Where the focus lands after an undo: the variant a restore
// returned, or the box of the list inside a variant that changed.
describe('IngredientForm’s variants, undone', () => {
  const chord = (from: HTMLElement) => {
    act(() => from.focus());
    fireEvent.keyDown(from, { key: 'z', ctrlKey: true });
  };
  const name = () => control(document.body, 'Name');

  it('lands on the New Form box after a redo that only takes a variant out', async () => {
    renderForm({ workspaceId: WORKSPACE_ID });
    type(document.body, 'Name', 'Testwort');
    addVariant('Oil');
    fireEvent.click(within(variant('Oil')).getByRole('button', { name: 'Remove Oil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    chord(name());
    expect(control(variant('Oil'), 'Form')).toHaveFocus();

    act(() => name().focus());
    fireEvent.keyDown(name(), { key: 'z', ctrlKey: true, shiftKey: true });

    noVariant('Oil');
    expect(newForm()).toHaveFocus();
    // Leaving a field validates it; let that land inside the test.
    await act(async () => {});
  });

  it('lands on the box of a list inside a variant after undoing an entry added to it', async () => {
    renderForm({ workspaceId: WORKSPACE_ID });
    type(document.body, 'Name', 'Testwort');
    addVariant('Oil');
    addVariant('Herb');
    const herb = openWhole('Herb');
    type(herb, 'Colour', 'Silver');
    fireEvent.click(within(herb).getByLabelText('Add Colour', { selector: 'button' }));
    expect(within(herb).getByLabelText('Remove Silver')).toBeInTheDocument();

    chord(name());

    expect(within(variant('Herb')).queryByLabelText('Remove Silver')).toBeNull();
    expect(control(variant('Herb'), 'Colour')).toHaveFocus();
    // Leaving a field validates it; let that land inside the test.
    await act(async () => {});
  });
});
