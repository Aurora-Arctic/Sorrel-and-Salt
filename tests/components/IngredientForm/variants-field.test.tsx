import { act, fireEvent, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVariantFolds } from '@/components/IngredientForm/variants';
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  VARIANT_SECTION_KEYS,
} from '@/components/IngredientForm/values';
import { VARIANT_SECTIONS, openSectionsIn } from '../../support/ingredient-sections';
import { waitFor } from '../../support/ingredient-form';
import { press } from '../../support/interact';
import { WORKSPACE_ID } from '../../support/msw/ingredient-lookups';
import {
  HERB_VARIANT_ID,
  addVariant,
  control,
  editOf,
  newForm,
  noVariant,
  openIn,
  openVariant,
  renderVariants,
  sectionOf,
  sent,
  twoForms,
  type,
  variant,
} from './variants-harness';

// The Variants section on its own: a form added from the New Form box, refused there, removed by its own button, folded to a line and opened one at a time, each variant's sections folding under its own headings, and a form an admin has renamed settled by the member.
// It is rendered by ./variants-harness.tsx, the field on the form's resolver. What the whole form adds around it (a save opening the variant an error is in, Close All, undo, the unsaved-changes question, the save mutation) is variants.test.tsx's;
// a variant's copy buttons and substitutes are copy.test.tsx's and substitutes.test.tsx's (claude-docs/components/ingredient-form.md, "The variants").

const save = () => press('Save Ingredient');

