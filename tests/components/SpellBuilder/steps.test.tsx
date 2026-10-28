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
        form.jar ? [{ unit: form.jar, variant: { id: form.id } }] : [],
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

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  // The builder reads the coven's categories as it opens (M10.14).
  offerCategories([]);
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
}

const search = () => screen.getByRole('combobox', { name: 'Search Ingredients' });
const steps = () => screen.getByRole('list', { name: 'Steps' });
const stepRows = () => within(steps()).queryAllByRole('listitem');
const stepRow = (text: string) => {
  const row = stepRows().find((item) => item.textContent?.includes(text));
  if (!row) throw new Error(`No step reads ${text}`);
  return row;
};
const derived = () =>
  within(screen.getByRole('list', { name: 'Derived Categories' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent);
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

  it('offers each form of an ingredient as its own row, and no typed row', async () => {
    suggest(
      suggestion('yours', ID.twinwort, 'Fixture Twinwort', [
        { id: ID.twinLeaf, form: 'leaf' },
        { id: ID.twinSeed, form: 'seed' },
      ]),
    );
    renderBuilder();

    await lookUp('Fixture', /Fixture Twinwort \(Seed\)/);

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
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

  it('will not add a form twice: its row is offered but cannot be picked', async () => {
    suggest(ROSEWORT);
    renderBuilder();
    await add('Rose', /Fixture Rosewort/);

    const again = await lookUp('Rose', /Fixture Rosewort/);
    expect(again).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(again);

    expect(stepRows()).toHaveLength(1);
  });

  it('adds a one-off ingredient by name and form, drawn with the generic spoon', () => {
    renderBuilder();

    fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Name' }), {
      target: { value: 'Testwort' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Form' }), {
      target: { value: 'Dried Root' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add One-Off Ingredient' }));

    const row = stepRow('Testwort');
    expect(row).toHaveTextContent('Dried Root');
    expect(iconOf(row)).toBe(drawn(null));
    expect(screen.getByRole('textbox', { name: 'One-Off Name' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'One-Off Form' })).toHaveValue('');
  });

  it('will not add a one-off ingredient with no name, or one already in the jar', () => {
    renderBuilder();
    const name = screen.getByRole('textbox', { name: 'One-Off Name' });
    const addOneOff = screen.getByRole('button', { name: 'Add One-Off Ingredient' });

    expect(addOneOff).toBeDisabled();
    fireEvent.change(name, { target: { value: '   ' } });
    expect(addOneOff).toBeDisabled();

    fireEvent.change(name, { target: { value: 'Testwort' } });
    fireEvent.click(addOneOff);
    fireEvent.change(name, { target: { value: 'testwort ' } });
    fireEvent.click(addOneOff);

    expect(stepRows()).toHaveLength(1);
    expect(name).toHaveAccessibleDescription('This ingredient is already in the jar');
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
    fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Name' }), {
      target: { value: 'Testwort' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add One-Off Ingredient' }));
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    // Only the ids a step stores: the picker never hands over a cupboard entry or a jar.
    expect(calls[0]?.input.steps).toEqual([
      { ingredientId: ID.rosewort, variantId: ID.roseLeaf, quantity: 2, unit: 'g' },
      { name: 'Testwort' },
    ]);
  });

  it('takes a step out with Remove, and its categories out of the derived ones at once', async () => {
    suggest(ROSEWORT, MOCKROOT);
    renderBuilder();
    await add('Fixture', /Fixture Rosewort/);
    await add('Fixture', /Fixture Mockroot/);
    // Rosewort's ingredient and form, and Mockroot's, sorted by name.
    expect(derived()).toEqual(['Calm', 'Love', 'Protection']);

    fireEvent.click(
      within(stepRow('Fixture Rosewort')).getByRole('button', { name: 'Remove Fixture Rosewort' }),
    );

    expect(stepRows()).toHaveLength(1);
    expect(stepRows()[0]).toHaveTextContent('Fixture Mockroot');
    // Love stays: Mockroot carries it too.
    expect(derived()).toEqual(['Love', 'Protection']);
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
            note: null,
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
            note: null,
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
    const row = stepRow('Fixture Rosewort');
    expect(within(row).getByRole('spinbutton', { name: /^Quantity/ })).toHaveValue(3);
    expect(within(row).getByRole('combobox', { name: /^Unit/ })).toHaveTextContent('g');
    expect(stepRow('Testwort')).toBeInTheDocument();
    expect(derived()).toEqual(['Love']);
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
    fireEvent.change(screen.getByRole('textbox', { name: 'One-Off Name' }), {
      target: { value: 'Testwort' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add One-Off Ingredient' }));

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
            note: null,
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
