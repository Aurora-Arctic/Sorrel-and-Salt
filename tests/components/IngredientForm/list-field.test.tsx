import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Suggestions } from '@/components/Combobox/types';
import { ListField, MultiSelectField } from '@/components/IngredientForm/fields';
import type {
  IngredientElement,
  IngredientFormInput,
  IngredientFormValues,
  ListOption,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import { sortableModule } from '@/components/Combobox/lazy-sortable';
import { press, type } from '../../support/interact';
import { layOutChips, moveByKeyboard } from '../../support/sortable';
import type { Variant } from './types';

// claude-docs/components/ingredient-form.md, "Stories and tests"

const PLAIN: Variant = {
  variant: 'plain',
  name: 'substitutes',
  legend: 'Substitute Ingredients',
  entry: 'Substitute Ingredient',
};
const ORDERED: Variant = {
  variant: 'ordered',
  name: 'colors',
  legend: 'Colours',
  entry: 'Colour',
  ordered: true,
};
const FOLK_NAME: Variant = {
  variant: 'folk-name',
  name: 'folkNames',
  legend: 'Folk Names',
  entry: 'Folk Name',
};
const PICK_ONLY: Variant = {
  variant: 'pick-only',
  name: 'deities',
  legend: 'Deities',
  entry: 'Deity',
  pickOnly: true,
};
const VARIANTS = [PLAIN, PICK_ONLY];
const DEITIES: Variant = {
  variant: 'deities',
  name: 'deities',
  legend: 'Deities',
  entry: 'Deity',
  ordered: true,
};

/** The two shapes a list sends a typed entry in: the folk names, celestial bodies, signs and colours as text, a deity or substitute as a name (DESIGN.md §5, `ingredient_deities` and `ingredient_substitutes`). */
const LISTS: (Omit<Variant, 'variant'> & { sent: (values: string[]) => unknown })[] = [
  { ...FOLK_NAME, sent: (values) => values },
  { ...PLAIN, sent: (values) => values.map((name) => ({ name })) },
];

const FIXTURES = ['First Fixture', 'Second Fixture', 'Third Fixture'];
const offer = (values: string[]): Suggestions<ListOption> => ({
  options: values.map((value) => ({ value, curated: true })),
  pending: false,
});

/** A pick-only list is given a source, since a pick is its only way in; the Name box is there for what a folk name is judged against. */
function renderList(
  { name, legend, entry, ordered, pickOnly }: Omit<Variant, 'variant'>,
  {
    values = {},
    suggestions = pickOnly ? offer(FIXTURES) : undefined,
  }: {
    values?: Partial<IngredientFormValues>;
    suggestions?: Suggestions<ListOption>;
  } = {},
) {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort', ...values },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <input aria-label="Name" {...methods.register('name')} />
          <ListField
            name={name}
            legend={legend}
            entry={entry}
            ordered={ordered}
            pickOnly={pickOnly}
            suggestions={suggestions}
          />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  render(<Harness />);
  return onSubmit;
}

const box = (entry: string) => screen.getByRole('combobox', { name: entry });
const group = (legend: string) => screen.getByRole('group', { name: legend });
const entries = (legend: string) =>
  within(group(legend))
    .queryAllByRole('button', { name: /^Remove / })
    .map((button) => button.getAttribute('aria-label'));
const changes = (legend: string) =>
  within(group(legend)).getByRole('status', { name: `${legend} changes` });
const removeButton = (value: string) => screen.getByRole('button', { name: `Remove ${value}` });
const addButton = (entry: string) => screen.getByRole('button', { name: `Add ${entry}` });
const add = ({ entry, pickOnly }: Omit<Variant, 'variant'>, value: string) => {
  type(entry, value);
  if (pickOnly) fireEvent.click(screen.getByRole('option', { name: value.trim() }));
  else fireEvent.click(addButton(entry));
};
const saveIngredient = () => press('Save Ingredient');
const settle = () => act(async () => {});

function expectErrorOn(control: HTMLElement) {
  expect(control).toBeInvalid();
  expect(control).toHaveAccessibleDescription(/\S/);
}

describe('ListField', () => {
  describe.each(VARIANTS)('the $variant list', (variant) => {
    const { legend, entry, pickOnly } = variant;

    it('starts with one empty box and no entries, Add offered only where text is added', () => {
      renderList(variant);

      expect(within(group(legend)).getAllByRole('combobox')).toHaveLength(1);
      expect(box(entry)).toHaveValue('');
      expect(within(group(legend)).queryByRole('list')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `Clear ${legend}` })).not.toBeInTheDocument();
      const adds = screen.queryByRole('button', { name: `Add ${entry}` });
      if (pickOnly) expect(adds).not.toBeInTheDocument();
      else expect(adds).toBeInTheDocument();
    });

    it('adds an entry, clearing and keeping the box focused, and says so', () => {
      renderList(variant);

      add(variant, '  First Fixture ');

      expect(entries(legend)).toEqual(['Remove First Fixture']);
      expect(box(entry)).toHaveValue('');
      expect(box(entry)).toHaveFocus();
      expect(changes(legend)).toHaveTextContent('First Fixture');
    });
  });

  describe('the plain list', () => {
    const variant = PLAIN;
    const { legend, entry, name } = variant;

    it('removes an entry from its x, returning the focus to the box, and says so', () => {
      renderList(variant);

      add(variant, 'First Fixture');
      add(variant, 'Second Fixture');
      expect(entries(legend)).toEqual(['Remove First Fixture', 'Remove Second Fixture']);
      fireEvent.click(removeButton('First Fixture'));

      expect(entries(legend)).toEqual(['Remove Second Fixture']);
      expect(changes(legend)).toHaveTextContent('First Fixture');
      expect(box(entry)).toHaveFocus();
    });

    it('removes the last entry on Backspace in the empty box, announcing it, and none with text in it', () => {
      renderList(variant);

      add(variant, 'First Fixture');
      add(variant, 'Second Fixture');
      type(entry, 'Thi');
      fireEvent.keyDown(box(entry), { key: 'Backspace' });
      expect(entries(legend)).toEqual(['Remove First Fixture', 'Remove Second Fixture']);

      type(entry, '');
      const added = changes(legend).textContent;
      fireEvent.keyDown(box(entry), { key: 'Backspace' });

      expect(entries(legend)).toEqual(['Remove First Fixture']);
      expect(changes(legend)).not.toHaveTextContent(added ?? '');
      expect(changes(legend)).toHaveTextContent('Second Fixture');
      expect(box(entry)).toHaveFocus();
    });

    it('clears every entry from Clear, announcing it and keeping the box focused', () => {
      renderList(variant);

      add(variant, 'First Fixture');
      add(variant, 'Second Fixture');
      expect(entries(legend)).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: `Clear ${legend}` }));

      expect(entries(legend)).toEqual([]);
      expect(changes(legend)).toHaveTextContent(legend);
      expect(box(entry)).toHaveFocus();
      expect(screen.queryByRole('button', { name: `Clear ${legend}` })).not.toBeInTheDocument();
    });

    // Given the repeat, since the box refuses one at Add and the source
    // never offers one: an error names an entry by its index, and
    // reads on the box through the list's one error element.
    it('marks an error on the entry it names alone, and clears it once that entry is removed', async () => {
      const onSubmit = renderList(variant, {
        values: { [name]: [{ value: 'First Fixture' }, { value: 'first fixture' }] },
      });
      expect(entries(legend)).toEqual(['Remove First Fixture', 'Remove first fixture']);

      saveIngredient();

      await waitFor(() => expectErrorOn(box(entry)));
      expect(removeButton('first fixture')).toHaveAccessibleDescription(/\S/);
      expect(removeButton('First Fixture')).not.toHaveAccessibleDescription();
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.click(removeButton('first fixture'));

      await waitFor(() => expect(box(entry)).not.toBeInvalid());
      expect(box(entry)).not.toHaveAccessibleDescription();
    });
  });

  describe('a box that is typed into', () => {
    const { entry, legend } = PLAIN;

    it('adds on Enter without saving the form', async () => {
      const onSubmit = renderList(PLAIN);

      type(entry, 'First Fixture');
      fireEvent.keyDown(box(entry), { key: 'Enter' });
      await settle();

      expect(entries(legend)).toEqual(['Remove First Fixture']);
      expect(box(entry)).toHaveValue('');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('adds nothing when the box is blank, from Add or from Enter', () => {
      renderList(PLAIN);

      type(entry, '   ');
      fireEvent.click(addButton(entry));
      fireEvent.keyDown(box(entry), { key: 'Enter' });

      expect(entries(legend)).toEqual([]);
      expect(box(entry)).not.toBeInvalid();
    });

    it('refuses to save with text left in the box, until it is added or cleared', async () => {
      const onSubmit = renderList(PLAIN);

      add(PLAIN, 'First Fixture');
      type(entry, 'Second Fixture');
      saveIngredient();

      await waitFor(() => expectErrorOn(box(entry)));
      expect(box(entry)).toHaveFocus();
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.click(addButton(entry));
      await waitFor(() => expect(box(entry)).not.toBeInvalid());
      type(entry, 'Stray Fixture');
      saveIngredient();
      await waitFor(() => expect(box(entry)).toBeInvalid());
      type(entry, '');

      await waitFor(() => expect(box(entry)).not.toBeInvalid());
      saveIngredient();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].substitutes).toEqual([
        { name: 'First Fixture' },
        { name: 'Second Fixture' },
      ]);
    });
  });

  describe('a repeat at a box with a source', () => {
    const { entry, legend } = PLAIN;
    const listed = () => within(group(legend)).queryAllByRole('button', { name: /^Remove / });

    it('adds nothing at Add, keeps the text, and says why at the box', () => {
      renderList(PLAIN, { suggestions: offer(FIXTURES) });

      add(PLAIN, 'First Fixture');
      add(PLAIN, '  first FIXTURE ');

      expect(listed()).toHaveLength(1);
      expect(box(entry)).toHaveValue('  first FIXTURE ');
      expectErrorOn(box(entry));
      expect(changes(legend)).toHaveTextContent('first FIXTURE');
      expect(box(entry)).toHaveFocus();
    });

    it('clears the refusal once the text is edited, and adds what is no repeat', () => {
      renderList(PLAIN, { suggestions: offer(FIXTURES) });

      add(PLAIN, 'First Fixture');
      add(PLAIN, 'first fixture');
      expect(box(entry)).toBeInvalid();
      type(entry, 'first fixtures');

      expect(box(entry)).not.toBeInvalid();
      expect(box(entry)).not.toHaveAccessibleDescription();
      expect(
        screen.getByRole('option', { name: 'Use what you typed: first fixtures' }),
      ).toBeInTheDocument();
      fireEvent.click(addButton(entry));
      expect(listed()).toHaveLength(2);
      expect(changes(legend)).toHaveTextContent('first fixtures');
    });
  });

  describe('a repeat at a pick-only box', () => {
    const { entry, legend } = PICK_ONLY;

    it('refuses Enter on text not picked, keeping it to search on, and says why', () => {
      renderList(PICK_ONLY);

      type(entry, 'Mockury');
      fireEvent.keyDown(box(entry), { key: 'Enter' });

      expect(entries(legend)).toEqual([]);
      expect(box(entry)).toHaveValue('Mockury');
      expectErrorOn(box(entry));
      expect(changes(legend)).toHaveTextContent('Mockury');
      expect(box(entry)).toHaveFocus();
    });

    it('clears the refusal once the text is edited, and a pick adds', () => {
      renderList(PICK_ONLY);

      type(entry, 'Mockury');
      fireEvent.keyDown(box(entry), { key: 'Enter' });
      expect(box(entry)).toBeInvalid();
      type(entry, 'First');

      expect(box(entry)).not.toBeInvalid();
      fireEvent.click(screen.getByRole('option', { name: 'First Fixture' }));
      expect(entries(legend)).toEqual(['Remove First Fixture']);
      expect(box(entry)).toHaveValue('');
      expect(changes(legend)).toHaveTextContent('First Fixture');
    });

    it('offers the curated rows alone, flat, less what is listed, and never the typed row', () => {
      renderList(PICK_ONLY, {
        values: { deities: [{ value: 'Second Fixture' }] },
        suggestions: {
          options: [
            { value: 'First Fixture', curated: true },
            { value: 'Second Fixture', curated: true },
            { value: 'Fixture In Use', curated: false },
          ],
          pending: false,
        },
      });
      expect(entries(legend)).toEqual(['Remove Second Fixture']);

      type(entry, 'fix');

      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'First Fixture',
      ]);
      expect(screen.queryByRole('group', { name: 'From Compendium' })).not.toBeInTheDocument();
    });
  });

  it('keeps the list open after a pick, with the focus in the box, for the next', () => {
    const { entry, legend } = PICK_ONLY;
    renderList(PICK_ONLY);

    box(entry).focus();
    fireEvent.keyDown(box(entry), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: 'First Fixture' }));

    expect(entries(legend)).toEqual(['Remove First Fixture']);
    expect(box(entry)).toHaveAttribute('aria-expanded', 'true');
    expect(box(entry)).toHaveFocus();
    fireEvent.click(screen.getByRole('option', { name: 'Second Fixture' }));
    expect(entries(legend)).toEqual(['Remove First Fixture', 'Remove Second Fixture']);

    fireEvent.keyDown(box(entry), { key: 'Escape' });
    expect(box(entry)).toHaveAttribute('aria-expanded', 'false');
  });

  it('refuses a folk name repeating the name, at the box, and offers it from no source', () => {
    const { entry, legend } = FOLK_NAME;
    renderList(FOLK_NAME, { suggestions: offer(['Testwort', 'Hedge Fixture']) });

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Hedge Fixture' },
    });
    type(entry, ' hedge fixture');

    expect(screen.getByRole('option', { name: 'Testwort' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hedge Fixture' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Use what you typed: hedge fixture' }),
    ).not.toBeInTheDocument();
    fireEvent.click(addButton(entry));

    expect(entries(legend)).toEqual([]);
    expect(box(entry)).toHaveValue(' hedge fixture');
    expectErrorOn(box(entry));
  });

  describe('a source beside the listed entries', () => {
    const GREEK = {
      id: '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d',
      tradition: 'Greek',
      description: null,
    };
    const ROMAN = {
      id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
      tradition: 'Roman',
      description: null,
    };
    const hecates: Suggestions<ListOption> = {
      options: [
        { value: 'Hecate', label: 'Hecate (Greek)', curated: true, link: GREEK },
        { value: 'Hecate', label: 'Hecate (Roman)', curated: true, link: ROMAN },
        { value: 'Hecate Fixturia', curated: false },
      ],
      pending: false,
    };
    const COMPENDIUM = {
      id: '0d4f2c1a-6b3e-4a5d-8c7f-9e0a1b2c3d4e',
      canonicalName: null,
      forms: ['Dried leaf'],
      description: null,
      isGlobal: true,
    };
    const COVEN = { ...COMPENDIUM, id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', isGlobal: false };
    const mockworts: Suggestions<ListOption> = {
      options: [
        { value: 'Mockwort', note: 'Compendium entry', key: COMPENDIUM.id, link: COMPENDIUM },
        { value: 'Mockwort', note: 'This coven’s entry', key: COVEN.id, link: COVEN },
      ],
      pending: false,
    };
    const typedRow = (text: string) =>
      screen.queryByRole('option', { name: `Use what you typed: ${text}` });

    it('leaves out a listed deity by its id, so Roman Hecate is offered beside a listed Greek one', () => {
      renderList(DEITIES, {
        values: { deities: [{ value: 'Hecate', link: GREEK }] },
        suggestions: hecates,
      });
      expect(entries(DEITIES.legend)).toEqual(['Remove Hecate (Greek)']);

      type(DEITIES.entry, 'hecate');

      expect(screen.getByRole('option', { name: 'Hecate (Roman)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Hecate Fixturia' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Hecate (Greek)' })).not.toBeInTheDocument();
      // Text beside a link is no repeat, as at save: what was typed is offered, and added.
      expect(typedRow('hecate')).toBeInTheDocument();
      fireEvent.keyDown(box(DEITIES.entry), { key: 'Enter' });
      expect(entries(DEITIES.legend)).toEqual(['Remove Hecate (Greek)', 'Remove hecate']);
    });

    it('leaves out a deity only in use once its name is listed, among the typed ones', () => {
      renderList(DEITIES, {
        values: { deities: [{ value: 'hecate fixturia' }] },
        suggestions: hecates,
      });
      expect(entries(DEITIES.legend)).toEqual(['Remove hecate fixturia']);

      type(DEITIES.entry, 'Hecate Fixturia');

      expect(screen.getByRole('option', { name: 'Hecate (Greek)' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Hecate Fixturia' })).not.toBeInTheDocument();
      expect(typedRow('Hecate Fixturia')).not.toBeInTheDocument();
    });

    it('leaves out a listed substitute by its ingredient’s id, and takes its name as typed text', () => {
      const { entry, legend } = PLAIN;
      renderList(PLAIN, {
        values: { substitutes: [{ value: 'Mockwort', link: COVEN }] },
        suggestions: mockworts,
      });
      expect(entries(legend)).toEqual(['Remove Mockwort']);

      type(entry, 'mockwort');

      expect(screen.getByRole('option', { name: 'Mockwort Compendium entry' })).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Mockwort This coven’s entry' }),
      ).not.toBeInTheDocument();
      // The suggestion reads as what was typed, so no typed row repeats it:
      // Enter with nothing highlighted still adds the name as typed text.
      expect(typedRow('mockwort')).not.toBeInTheDocument();
      fireEvent.keyDown(box(entry), { key: 'Enter' });
      expect(entries(legend)).toEqual(['Remove Mockwort', 'Remove mockwort']);

      type(entry, ' MOCKWORT ');
      expect(typedRow('MOCKWORT')).not.toBeInTheDocument();
      fireEvent.keyDown(box(entry), { key: 'Enter' });
      expectErrorOn(box(entry));
      expect(entries(legend)).toHaveLength(2);
    });
  });

  describe('moving an entry', () => {
    const { entry, legend } = ORDERED;
    const handle = (value: string) =>
      within(group(legend)).getByRole('button', { name: `Move ${value}` });
    const announced = () =>
      within(group(legend))
        .getAllByRole('status')
        .map((region) => region.textContent)
        .join(' | ');

    // The handles arrive with the sortable list, which loads apart; loaded first, it draws on the first render.
    beforeAll(() => sortableModule.load());
    beforeEach(layOutChips);
    afterEach(() => vi.restoreAllMocks());

    it('offers a handle to move an entry by only on an ordered list', () => {
      renderList(ORDERED);
      renderList(PLAIN);
      for (const list of [ORDERED, PLAIN]) {
        add(list, 'First Fixture');
        add(list, 'Second Fixture');
        // The precondition: both entries are drawn, each with its x.
        expect(entries(list.legend)).toEqual(['Remove First Fixture', 'Remove Second Fixture']);
      }

      const handles = (list: Variant) =>
        within(group(list.legend))
          .queryAllByRole('button', { name: /^Move / })
          .map((button) => button.getAttribute('aria-label'));
      expect(handles(ORDERED)).toEqual(['Move First Fixture', 'Move Second Fixture']);
      expect(handles(PLAIN)).toEqual([]);
    });

    it('moves one by keyboard, says so, keeps the focus on it, and sends the new order', async () => {
      const onSubmit = renderList(ORDERED);

      for (const value of FIXTURES) add(ORDERED, value);
      await moveByKeyboard(handle('Third Fixture'), 'ArrowLeft', 'ArrowLeft');

      expect(entries(legend)).toEqual([
        'Remove Third Fixture',
        'Remove First Fixture',
        'Remove Second Fixture',
      ]);
      expect(announced()).toMatch(/Third Fixture\D+1\D+3/);
      expect(handle('Third Fixture')).toHaveFocus();
      saveIngredient();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].colors).toEqual([
        'Third Fixture',
        'First Fixture',
        'Second Fixture',
      ]);
    });

    // An error names an entry by its index, so a move that shifts the entry
    // it names must carry the error with it.
    it('keeps an error on the entry it names when another entry moves past it', async () => {
      renderList(ORDERED, {
        values: {
          colors: ['First Fixture', 'Second Fixture', 'first fixture'].map((value) => ({ value })),
        },
      });

      saveIngredient();
      await waitFor(() => expect(removeButton('first fixture')).toHaveAccessibleDescription(/\S/));
      await moveByKeyboard(handle('Second Fixture'), 'ArrowRight');

      expect(entries(legend)).toEqual([
        'Remove First Fixture',
        'Remove first fixture',
        'Remove Second Fixture',
      ]);
      await waitFor(() => expect(removeButton('first fixture')).toHaveAccessibleDescription(/\S/));
      expect(removeButton('Second Fixture')).not.toHaveAccessibleDescription();
      expect(box(entry)).toBeInvalid();
    });
  });

  describe.each(LISTS)('the $legend list', (list) => {
    it('sends the entries in order, less any removed', async () => {
      const onSubmit = renderList(list);

      for (const value of FIXTURES) add(list, value);
      expect(entries(list.legend)).toHaveLength(3);
      fireEvent.click(removeButton('Second Fixture'));
      saveIngredient();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0][list.name]).toEqual(
        list.sent(['First Fixture', 'Third Fixture']),
      );
    });
  });

  // Given the repeat, since the lookup never offers a listed deity:
  // the error names the pick as its pill reads, with its tradition.
  it('refuses the same deity picked twice, beside the repeat, named with its tradition', async () => {
    const greek = {
      value: 'Hecate',
      link: { id: '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d', tradition: 'Greek', description: null },
    };
    const onSubmit = renderList(PICK_ONLY, { values: { deities: [greek, greek] } });
    expect(entries(PICK_ONLY.legend)).toEqual(['Remove Hecate (Greek)', 'Remove Hecate (Greek)']);

    saveIngredient();

    await waitFor(() => expectErrorOn(box(PICK_ONLY.entry)));
    expect(box(PICK_ONLY.entry)).toHaveAccessibleDescription(
      expect.stringContaining('Hecate (Greek)'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('marks a refused link beside its pill, named by its formal name too', async () => {
    const linked = {
      value: 'Mockleaf',
      link: {
        id: '3f6c1d2e-8a4b-4c5d-9e0f-1a2b3c4d5e6f',
        canonicalName: 'Fixtura testalis',
        forms: ['Dried leaf'],
        description: 'A fixture herb.',
        isGlobal: true,
      },
    };
    const onSubmit = renderList(PLAIN, {
      values: { substitutes: [linked, { value: 'Zest Root' }, { ...linked, value: 'Mockleaf' }] },
    });

    saveIngredient();

    await waitFor(() => expectErrorOn(box(PLAIN.entry)));
    expect(box(PLAIN.entry)).toHaveAccessibleDescription(
      expect.stringContaining('Mockleaf (Fixtura testalis)'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('MultiSelectField, given its values', () => {
  function renderElements(elements: IngredientElement[]) {
    const onSubmit = vi.fn();
    const Harness = () => {
      const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
        defaultValues: { ...EMPTY_VALUES, name: 'Testwort', elements },
        resolver: ingredientResolver,
      });
      return (
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <MultiSelectField
              name="elements"
              label="Element"
              placeholder="Choose elements"
              options={[
                { value: 'earth', label: 'Earth' },
                { value: 'air', label: 'Air' },
                { value: 'fire', label: 'Fire' },
                { value: 'water', label: 'Water' },
                { value: 'spirit', label: 'Spirit' },
              ]}
            />
            <button type="submit">Save Ingredient</button>
          </form>
        </FormProvider>
      );
    };
    render(<Harness />);
    return onSubmit;
  }

  it('prefills them as chips, in the order held, and offers only the rest', () => {
    renderElements(['water', 'earth']);

    expect(
      screen
        .getAllByRole('button', { name: /^Remove / })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Remove Water', 'Remove Earth']);
    fireEvent.click(box('Element'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByRole('option', { name: 'Water' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Earth' })).not.toBeInTheDocument();
  });

  it('shows a repeat the schema refuses on the Element control', async () => {
    const onSubmit = renderElements(['fire', 'fire']);

    saveIngredient();

    await waitFor(() => expectErrorOn(box('Element')));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
