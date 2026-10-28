import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormIcon from '@/components/FormIcon';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  SpellIngredientSuggestionsQuery,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { UNMEASURABLE_UNIT } from '@/modules/grimoire/validation/step-unit';
import type { Unit } from '@/modules/ingredients/schema/units';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The spell builder's Add to Jar (M10.15, stories 49, 50, 57 and 77): the
// ingredient picker, a one-off ingredient, each step's quantity and unit, and
// Remove. The picker's answers come from MSW in /api/graphql's shape. That a
// save writes the ingredient and form ids and never a cupboard entry, and who
// may save one, is tests/modules/grimoire/services/spell-ingredient-steps.test.ts's.

type Edge = SpellIngredientSuggestionsQuery['ingredientSuggestions']['edges'][number];

/** Ids in the shape the schema reads: a step’s ids are checked as GUIDs before a save. */
const ID = {
  rosewort: '00000000-0000-4000-8000-000000000001',
  roseLeaf: '00000000-0000-4000-8000-000000000002',
  mockroot: '00000000-0000-4000-8000-000000000003',
  mockRoot: '00000000-0000-4000-8000-000000000004',
  twinwort: '00000000-0000-4000-8000-000000000005',
  twinLeaf: '00000000-0000-4000-8000-000000000006',
  twinSeed: '00000000-0000-4000-8000-000000000007',
  savedRosewort: '00000000-0000-4000-8000-000000000008',
  savedOneOff: '00000000-0000-4000-8000-000000000009',
};

interface FormSpec {
  id: string;
  form: string;
  icon?: FormGroupIcon | null;
  categories?: string[];
  /** The unit of the coven's jar of this form; left out, the coven holds none. */
  jar?: Unit;
  /** How much that jar holds, and its low-stock threshold (M10.19); left out, it is held unweighed. */
  held?: number | null;
  threshold?: number | null;
  /** This form's own flag and notes (M10.18). */
  toxic?: boolean;
  safetyNotes?: string;
}

const category = (name: string) => ({ id: `c-${name}`, name });

/** One ingredient as the suggestions answer it, in `group`. */
function suggestion(
  group: 'yours' | 'compendium',
  id: string,
  name: string,
  forms: FormSpec[],
  categories: string[] = [],
  safety: { toxic?: boolean; safetyNotes?: string } = {},
): Edge {
  return {
    group,
    node: {
      id,
      name,
      canonicalName: null,
      retired: false,
      toxic: safety.toxic ?? false,
      safetyNotes: safety.safetyNotes ?? null,
      cupboardEntry: null,
      categories: categories.map(category),
      variants: forms.map((form) => ({
        id: form.id,
        form: form.form,
        toxic: form.toxic ?? false,
        safetyNotes: form.safetyNotes ?? null,
        categories: (form.categories ?? []).map(category),
        formChoice: form.icon === undefined ? null : { group: { icon: form.icon } },
      })),
      stock: forms.flatMap((form) =>
        form.jar
          ? [
              {
                unit: form.jar,
                quantityOnHand: form.held ?? null,
                lowStockThreshold: form.threshold ?? null,
                variant: { id: form.id },
              },
            ]
          : [],
      ),
    },
  };
}

const ROSEWORT = suggestion(
  'yours',
  ID.rosewort,
  'Fixture Rosewort',
  [{ id: ID.roseLeaf, form: 'dried leaf', icon: 'botanical', categories: ['Calm'], jar: 'g' }],
  ['Love'],
);
const MOCKROOT = suggestion(
  'compendium',
  ID.mockroot,
  'Fixture Mockroot',
  [{ id: ID.mockRoot, form: 'root', icon: 'mineral' }],
  ['Love', 'Protection'],
);

function suggest(...edges: Edge[]) {
  mockGraphQLQuery<SpellIngredientSuggestionsQuery>('SpellIngredientSuggestions', () => ({
    ingredientSuggestions: { edges },
  }));
}

/** The spell a save answers: the fields as sent, and steps as `steps`. */
function answer(id: string, revision: number, steps: SpellBuilderSpell['steps'] = []) {
  return {
    id,
    revision,
    title: null,
    intent: null,
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    visibility: 'workspace' as const,
    status: 'draft' as const,
    steps,
  };
}

function acceptCreate(steps: SpellBuilderSpell['steps'] = []) {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: answer('s1', 1, steps) };
    },
  );
  return calls;
}

function acceptUpdate(steps: SpellBuilderSpell['steps'] = []) {
  const calls: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>(
    'UpdateSpell',
    (variables) => {
      calls.push(variables);
      return { updateSpell: answer(String(variables.id), 5, steps) };
    },
  );
  return calls;
}