describe('VariantsField', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists a variant added from the New Form box as its own fieldset, and sends it as a variant', async () => {
    const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID });

    addVariant('Oil');
    const oil = variant('Oil');
    expect(control(oil, 'Form')).toHaveValue('Oil');
    expect(newForm()).toHaveValue('');
    type(oil, 'Safety Notes', 'Dilute before use.');
    fireEvent.click(within(oil).getByRole('switch', { name: 'Toxic' }));
    save();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The form's own flag, the ingredient's left off beside it.
    expect(sent(onSubmit)?.toxic).toBe(false);
    expect(sent(onSubmit)?.variants).toEqual([
      {
        form: 'Oil',
        formId: '',
        description: '',
        safetyNotes: 'Dilute before use.',
        toxic: true,
        elements: [],
        celestialBodies: [],
        zodiacSigns: [],
        colors: [],
        categoryIds: [],
        substitutes: [],
        references: [],
      },
    ]);
  });

  it('refuses text the compendium’s New Form box has not picked, at Enter, adding nothing', () => {
    renderVariants({ workspaceId: null });

    type(document.body, 'New Form', 'Oyl');
    fireEvent.keyDown(newForm(), { key: 'Enter' });

    expect(newForm()).toBeInvalid();
    noVariant('Oyl');
  });

  // Its × asks first, and only removes: an open card stays open until the
  // answer, and Keep It leaves it so.
  it('removes a variant by its own button once confirmed, and sends the rest', async () => {
    const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID });

    addVariant('Oil');
    addVariant('Herb');
    fireEvent.click(within(variant('Oil')).getByRole('button', { name: 'Remove Oil' }));

    expect(variant('Oil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep It' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    noVariant('Oil');
    expect(variant('Herb')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
    expect(newForm()).toHaveFocus();
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sent(onSubmit)?.variants?.map(({ form }) => form)).toEqual(['Herb']);
  });

  it('keeps a variant, open as it was, when its removal is answered Keep It', async () => {
    renderVariants({ workspaceId: WORKSPACE_ID });

    addVariant('Oil');
    const remove = within(variant('Oil')).getByRole('button', { name: 'Remove Oil' });
    expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true');
    press(remove);
    press('Keep It');

    expect(variant('Oil')).toBeInTheDocument();
    expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
    expect(remove).toHaveFocus();
    // Leaving a field validates it; let that land inside the test.
    await act(async () => {});
  });

  it('refuses a repeat form at Add, folded as the save folds it, adding no second fieldset', () => {
    renderVariants({ workspaceId: WORKSPACE_ID });

    addVariant('Oil');
    addVariant('  oIL ');

    expect(screen.getAllByRole('group', { name: /oil/i })).toHaveLength(1);
    expect(newForm()).toBeInvalid();
    expect(newForm()).toHaveValue('  oIL ');
  });

  // Each variant one summary line, opened by its
  // Edit, one at a time, its fields hidden while closed but kept.
  describe('folded to a line', () => {
    it('opens an entry with every variant closed, its fields out of reach until Edit opens it', () => {
      renderVariants({ workspaceId: null, values: twoForms() });

      const edit = editOf('Oil');
      expect(edit).toHaveAttribute('aria-expanded', 'false');
      expect(edit).toHaveAccessibleDescription(/\S/);
      expect(within(variant('Oil')).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(edit);

      expect(edit).toHaveAttribute('aria-expanded', 'true');
      const region = document.getElementById(edit.getAttribute('aria-controls') ?? '');
      expect(region).toBeVisible();
      // The focus goes into the opened fields, to the first: Identity's
      // heading, its section closed as an edit's are.
      expect(sectionOf(variant('Oil'), 'Identity')).toHaveFocus();
      openSectionsIn(variant('Oil'), 'Details & Care');
      expect(within(variant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });

    it('closes on Done, the focus back on its Edit, and keeps what was typed', () => {
      renderVariants({ workspaceId: null, values: twoForms() });

      const oil = openVariant('Oil');
      openSectionsIn(oil, 'Details & Care');
      type(oil, 'Safety Notes', 'Dilute before use.');
      fireEvent.click(within(oil).getByRole('button', { name: 'Done with Oil' }));

      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
      expect(editOf('Oil')).toHaveFocus();
      expect(within(oil).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
      expect(within(openVariant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toHaveValue(
        'Dilute before use.',
      );
    });

    // An open variant's fields in the ingredient's
    // sections, a heading level beneath Variants.
    it('heads an open variant’s sections with the ingredient’s section headings, a level beneath Variants', () => {
      renderVariants({ workspaceId: null, values: twoForms() });

      const oil = openVariant('Oil');

      const headings = within(oil).getAllByRole('heading', { level: 4 });
      expect(headings.map((heading) => heading.textContent)).toEqual([
        'Identity',
        'Details & Care',
        'Correspondences',
        'Relations',
        'Sources',
      ]);
      expect(within(oil).queryByRole('heading', { level: 3 })).toBeNull();
    });

    it('keeps one variant open at a time', () => {
      renderVariants({ workspaceId: null, values: twoForms() });

      openVariant('Oil');
      fireEvent.click(editOf('Herb'));

      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'true');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens a variant as Add Variant adds it, closing the one open', () => {
      renderVariants({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true');
      addVariant('Herb');

      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'true');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
      // The New Form box keeps the focus, ready for the next.
      expect(newForm()).toHaveFocus();
    });

    // The box heads the section, the newest variant beneath it.
    it('lists a variant added beneath the New Form box, ahead of those before it', () => {
      renderVariants({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');
      addVariant('Herb');

      const cards = screen.getAllByRole('group', { name: /^(Oil|Herb)$/ });
      expect(cards).toEqual([variant('Herb'), variant('Oil')]);
      expect(
        newForm().compareDocumentPosition(cards[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  // An open variant's sections fold as the
  // ingredient's do, under its own headings.
  describe('a variant’s sections', () => {
    it('opens an existing variant with every section closed, each summarising what it holds', () => {
      renderVariants({
        workspaceId: null,
        values: twoForms({
          safetyNotes: 'Dilute before use.',
          celestialBodies: [{ value: 'Venus' }],
        }),
      });

      const oil = openVariant('Oil');

      expect(openIn(oil)).toEqual([]);
      for (const title of VARIANT_SECTIONS)
        expect(sectionOf(oil, title)).toHaveAccessibleDescription(/\S/);
      expect(sectionOf(oil, 'Details & Care')).toHaveAccessibleDescription(/Dilute before use\./);
      expect(sectionOf(oil, 'Correspondences')).toHaveAccessibleDescription(/Venus/);
      expect(within(oil).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
    });

    it('opens a variant added here with every section open, its fields in view', () => {
      renderVariants({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');

      const oil = variant('Oil');
      expect(openIn(oil)).toEqual(VARIANT_SECTIONS);
      expect(within(oil).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });

    it('opens and closes one section by its heading, leaving the variant’s others and the Variants section alone', () => {
      renderVariants({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');

      fireEvent.click(sectionOf(oil, 'Correspondences'));

      expect(openIn(oil)).toEqual(['Correspondences']);
      expect(control(oil, 'Celestial Body')).toBeVisible();
      // The section around it, a level up, stays as it was.
      expect(screen.getByRole('button', { name: 'Variants' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );

      fireEvent.click(sectionOf(oil, 'Correspondences'));
      expect(openIn(oil)).toEqual([]);
    });
  });

  // An admin's rename rewrites nothing of a coven's, so a coven's
  // variant can open holding "Wax" beside a pick now called "Beeswax", a pair
  // the service refuses at `form`. The member settles it.
  describe('a form an admin has renamed', () => {
    const WAX_ID = '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
    const renamed = {
      ...EMPTY_VALUES,
      name: 'Testwort',
      nomenclature: 'none' as const,
      variants: [
        {
          ...EMPTY_VARIANT,
          variantId: HERB_VARIANT_ID,
          form: 'Wax',
          formLink: { id: WAX_ID, name: 'Beeswax', group: 'Animal', icon: null, description: null },
          description: 'Melted from the fixture.',
        },
      ],
    };
    const openWax = () => {
      const card = openVariant('Wax');
      openSectionsIn(card, 'Identity');
      return card;
    };
    const choice = (card: HTMLElement, name: string) => within(card).getByRole('button', { name });

    it('refuses a save at the Form field until the member settles it, sending nothing', async () => {
      const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID, values: renamed });

      const card = openWax();
      expect(choice(card, 'Use "Beeswax"')).toBeInTheDocument();
      expect(choice(card, 'Keep "Wax"')).toBeInTheDocument();

      type(card, 'Description', 'Poured from the fixture.');
      save();

      await waitFor(() => expect(control(card, 'Form')).toBeInvalid());
      expect(control(card, 'Form')).toHaveAccessibleDescription(/Beeswax/);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('takes the new name on Use, and sends it with its pick', async () => {
      const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID, values: renamed });

      const card = openWax();
      fireEvent.click(choice(card, 'Use "Beeswax"'));

      expect(control(card, 'Form')).toHaveValue('Beeswax');
      expect(within(card).queryByRole('button', { name: 'Keep "Wax"' })).toBeNull();
      save();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(sent(onSubmit)?.variants).toEqual([
        expect.objectContaining({ id: HERB_VARIANT_ID, form: 'Beeswax', formId: WAX_ID }),
      ]);
    });

    it('keeps the text as typed on Keep, and sends it with no pick', async () => {
      const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID, values: renamed });

      const card = openWax();
      fireEvent.click(choice(card, 'Keep "Wax"'));

      expect(control(card, 'Form')).toHaveValue('Wax');
      expect(within(card).queryByRole('button', { name: 'Use "Beeswax"' })).toBeNull();
      save();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(sent(onSubmit)?.variants).toEqual([
        expect.objectContaining({ id: HERB_VARIANT_ID, form: 'Wax', formId: '' }),
      ]);
    });

    it('clears the refusal once settled, and saves', async () => {
      const onSubmit = renderVariants({ workspaceId: WORKSPACE_ID, values: renamed });

      const card = openWax();
      type(card, 'Description', 'Poured from the fixture.');
      save();
      await waitFor(() => expect(control(card, 'Form')).toBeInvalid());

      fireEvent.click(choice(card, 'Keep "Wax"'));

      expect(control(card, 'Form')).toBeValid();
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });
});

// `reconcile` re-keys the folds to a restored list. The form has no control
// that reorders variants, so the hook is driven directly here.
describe('useVariantFolds reconcile', () => {
  const [FIRST] = VARIANT_SECTION_KEYS;
  const [, SECOND] = VARIANT_SECTION_KEYS;
  const withIds = (...pairs: [string, string][]) =>
    pairs.map(([form, variantId]) => ({ form, variantId }));

  it("carries each row's folds with it when a restore only reorders", () => {
    const { result } = renderHook(() => useVariantFolds());
    const before = withIds(['Oil', 'a'], ['Herb', 'b']);
    act(() => result.current.toggle(0, FIRST));
    act(() => result.current.setCard(0));

    act(() => result.current.reconcile(before, withIds(['Herb', 'b'], ['Oil', 'a'])));

    expect(result.current.isOpen(1, FIRST)).toBe(true);
    expect(result.current.isOpen(0, FIRST)).toBe(false);
    expect(result.current.card).toBe(1);
  });

  it('closes the open card when the restore drops its row', () => {
    const { result } = renderHook(() => useVariantFolds());
    const before = withIds(['Oil', 'a'], ['Herb', 'b']);
    act(() => result.current.setCard(1));

    act(() => result.current.reconcile(before, withIds(['Oil', 'a'])));

    expect(result.current.card).toBeNull();
  });

  it("matches two unsaved blank-form rows one to one, so the second is not given the first's folds", () => {
    const { result } = renderHook(() => useVariantFolds());
    const before = [{ form: '' }, { form: '' }];
    act(() => result.current.toggle(0, FIRST));
    act(() => result.current.toggle(1, SECOND));

    act(() => result.current.reconcile(before, [{ form: '' }, { form: '' }]));

    expect(result.current.isOpen(0, FIRST)).toBe(true);
    expect(result.current.isOpen(1, FIRST)).toBe(false);
    expect(result.current.isOpen(1, SECOND)).toBe(true);
    expect(result.current.card).toBeNull();
  });

  it('opens the one row with no old match when its twin is matched', () => {
    const { result } = renderHook(() => useVariantFolds());
    act(() => result.current.reconcile([{ form: '' }], [{ form: '' }, { form: '' }]));

    expect(result.current.card).toBe(1);
    expect(result.current.isOpen(0, FIRST)).toBe(false);
    expect(result.current.isOpen(1, FIRST)).toBe(true);
  });
});