function renderBuilder(
  props: Partial<SpellBuilderProps> = {},
  categories: Parameters<typeof offerCategories>[0] = [],
) {
  // The builder reads the coven's categories as it opens (M10.14).
  offerCategories(categories);
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
}

const search = () => screen.getByRole('combobox', { name: 'Add to Jar' });
const steps = () => screen.getByRole('list', { name: 'Steps' });
const stepRows = () => within(steps()).queryAllByRole('listitem');
const stepRow = (text: string) => {
  const row = stepRows().find((item) => item.textContent?.includes(text));
  if (!row) throw new Error(`No step reads ${text}`);
  return row;
};
/** Opens a closed step's fields with its pencil (M10.16): one row is open at a time. */
const openRow = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Edit ${name}`, expanded: false }));
const save = () => screen.getByRole('button', { name: /^Sav/ });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);

/** Types into the picker and waits for `option` to be offered. */
async function lookUp(text: string, option: string | RegExp): Promise<HTMLElement> {
  act(() => search().focus());
  fireEvent.change(search(), { target: { value: text } });
  return screen.findByRole('option', { name: option });
}

/** Picks `option` from the picker for `text`: Add to Jar. */
async function add(text: string, option: string | RegExp): Promise<void> {
  fireEvent.click(await lookUp(text, option));
}

/** Types a name into the box and picks its first row: a one-off ingredient. */
async function addOneOff(name: string): Promise<void> {
  await add(name, `Add "${name}" as a one-off ingredient`);
}

/** Chooses `unit` from a step row's Unit list. */
function chooseUnit(row: HTMLElement, unit: string): void {
  fireEvent.click(within(row).getByRole('combobox', { name: /^Unit/ }));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: /^Unit.* choices$/ })).getByRole('option', {
      name: unit,
    }),
  );
}

/** The markup a row's icon draws, to tell which group's icon it is. */
const iconOf = (row: HTMLElement) => row.querySelector('svg.form-icon')?.innerHTML;
const drawn = (name: FormGroupIcon | null) => {
  const { container, unmount } = render(<FormIcon name={name} />);
  const markup = container.querySelector('svg')?.innerHTML;
  unmount();
  return markup;
};

describe('the spell builder’s Add to Jar', () => {
  it('lists the coven’s ingredients and the compendium’s under two headings', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();

    await lookUp('Fixture', /Fixture Mockroot/);

    const yours = screen.getByRole('group', { name: 'Your Ingredients' });
    const compendium = screen.getByRole('group', { name: 'Compendium' });
    expect(within(yours).getByRole('option', { name: /Fixture Rosewort/ })).toBeInTheDocument();
    expect(within(yours).queryByRole('option', { name: /Fixture Mockroot/ })).toBeNull();
    expect(
      within(compendium).getByRole('option', { name: /Fixture Mockroot/ }),
    ).toBeInTheDocument();
  });

  it('offers each form of an ingredient as its own row, then the one-off row for what was typed', async () => {
    suggest(
      suggestion('yours', ID.twinwort, 'Fixture Twinwort', [
        { id: ID.twinLeaf, form: 'leaf' },
        { id: ID.twinSeed, form: 'seed' },
      ]),
    );
    renderBuilder();

    await lookUp('Fixture', /Fixture Twinwort \(Seed\)/);

    // The one-off row stands first, the row nearest the box the list opens beneath.
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Add "Fixture" as a one-off ingredient',
      expect.stringContaining('Fixture Twinwort (Leaf)'),
      expect.stringContaining('Fixture Twinwort (Seed)'),
    ]);
  });

  it('adds a picked form as a step showing its form’s icon, and empties the search', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    expect(stepRows()).toHaveLength(0);

    await add('Rose', /Fixture Rosewort/);

    expect(stepRows()).toHaveLength(1);
    const row = stepRow('Fixture Rosewort');
    expect(row).toHaveTextContent('Dried Leaf');
    expect(iconOf(row)).toBe(drawn('botanical'));
    expect(search()).toHaveValue('');
    expect(save()).toBeEnabled();
  });

  // Story 51 typed its second ingredient as the first was added; the new
  // step's Quantity took the focus a render later, and the list never opened.
  it('keeps the focus in the search after a pick, so the next ingredient can be typed', async () => {
    suggest(ROSEWORT);
    renderBuilder();

    await add('Rose', /Fixture Rosewort/);

    expect(stepRows()).toHaveLength(1);
    expect(search()).toHaveFocus();
  });

  it('adds a form again for another step: its row stays pickable and the jar gets two rows', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);

    const again = await lookUp('Rose', /Fixture Rosewort/);
    expect(again).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(again);

    expect(stepRows()).toHaveLength(2);
  });

  it('adds a one-off ingredient from the box’s first row, drawn with the generic spoon, and opens it for its form', async () => {
    suggest();
    renderBuilder();

    await addOneOff('Testwort');

    const row = stepRow('Testwort');
    expect(within(row).getByText('One-Off')).toBeInTheDocument();
    expect(iconOf(row)).toBe(drawn(null));
    expect(search()).toHaveValue('');
    fireEvent.change(within(row).getByRole('textbox', { name: /^Form/ }), {
      target: { value: 'Dried Root' },
    });
    expect(within(row).getByRole('textbox', { name: /^Form/ })).toHaveValue('Dried Root');
    expect(within(row).getByRole('button', { name: 'One-Off' })).toHaveAccessibleDescription(
      'Used in this spell only; not kept in your cupboard.',
    );
    expect(within(row).queryByText(/Used in this spell only/, { selector: 'p' })).toBeNull();
  });

  it('offers no one-off row for an empty box, and refuses one already in the jar', async () => {
    suggest();
    renderBuilder();
    act(() => search().focus());
    fireEvent.change(search(), { target: { value: '   ' } });
    expect(screen.queryByRole('option', { name: /as a one-off ingredient/ })).toBeNull();

    await addOneOff('Testwort');
    await addOneOff('testwort');

    expect(stepRows()).toHaveLength(1);
    expect(search()).toHaveAccessibleDescription('This ingredient is already in the jar');
  });

  it('saves each step as its ingredient and form, or its one-off name and form, with its amount', async () => {
    suggest(ROSEWORT);
    const calls = acceptCreate();
    renderBuilder();

    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '2' },
    });
    chooseUnit(row, 'g');
    await addOneOff('Testwort');
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    // Only the ids a step stores: the picker never hands over a cupboard entry or a jar.
    expect(calls[0]?.input.steps).toEqual([
      { ingredientId: ID.rosewort, variantId: ID.roseLeaf, quantity: 2, unit: 'g' },
      { name: 'Testwort' },
    ]);
  });

  it('renames a one-off in its open row: the header follows, a repeat or a blank is refused, and the save carries the new name', async () => {
    suggest();
    const calls = acceptCreate();
    renderBuilder();
    await addOneOff('Testwort');
    const row = () => stepRows()[0] as HTMLElement;
    const name = () => within(row()).getByRole('textbox', { name: /^Name/ });

    fireEvent.change(name(), { target: { value: 'Mockwort' } });
    expect(row()).toHaveTextContent('Mockwort');
    expect(within(row()).getByRole('button', { name: 'Close Mockwort' })).toBeInTheDocument();

    fireEvent.change(name(), { target: { value: '' } });
    fireEvent.blur(name());
    await waitFor(() => expect(name()).toHaveAccessibleDescription('Give the ingredient a name'));

    fireEvent.change(name(), { target: { value: 'Mockwort' } });
    submit();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([{ name: 'Mockwort' }]);
  });

  it('refuses a one-off renamed to a name already in the jar, in the Name field', async () => {
    suggest();
    renderBuilder();
    await addOneOff('Testwort');
    await addOneOff('Mockwort');
    const name = () => within(stepRows()[1] as HTMLElement).getByRole('textbox', { name: /^Name/ });

    fireEvent.change(name(), { target: { value: 'testwort' } });
    fireEvent.blur(name());
    submit();

    await waitFor(() =>
      expect(name()).toHaveAccessibleDescription('This ingredient is already in the jar'),
    );
  });

  it('shows a linked ingredient’s name read-only: no Name field', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    expect(
      within(stepRow('Fixture Rosewort')).queryByRole('textbox', { name: /^Name/ }),
    ).toBeNull();
  });

  it('takes a step out with Remove', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    await add('Fixture', /Fixture Mockroot/);

    fireEvent.click(
      within(stepRow('Fixture Rosewort')).getByRole('button', { name: 'Remove Fixture Rosewort' }),
    );

    expect(stepRows()).toHaveLength(1);
    expect(stepRows()[0]).toHaveTextContent('Fixture Mockroot');
  });

  it('undoes a Remove, putting the step back with what was typed, and redoes it', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    const quantity = () =>
      within(stepRow('Fixture Rosewort')).getByRole('spinbutton', { name: /^Quantity/ });
    fireEvent.change(quantity(), { target: { value: '7' } });
    // The new row is open, so Remove waits behind its Close.
    fireEvent.click(screen.getByRole('button', { name: 'Close Fixture Rosewort' }));
    fireEvent.click(
      within(stepRow('Fixture Rosewort')).getByRole('button', { name: 'Remove Fixture Rosewort' }),
    );
    expect(stepRows()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(stepRows()).toHaveLength(1));
    expect(stepRow('Fixture Rosewort')).toHaveTextContent('7');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(stepRows()).toHaveLength(0));
  });

  it('undoes an added step', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    expect(stepRows()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(stepRows()).toHaveLength(0));
  });

  it('opens a closed ingredient row from a click on its name, and a click on Remove removes it without opening it', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    await add('Fixture', /Fixture Mockroot/);
    const pencil = () => screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ });
    // The second add opened Mockroot and closed Rosewort.
    expect(pencil()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(
      within(stepRow('Fixture Rosewort')).getByText(/Fixture Rosewort/, { selector: 'p' }),
    );
    expect(pencil()).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(stepRow('Fixture Rosewort')).getByRole('spinbutton', { name: /^Quantity/ }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(stepRow('Fixture Rosewort')).getByText(/Fixture Rosewort/, { selector: 'p' }),
    );
    expect(pencil()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(
      within(stepRow('Fixture Mockroot')).getByRole('button', { name: 'Remove Fixture Mockroot' }),
    );
    expect(stepRows()).toHaveLength(1);
    expect(pencil()).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open for a click or focus on anything inside its fields, including a Unit list picked from', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    const pencil = () => screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ });
    const open = () => expect(pencil()).toHaveAttribute('aria-expanded', 'true');
    open();
    const row = stepRow('Fixture Rosewort');

    chooseUnit(row, 'g');
    open();
    fireEvent.click(within(row).getByRole('combobox', { name: /^Unit/ }));
    open();
    const listbox = screen.getByRole('listbox', { name: /^Unit.* choices$/ });
    fireEvent.pointerDown(listbox);
    fireEvent.click(listbox);
    open();
    for (const field of within(row).getAllByRole('spinbutton')) {
      fireEvent.pointerDown(field);
      act(() => field.focus());
      fireEvent.click(field);
    }
    for (const label of row.querySelectorAll('label, p, section')) {
      if (label.closest('.step-row__open')) fireEvent.click(label);
    }
    // The row's blank gaps and its marks are not the header text either.
    fireEvent.click(row);
    open();
    fireEvent.click(within(row).getByText(/Fixture Rosewort/, { selector: 'p' }));
    expect(pencil()).toHaveAttribute('aria-expanded', 'false');
  });

  it('makes the pencil the row’s Close while open, hiding Remove, and Close collapses it with the focus kept', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    const pencil = screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ });
    expect(pencil).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).queryByRole('button', { name: 'Remove Fixture Rosewort' })).toBeNull();

    act(() => pencil.focus());
    fireEvent.click(within(row).getByRole('button', { name: 'Close Fixture Rosewort' }));

    expect(pencil).toHaveAttribute('aria-expanded', 'false');
    expect(pencil).toHaveFocus();
    expect(stepRows()).toHaveLength(1);
    expect(
      within(row).getByRole('button', { name: 'Remove Fixture Rosewort' }),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Edit Fixture Rosewort' })).toBe(pencil);
  });

  it('refuses a unit the coven’s jar cannot be measured in, beside the unit, and holds Save', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    const unit = within(row).getByRole('combobox', { name: /^Unit/ });

    // The jar is weighed: a volume cannot be taken from it.
    chooseUnit(row, 'ml');
    await waitFor(() => expect(unit).toHaveAttribute('aria-invalid', 'true'));
    expect(unit).toHaveAccessibleDescription(UNMEASURABLE_UNIT);
    expect(save()).toBeDisabled();

    // Another weight converts.
    chooseUnit(row, 'kg');
    await waitFor(() => expect(unit).not.toHaveAttribute('aria-invalid', 'true'));
    expect(save()).toBeEnabled();
  });

  it('shows each row’s categories beneath its name: the form’s own, else the ingredient’s', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();

    const rosewort = await lookUp('Fixture', /Fixture Rosewort/);
    const mockroot = screen.getByRole('option', { name: /Fixture Mockroot/ });

    expect(rosewort).toHaveTextContent('Calm');
    expect(rosewort).not.toHaveTextContent('Love');
    expect(mockroot).toHaveTextContent('Love · Protection');
  });

  it('starts a stocked form in the unit it is stocked in, and an unstocked one blank', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();

    await add('Fixture', /Fixture Rosewort/);
    const unit = (name: string) => within(stepRow(name)).getByRole('combobox', { name: /^Unit/ });
    expect(unit('Fixture Rosewort')).toHaveTextContent('g');
    // The member can still change it.
    chooseUnit(stepRow('Fixture Rosewort'), 'kg');
    expect(unit('Fixture Rosewort')).toHaveTextContent('kg');

    // A form with no jar starts blank; adding it closes the first row.
    await add('Fixture', /Fixture Mockroot/);
    expect(unit('Fixture Mockroot')).not.toHaveTextContent(/\b(g|kg|ml)\b/);
  });

  it('takes any unit for a form the coven holds no jar of', async () => {
    suggest(MOCKROOT);
    renderBuilder();
    await add('Mock', /Fixture Mockroot/);
    const row = stepRow('Fixture Mockroot');

    chooseUnit(row, 'ml');

    const unit = within(row).getByRole('combobox', { name: /^Unit/ });
    await waitFor(() => expect(unit).toHaveTextContent('ml'));
    expect(unit).not.toHaveAttribute('aria-invalid', 'true');
    expect(save()).toBeEnabled();
  });

  it('opens a saved spell’s steps, and saves them back by id with the step added', async () => {
    suggest(MOCKROOT);
    const calls = acceptUpdate();
    renderBuilder({
      spell: {
        ...answer('s3', 4),
        steps: [
          {
            id: ID.savedRosewort,
            name: 'Fixture Rosewort',
            form: 'dried leaf',
            quantity: 3,
            unit: 'g',
            body: null,
            ingredient: {
              id: ID.rosewort,
              toxic: false,
              safetyNotes: null,
              categories: [category('Love')],
              stock: [],
            },
            variant: {
              id: ID.roseLeaf,
              toxic: false,
              safetyNotes: null,
              categories: [],
              formChoice: null,
            },
          },
          {
            id: ID.savedOneOff,
            name: 'Testwort',
            form: null,
            quantity: null,
            unit: null,
            body: null,
            ingredient: null,
            variant: null,
          },
        ],
      },
    });
    // A saved spell opens shut (M10.12): the Jar's line counts the ingredients laid.
    const jar = screen.getByRole('button', { name: 'Jar' });
    expect(jar).toHaveAttribute('aria-expanded', 'false');
    expect(jar).toHaveAccessibleDescription('2 ingredients');
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    openRow('Fixture Rosewort');
    const row = stepRow('Fixture Rosewort');
    expect(within(row).getByRole('spinbutton', { name: /^Quantity/ })).toHaveValue(3);
    expect(within(row).getByRole('combobox', { name: /^Unit/ })).toHaveTextContent('g');
    expect(stepRow('Testwort')).toBeInTheDocument();
    expect(save()).toBeDisabled();

    await add('Mock', /Fixture Mockroot/);
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([
      {
        id: ID.savedRosewort,
        ingredientId: ID.rosewort,
        variantId: ID.roseLeaf,
        quantity: 3,
        unit: 'g',
      },
      { id: ID.savedOneOff, name: 'Testwort' },
      { ingredientId: ID.mockroot, variantId: ID.mockRoot },
    ]);
  });

  it('puts the server’s refusal of a step’s unit on that step’s unit', async () => {
    suggest(MOCKROOT);
    mockGraphQLError('CreateSpell', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['steps', 0, 'unit'], message: UNMEASURABLE_UNIT }],
    });
    renderBuilder();
    await add('Mock', /Fixture Mockroot/);
    chooseUnit(stepRow('Fixture Mockroot'), 'ml');
    submit();

    const unit = within(stepRow('Fixture Mockroot')).getByRole('combobox', { name: /^Unit/ });
    await waitFor(() => expect(unit).toHaveAccessibleDescription(UNMEASURABLE_UNIT));
  });
});

// M10.18, story 53: a warning on an ingredient that is toxic or needs care. The
// mark and the note are SafetyNote's own (tests/components/SafetyNote); this is
// only that the builder draws them for the right steps, and never blocks a save.
describe('the spell builder’s safety warning', () => {
  const TOXWORT = suggestion(
    'compendium',
    ID.mockroot,
    'Fixture Toxwort',
    [{ id: ID.mockRoot, form: 'root', icon: 'mineral' }],
    [],
    { toxic: true, safetyNotes: 'Never burn it indoors.' },
  );
  const CAREWORT = suggestion('compendium', ID.twinwort, 'Fixture Carewort', [
    { id: ID.twinLeaf, form: 'leaf', safetyNotes: 'Wash your hands after.' },
  ]);
  const warning = () => within(steps()).queryByText('Toxic');

  it('marks a toxic ingredient’s step, shows its notes, and says so as it is added', async () => {
    suggest(TOXWORT);
    renderBuilder();

    await add('Tox', /Fixture Toxwort/);

    const row = stepRow('Fixture Toxwort');
    expect(within(row).getByText('Toxic')).toBeInTheDocument();
    expect(within(row).getByRole('region', { name: 'Caution' })).toHaveTextContent(
      'Never burn it indoors.',
    );
    expect(
      screen
        .getAllByRole('status')
        .map((region) => region.textContent)
        .join(' '),
    ).toContain('Warning: Toxic.');
  });

  it('marks a step whose form carries notes with Caution, and says so', async () => {
    suggest(CAREWORT);
    renderBuilder();

    await add('Care', /Fixture Carewort/);

    const row = stepRow('Fixture Carewort');
    expect(within(row).getByText('Caution', { selector: '.badge *, .badge' })).toBeInTheDocument();
    expect(within(row).getByRole('region', { name: 'Caution' })).toHaveTextContent(
      'Wash your hands after.',
    );
    expect(
      screen
        .getAllByRole('status')
        .map((region) => region.textContent)
        .join(' '),
    ).toContain('Caution: has safety notes.');
  });

  it('says nothing for an ingredient with nothing to say, and for a one-off', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    await addOneOff('Testwort');

    expect(warning()).toBeNull();
    expect(within(steps()).queryByRole('region')).toBeNull();
    expect(
      screen
        .getAllByRole('status')
        .map((region) => region.textContent)
        .join(' '),
    ).not.toMatch(/Warning|Caution/);
  });

  it('does not block saving the spell', async () => {
    suggest(TOXWORT);
    const calls = acceptCreate();
    renderBuilder();
    await add('Tox', /Fixture Toxwort/);

    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.steps).toEqual([{ ingredientId: ID.mockroot, variantId: ID.mockRoot }]);
  });

  it('shows the warning on a saved spell’s step, read back with it', () => {
    renderBuilder({
      spell: {
        ...answer('s2', 3, [
          {
            id: ID.savedRosewort,
            name: 'Fixture Toxwort',
            form: 'root',
            quantity: null,
            unit: null,
            body: null,
            ingredient: {
              id: ID.mockroot,
              toxic: true,
              safetyNotes: null,
              categories: [],
              stock: [],
            },
            variant: {
              id: ID.mockRoot,
              toxic: false,
              safetyNotes: null,
              categories: [],
              formChoice: null,
            },
          },
        ]),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));

    expect(within(stepRow('Fixture Toxwort')).getByText('Toxic')).toBeInTheDocument();
  });
});

// M10.19, story 54: what the cupboard says about a step as it is added and as its
// amount is typed. The rule is tests/components/SpellBuilder/supply.test.ts; this is
// that In Coven Inventory (the Jar's aside) says each state in words, and follows the amount.
describe('the spell builder’s In Coven Inventory', () => {
  const HELD = suggestion('yours', ID.rosewort, 'Fixture Rosewort', [
    { id: ID.roseLeaf, form: 'dried leaf', jar: 'g', held: 5 },
  ]);
  const hold = () => screen.getByRole('region', { name: 'In Coven Inventory' });
  const line = (name: string) => {
    const item = within(hold())
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes(name));
    if (!item) throw new Error(`No hold line reads ${name}`);
    return item;
  };

  it('says there is nothing in the jar before a step is added', () => {
    renderBuilder();
    expect(hold()).toHaveTextContent('Nothing in the jar yet.');
  });

  it('flags a compendium form the coven holds no jar of as Out, on add', async () => {
    suggest(MOCKROOT);
    renderBuilder();

    await add('Mock', /Fixture Mockroot/);

    expect(
      within(line('Fixture Mockroot')).getByRole('button', { name: 'Out' }),
    ).toBeInTheDocument();
    expect(line('Fixture Mockroot')).toHaveTextContent('hold none');
  });

  it('flags an empty jar as Out', async () => {
    suggest(
      suggestion('yours', ID.rosewort, 'Fixture Rosewort', [
        { id: ID.roseLeaf, form: 'leaf', jar: 'g', held: 0 },
      ]),
    );
    renderBuilder();

    await add('Rose', /Fixture Rosewort/);

    expect(
      within(line('Fixture Rosewort')).getByRole('button', { name: 'Out' }),
    ).toBeInTheDocument();
    expect(line('Fixture Rosewort')).toHaveTextContent('hold none');
  });

  it('gives Not Enough as an icon button, and not Out, once the amount typed passes the jar, and clears when it fits', async () => {
    suggest(HELD);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    const notEnough = () =>
      within(line('Fixture Rosewort')).queryByRole('button', { name: 'Not Enough' });
    expect(notEnough()).not.toBeInTheDocument();

    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '9' },
    });
    chooseUnit(row, 'g');

    await waitFor(() => expect(notEnough()).toBeInTheDocument());
    expect(line('Fixture Rosewort')).toHaveTextContent('need 9 g · hold 5 g');
    expect(within(line('Fixture Rosewort')).queryByRole('button', { name: 'Out' })).toBeNull();

    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '4' },
    });
    await waitFor(() => expect(notEnough()).not.toBeInTheDocument());
    expect(line('Fixture Rosewort')).toHaveTextContent('need 4 g · hold 5 g');
  });

  it('judges a form laid in two steps on the sum, and shows one line for each step', async () => {
    suggest(HELD);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    await add('Rose', /Fixture Rosewort/);
    const lines = () =>
      within(hold())
        .getAllByRole('listitem')
        .filter((li) => li.textContent?.includes('Fixture Rosewort'));
    const notEnough = (li: HTMLElement) => within(li).queryByRole('button', { name: 'Not Enough' });

    for (const index of [0, 1]) {
      // One row is open at a time: open each in turn.
      const row = stepRows()[index] as HTMLElement;
      const edit = within(row).queryByRole('button', { name: /^Edit/, expanded: false });
      if (edit) fireEvent.click(edit);
      fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
        target: { value: '3' },
      });
      chooseUnit(row, 'g');
    }

    // 3 g and 3 g each fit the 5 g held; together they do not.
    await waitFor(() => expect(lines().map(notEnough).filter(Boolean)).toHaveLength(2));
    expect(lines()).toHaveLength(2);
  });

  it('says Units Differ where the unit cannot be set against the jar’s', async () => {
    suggest(HELD);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');

    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '1' },
    });
    chooseUnit(row, 'ml');

    await waitFor(() =>
      expect(
        within(line('Fixture Rosewort')).getByRole('button', { name: 'Units Differ' }),
      ).toBeInTheDocument(),
    );
    expect(
      within(line('Fixture Rosewort')).queryByRole('button', { name: 'Not Enough' }),
    ).toBeNull();
  });

  it('follows a one-off’s new name in its inventory line', async () => {
    suggest();
    renderBuilder();
    await addOneOff('Testwort');
    fireEvent.change(within(stepRows()[0] as HTMLElement).getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Mockwort' },
    });
    expect(line('Mockwort')).toHaveTextContent('one-off · nothing to hold');
  });

  it('says a one-off has nothing to hold, badges it One-Off in its row, and gives an instruction no line', async () => {
    suggest();
    renderBuilder();
    await addOneOff('Testwort');
    fireEvent.click(screen.getByRole('button', { name: 'Add an Instruction' }));

    expect(within(hold()).getAllByRole('listitem')).toHaveLength(1);
    expect(line('Testwort')).toHaveTextContent('one-off · nothing to hold');
    const [oneOff, instruction] = stepRows();
    expect(within(oneOff as HTMLElement).getByText('One-Off')).toBeInTheDocument();
    expect(within(instruction as HTMLElement).queryByText(/One-Off|Out/)).toBeNull();
  });
});

// The Jar aside's drawing fills with one band per ingredient step. It is decorative and has no
// text alternative, so the bands are counted as the drawing's own elements.
describe('the spell builder’s jar fill', () => {
  const bands = () =>
    screen
      .getByRole('complementary', { name: 'The Jar' })
      .querySelectorAll('svg .jar-shelf__band-fill').length;

  it('draws a band for each ingredient step, a one-off too, and none for an instruction', async () => {
    suggest(MOCKROOT);
    renderBuilder();
    expect(bands()).toBe(0);

    await add('Mock', /Fixture Mockroot/);
    expect(bands()).toBe(1);

    await addOneOff('Testwort');
    expect(bands()).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Add an Instruction' }));
    expect(bands()).toBe(2);
  });
});

describe('the spell builder’s jar fill colours', () => {
  const fills = () =>
    Array.from(
      screen
        .getByRole('complementary', { name: 'The Jar' })
        .querySelectorAll<SVGPathElement>('svg .jar-shelf__band-fill'),
    );
  const group = (name: string, colorDark: string, colorLight: string) => ({
    id: `g-${name}`,
    name,
    colorDark,
    colorLight,
  });
  const node = (name: string, g: ReturnType<typeof group>) => ({
    ...category(name),
    description: null,
    group: g,
  });

  it('draws a layer in the group colours of its categories, in order, and a layer whose categories have no group in the muted ink', async () => {
    suggest(ROSEWORT, MOCKROOT);
    // Rosewort carries Love and Calm, two groups; Mockroot carries Love, one group, and Protection, which has none known.
    renderBuilder({}, [
      node('Love', group('Love', '#cf6e87', '#a44c63')),
      node('Calm', group('Calm', '#50a58e', '#1d755d')),
    ] as never);
    await add('Mock', /Fixture Mockroot/);
    await add('Rose', /Fixture Rosewort/);

    await waitFor(() => expect(fills()).toHaveLength(3));
    const [mockroot, ...rosewort] = fills();
    expect(mockroot.style.getPropertyValue('--band-light')).toBe('#a44c63');
    expect(rosewort.map((path) => path.style.getPropertyValue('--band-light'))).toEqual([
      '#a44c63',
      '#1d755d',
    ]);
  });
});

describe('the spell builder’s open and closed steps', () => {
  it('opens a new step at once, and one row at a time', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();

    await add('Rose', /Fixture Rosewort/);
    expect(
      within(stepRow('Fixture Rosewort')).getByRole('spinbutton', { name: /^Quantity/ }),
    ).toBeInTheDocument();

    await add('Mock', /Fixture Mockroot/);
    expect(
      within(stepRow('Fixture Mockroot')).getByRole('spinbutton', { name: /^Quantity/ }),
    ).toBeInTheDocument();
    expect(
      within(stepRow('Fixture Rosewort')).queryByRole('spinbutton', { name: /^Quantity/ }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps what was typed in a row after it is closed, and shows it in the row’s summary', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '2' },
    });
    chooseUnit(row, 'g');
    await add('Mock', /Fixture Mockroot/);

    expect(stepRow('Fixture Rosewort')).toHaveTextContent('2 g');
    openRow('Fixture Rosewort');
    expect(
      within(stepRow('Fixture Rosewort')).getByRole('spinbutton', { name: /^Quantity/ }),
    ).toHaveValue(2);
  });

  it('forces a row open while its unit is refused', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    chooseUnit(stepRow('Fixture Rosewort'), 'ml');
    await waitFor(() =>
      expect(
        within(stepRow('Fixture Rosewort')).getByRole('combobox', { name: /^Unit/ }),
      ).toHaveAttribute('aria-invalid', 'true'),
    );

    await add('Mock', /Fixture Mockroot/);

    expect(
      within(stepRow('Fixture Rosewort')).getByRole('combobox', { name: /^Unit/ }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('closes an open row when a click lands outside it, and keeps what was typed', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    const row = stepRow('Fixture Rosewort');
    fireEvent.change(within(row).getByRole('spinbutton', { name: /^Quantity/ }), {
      target: { value: '3' },
    });
    // Inside the row is not outside it.
    fireEvent.pointerDown(within(row).getByRole('spinbutton', { name: /^Quantity/ }));
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('heading', { name: 'What Goes In' }));

    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(stepRow('Fixture Rosewort')).toHaveTextContent('3');
  });

  it('closes an open row when the focus leaves it', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    fireEvent.click(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ }));
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ }));
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    act(() => screen.getByRole('button', { name: 'Add an Instruction' }).focus());

    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps a row open while its unit is refused, even after a click outside it', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    chooseUnit(stepRow('Fixture Rosewort'), 'ml');
    await waitFor(() =>
      expect(
        within(stepRow('Fixture Rosewort')).getByRole('combobox', { name: /^Unit/ }),
      ).toHaveAttribute('aria-invalid', 'true'),
    );

    fireEvent.click(screen.getByRole('heading', { name: 'What Goes In' }));

    expect(
      within(stepRow('Fixture Rosewort')).getByRole('combobox', { name: /^Unit/ }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('opens a new step while the focus stays in Add to Jar, and closes it on the next click outside the box and the row', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    // The box is where the next ingredient is typed: still inside.
    fireEvent.click(search());
    act(() => search().focus());
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('heading', { name: 'What Goes In' }));
    expect(screen.getByRole('button', { name: /^(Edit|Close) Fixture Rosewort$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
