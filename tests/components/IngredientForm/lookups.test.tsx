import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FormField,
  LookupListField,
  useCommonNameSuggestions,
  useDeitySuggestions,
  usePlanetSuggestions,
  useSubstituteSuggestions,
} from '@/components/IngredientForm/suggestions';
import type { IngredientFormInput, IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import {
  WORKSPACE_ID,
  offerDeities,
  offerForms,
  offerIngredients,
  offerNames,
  offerPlanets,
} from '../../support/msw/ingredient-lookups';
import type {
  CorrespondenceNode,
  DeityNode,
  FormNode,
  IngredientNode,
  LookupList,
  NameNode,
} from './types';

// The form's lookups on their own components (MB.181): the Form box
// (`FormField`) and a list's box (`LookupListField`), each in a form of its
// own on the form's resolver, asking MSW as /api/graphql answers. What a pick
// becomes is read from what the resolver hands the submit — the input the
// form sends. That the form gives each box its coven, and sends the pick, is
// index.test.tsx's, once per lookup; the box's rows and keys are Combobox's
// (claude-docs/components/ingredient-form.md, "Testing").

/** `field` in a form of its own, its name given; the submit receives what the form would send. */
function renderInForm(field: ReactElement) {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort' },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          {field}
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  /** What the save sent, once it has. */
  return async (): Promise<IngredientFormInput> => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls[0][0];
  };
}

const box = (name: string) => screen.getByRole('combobox', { name });
const type = (name: string, value: string) => fireEvent.change(box(name), { target: { value } });
const removeButton = (value: string) => screen.getByRole('button', { name: `Remove ${value}` });
const changes = (legend: string) =>
  within(screen.getByRole('group', { name: legend })).getByRole('status', {
    name: `${legend} changes`,
  });
const typedRow = (text: string) =>
  screen.queryByRole('option', { name: `Use what you typed: ${text}` });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});
const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
/** Focuses the box, waits for its first, empty ask, then types `text` and lets it settle. */
const lookUp = async (entry: string, calls: unknown[], text: string) => {
  act(() => box(entry).focus());
  await waitFor(() => expect(calls).toHaveLength(1));
  type(entry, text);
  settle();
  await waitFor(() => expect(calls).toHaveLength(2));
};

describe('FormField', () => {
  const ANIMAL_WAX_ID = '2c9e4b1a-7d3f-4e8a-9b6c-5f0a1d2e3c4b';
  const SUBSTANCE_WAX_ID = '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b';
  const WAX_ANIMAL: FormNode = {
    id: ANIMAL_WAX_ID,
    value: 'Wax',
    description: null,
    group: 'Animal',
    curated: true,
    claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
  };
  const WAX_SUBSTANCE: FormNode = {
    id: SUBSTANCE_WAX_ID,
    value: 'Wax',
    description: 'Candle and poppet wax.',
    group: 'Substance',
    curated: true,
    claimants: [],
  };
  // In use only: no curated row, so nothing to pick.
  const RHIZOMES: FormNode = {
    id: null,
    value: 'Rhizomes',
    description: null,
    group: null,
    curated: false,
    claimants: [{ name: 'Mockleaf', canonicalName: null }],
  };

  const renderField = () => renderInForm(<FormField workspaceId={WORKSPACE_ID} />);
  /** Looks up "wax" in the Form box and picks the row named `option`. */
  const pickWax = async (calls: unknown[], option: RegExp) => {
    await lookUp('Form', calls, 'wax');
    fireEvent.click(await screen.findByRole('option', { name: option }));
  };
  // The group a pick shows inside the box, not the tooltip that repeats it.
  const group = (text: string) =>
    within(box('Form').closest('.combobox') as HTMLElement).queryByText(text, {
      ignore: '[role="tooltip"]',
    });

  // The one debounce test of the lookups, `useLookup` being one hook; the
  // debounce's own timing is tests/lib/debounce.test.tsx's.
  it('asks nothing until the box is used, then once the typing settles, about this coven', async () => {
    renderField();
    const calls = offerForms([WAX_ANIMAL]);

    settle();
    expect(calls).toHaveLength(0);

    act(() => box('Form').focus());
    await waitFor(() => expect(calls).toHaveLength(1));
    type('Form', 'w');
    type('Form', 'wa');
    type('Form', 'wax');
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(calls).toHaveLength(1);

    settle();
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual({ workspaceId: WORKSPACE_ID, query: 'wax', first: 10 });
  });

  it('offers the vocabulary first, each with its group and who claims it, then forms in use', async () => {
    renderField();
    const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE, RHIZOMES]);

    await lookUp('Form', calls, 'wax');

    const curated = await screen.findByRole('group', { name: 'From Compendium' });
    // Two same-named forms, told apart by the group in each one's name.
    expect(within(curated).getByRole('option', { name: /^Wax \(Animal\)/ })).toHaveTextContent(
      'Testwort (Fixtura testalis)',
    );
    expect(within(curated).getByRole('option', { name: /^Wax \(Substance\)/ })).toHaveTextContent(
      'Candle and poppet wax.',
    );
    const inUse = screen.getByRole('group', { name: 'From Coven' });
    expect(within(inUse).getByRole('option', { name: /^Rhizomes/ })).toHaveTextContent('Mockleaf');
    // What was typed comes first, the owner's call.
    const rows = within(screen.getByRole('listbox', { name: 'Form suggestions' }));
    expect(rows.getAllByRole('option')[0]).toHaveAccessibleName(expect.stringContaining('wax'));
  });

  // MB.169: the text alone reads the same for both Waxes; the group tells
  // which was picked, and the id records it.
  it('fills the field from a pick, shows its group in the box and sends its id', async () => {
    const send = renderField();
    const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

    await pickWax(calls, /^Wax \(Substance\)/);

    expect(box('Form')).toHaveValue('Wax');
    expect(box('Form')).toHaveAttribute('aria-expanded', 'false');
    expect(group('(Substance)')).toBeInTheDocument();
    expect(box('Form')).toHaveAccessibleDescription(expect.stringContaining('Substance'));
    expect(box('Form')).toHaveAccessibleDescription(
      expect.stringContaining('Candle and poppet wax.'),
    );
    expect(await send()).toMatchObject({ form: 'Wax', formId: SUBSTANCE_WAX_ID });
  });

  it('tells two same-named picks apart, the last pick replacing the first', async () => {
    const send = renderField();
    const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

    await pickWax(calls, /^Wax \(Substance\)/);
    settle();
    fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
    fireEvent.click(await screen.findByRole('option', { name: /^Wax \(Animal\)/ }));

    expect(group('(Animal)')).toBeInTheDocument();
    expect(group('(Substance)')).not.toBeInTheDocument();
    // A group with no description is the whole of what the box adds; the
    // qualifier's tooltip, and none without a detail, are Combobox's.
    expect(box('Form')).toHaveAccessibleDescription(expect.stringMatching(/\(Animal\)$/));
    expect((await send()).formId).toBe(ANIMAL_WAX_ID);
  });

  // The owner's call: the text is still the member's to edit, and an edit
  // away from the pick leaves typed text, which links nothing.
  it('drops the group and the id once the text is edited away from the pick', async () => {
    const send = renderField();
    const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

    await pickWax(calls, /^Wax \(Substance\)/);
    type('Form', 'Waxe');
    type('Form', 'Wax');

    expect(group('(Substance)')).not.toBeInTheDocument();
    expect(box('Form')).not.toHaveAccessibleDescription(expect.stringContaining('Substance'));
    expect(await send()).toMatchObject({ form: 'Wax', formId: null });
  });

  it('records no pick for a form only in use, which has no curated row', async () => {
    const send = renderField();
    const calls = offerForms([RHIZOMES]);

    await lookUp('Form', calls, 'rhiz');
    fireEvent.click(await screen.findByRole('option', { name: /^Rhizomes/ }));

    expect(box('Form')).toHaveValue('Rhizomes');
    expect(await send()).toMatchObject({ form: 'Rhizomes', formId: null });
  });

  it('takes a value in no vocabulary from its own row, with no warning', async () => {
    const send = renderField();
    const calls = offerForms([]);

    await lookUp('Form', calls, 'rhizome');
    fireEvent.click(await screen.findByRole('option', { name: 'Use what you typed: rhizome' }));

    expect(box('Form')).toHaveValue('rhizome');
    expect(await send()).toMatchObject({ form: 'rhizome', formId: null });
    expect(box('Form')).not.toBeInvalid();
  });
});

describe('LookupListField', () => {
  const FOLK_NAMES: LookupList = {
    useSuggestions: useCommonNameSuggestions,
    name: 'folkNames',
    legend: 'Folk Names',
    entry: 'Folk Name',
  };
  const PLANETS: LookupList = {
    useSuggestions: usePlanetSuggestions,
    name: 'planets',
    ordered: true,
    legend: 'Planets',
    entry: 'Planet',
  };
  const DEITIES: LookupList = {
    useSuggestions: useDeitySuggestions,
    name: 'deities',
    ordered: true,
    legend: 'Deities',
    entry: 'Deity',
  };
  const SUBSTITUTES: LookupList = {
    useSuggestions: useSubstituteSuggestions,
    name: 'substitutes',
    legend: 'Substitute Ingredients',
    entry: 'Substitute Ingredient',
  };
  const renderList = (list: LookupList) =>
    renderInForm(<LookupListField workspaceId={WORKSPACE_ID} {...list} />);

  const HEDGE: NameNode = {
    value: 'Hedge Fixture',
    claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
  };
  const MOON: CorrespondenceNode = {
    value: 'Moon',
    description: 'Rules the night and the tides.',
    curated: true,
  };
  const MOONFIXTURE: CorrespondenceNode = {
    value: 'Moonfixture',
    description: null,
    curated: false,
  };
  const GREEK_HECATE_ID = '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d';
  const ROMAN_HECATE_ID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
  const HECATE_GREEK: DeityNode = {
    id: GREEK_HECATE_ID,
    value: 'Hecate',
    description: 'Of crossroads and the moon.',
    tradition: 'Greek',
    curated: true,
  };
  const HECATE_ROMAN: DeityNode = {
    id: ROMAN_HECATE_ID,
    value: 'Hecate',
    description: null,
    tradition: 'Roman',
    curated: true,
  };
  // In use only: no curated row, so nothing to pick.
  const HECATE_FIXTURE: DeityNode = {
    id: null,
    value: 'Hecate Fixturia',
    description: null,
    tradition: null,
    curated: false,
  };
  const COMPENDIUM_ID = '0d4f2c1a-6b3e-4a5d-8c7f-9e0a1b2c3d4e';
  const COVEN_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';
  const BARE_ID = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f';
  const MOCKWORT_COMPENDIUM: IngredientNode = {
    id: COMPENDIUM_ID,
    name: 'Mockwort',
    canonicalName: 'Fixtura vulgaris',
    form: 'Dried leaf',
    description: 'A fixture herb.',
    isGlobal: true,
  };
  // The same label and formal name in another form: only the tooltip tells
  // the two apart once one is picked (MB.164).
  const MOCKWORT_COVEN: IngredientNode = {
    ...MOCKWORT_COMPENDIUM,
    id: COVEN_ID,
    form: 'Tincture',
    isGlobal: false,
  };
  const MOCKWORT_TEA: IngredientNode = {
    id: BARE_ID,
    name: 'Mockwort Tea',
    canonicalName: null,
    form: null,
    description: null,
    isGlobal: false,
  };

  // A list's box asks its hook's query, with this coven, once it is used:
  // one hook, `useLookup`, under each; which query each list asks is
  // index.test.tsx's, once per lookup.
  it.each([{ list: FOLK_NAMES, offer: () => offerNames([HEDGE]) }])(
    'asks about the $list.legend for this coven once its box is used, and not before',
    async ({ list, offer }) => {
      renderList(list);
      const calls = offer();

      settle();
      expect(calls).toHaveLength(0);

      await lookUp(list.entry, calls, 'mo');
      expect(calls).toEqual([
        { workspaceId: WORKSPACE_ID, query: '', first: 10 },
        { workspaceId: WORKSPACE_ID, query: 'mo', first: 10 },
      ]);
    },
  );

  it('suggests the folk names in use, with who claims them, and a pick adds an entry', async () => {
    renderList(FOLK_NAMES);
    const calls = offerNames([HEDGE]);

    await lookUp('Folk Name', calls, 'hedge');

    const option = await screen.findByRole('option', { name: /^Hedge Fixture/ });
    expect(option).toHaveTextContent('Testwort (Fixtura testalis)');
    // One bucket: there is no curated vocabulary of common names.
    expect(screen.queryByRole('group', { name: 'From Compendium' })).not.toBeInTheDocument();
    fireEvent.click(option);

    expect(removeButton('Hedge Fixture')).toBeInTheDocument();
    expect(box('Folk Name')).toHaveValue('');
    expect(box('Folk Name')).toHaveFocus();
    expect(changes('Folk Names')).toHaveTextContent('Hedge Fixture');
  });

  // The planets and the signs share one shape and one split.
  it.each([{ list: PLANETS, offer: offerPlanets, rows: [MOON, MOONFIXTURE] }])(
    'offers the curated $list.legend apart from those in use, with their descriptions',
    async ({ list, offer, rows: [curated, inUse] }) => {
      renderList(list);
      const calls = offer([curated, inUse]);

      await lookUp(list.entry, calls, curated.value.slice(0, 3));

      const group = await screen.findByRole('group', { name: 'From Compendium' });
      expect(
        within(group).getByRole('option', { name: new RegExp(`^${curated.value}`) }),
      ).toHaveTextContent(curated.description as string);
      expect(
        within(screen.getByRole('group', { name: 'From Coven' })).getByRole('option', {
          name: inUse.value,
        }),
      ).toBeInTheDocument();
    },
  );

  // MB.174: the rows reach the list's filter, which list-field.test.tsx
  // proves on given rows.
  it('leaves a listed planet out whatever its case, and offers what was typed only when it is no repeat', async () => {
    renderList(PLANETS);
    const calls = offerPlanets([{ ...MOON, description: null }, MOONFIXTURE]);

    type('Planet', 'moon');
    fireEvent.click(screen.getByRole('button', { name: 'Add Planet' }));
    await lookUp('Planet', calls, 'Mo');

    await screen.findByRole('option', { name: 'Moonfixture' });
    expect(screen.queryByRole('option', { name: 'Moon' })).not.toBeInTheDocument();
    expect(typedRow('Mo')).toBeInTheDocument();

    type('Planet', ' MOON ');
    settle();
    await screen.findByRole('option', { name: 'Moonfixture' });
    expect(typedRow('MOON')).not.toBeInTheDocument();
  });

  it('offers a curated deity with its tradition, telling two of one name apart, and one in use without', async () => {
    renderList(DEITIES);
    const calls = offerDeities([HECATE_GREEK, HECATE_ROMAN, HECATE_FIXTURE]);

    await lookUp('Deity', calls, 'hecate');

    const curated = await screen.findByRole('group', { name: 'From Compendium' });
    expect(within(curated).getByRole('option', { name: /^Hecate \(Greek\)/ })).toHaveTextContent(
      'Of crossroads and the moon.',
    );
    expect(within(curated).getByRole('option', { name: 'Hecate (Roman)' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'From Coven' })).getByRole('option', {
        name: 'Hecate Fixturia',
      }),
    ).toBeInTheDocument();
  });

  // MB.169: the same name in two traditions, told apart on the pill as in
  // the list, and saved as two picks.
  it('adds Greek and Roman Hecate as two pills, each with its tradition, and sends two ids', async () => {
    const send = renderList(DEITIES);
    const calls = offerDeities([HECATE_GREEK, HECATE_ROMAN]);

    await lookUp('Deity', calls, 'hecate');
    fireEvent.click(await screen.findByRole('option', { name: /^Hecate \(Greek\)/ }));
    expect(changes('Deities')).toHaveTextContent('Hecate (Greek)');
    type('Deity', 'hecate');
    settle();
    fireEvent.click(await screen.findByRole('option', { name: 'Hecate (Roman)' }));

    // Its description in its tooltip and its x's description, as a linked
    // substitute's detail is (MB.164); a deity with none has nothing more.
    expect(removeButton('Hecate (Greek)')).toHaveAccessibleDescription(
      'Of crossroads and the moon.',
    );
    expect(removeButton('Hecate (Roman)')).not.toHaveAccessibleDescription();
    expect((await send()).deities).toEqual([
      { deityId: GREEK_HECATE_ID },
      { deityId: ROMAN_HECATE_ID },
    ]);
  });

  it('adds a deity only in use as its name, read and sent as typed', async () => {
    const send = renderList(DEITIES);
    const calls = offerDeities([HECATE_FIXTURE]);

    await lookUp('Deity', calls, 'hecate');
    fireEvent.click(await screen.findByRole('option', { name: 'Hecate Fixturia' }));

    expect(removeButton('Hecate Fixturia')).not.toHaveAccessibleDescription();
    expect((await send()).deities).toEqual([{ name: 'Hecate Fixturia' }]);
  });

  it('offers each ingredient with its formal name and whose entry it is, in the order found', async () => {
    renderList(SUBSTITUTES);
    const calls = offerIngredients([MOCKWORT_COMPENDIUM, MOCKWORT_COVEN, MOCKWORT_TEA]);

    await lookUp('Substitute Ingredient', calls, 'mockwort');

    await screen.findByRole('option', { name: /^Mockwort Tea/ });
    const rows = within(screen.getByRole('listbox', { name: 'Substitute Ingredient suggestions' }))
      .getAllByRole('option')
      .slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Mockwort (Fixtura vulgaris)');
    expect(rows[1]).toHaveTextContent('Mockwort (Fixtura vulgaris)');
    // Told apart by whose entry each is.
    expect(rows[0]).not.toHaveAccessibleName(rows[1].textContent ?? '');
    expect(rows[2]).toHaveTextContent('Mockwort Tea');
    // One ranked list: a tier is a note, never a heading that reorders it.
    expect(screen.queryByRole('group', { name: 'From Compendium' })).not.toBeInTheDocument();
  });

  it('saves a picked ingredient as a link, its entry reading as that ingredient', async () => {
    const send = renderList(SUBSTITUTES);
    const calls = offerIngredients([MOCKWORT_COMPENDIUM, MOCKWORT_COVEN, MOCKWORT_TEA]);

    await lookUp('Substitute Ingredient', calls, 'mockwort');
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'Mockwort (Fixtura vulgaris) This coven’s entry',
      }),
    );
    // The chip reads as the compendium's Mockwort would; its detail says
    // which was picked (MB.164).
    const picked = removeButton('Mockwort (Fixtura vulgaris)');
    expect(picked).toHaveAccessibleDescription(expect.stringContaining('Tincture'));
    expect(picked).toHaveAccessibleDescription(expect.stringContaining('A fixture herb.'));
    expect(changes('Substitute Ingredients')).toHaveTextContent('Mockwort (Fixtura vulgaris)');
    expect((await send()).substitutes).toEqual([{ ingredientId: COVEN_ID }]);
  });

  it('saves a substitute typed without a pick as text, added or taken from its own row, with no warning', async () => {
    const send = renderList(SUBSTITUTES);
    const calls = offerIngredients([MOCKWORT_COVEN]);

    await lookUp('Substitute Ingredient', calls, 'Zest Root');
    await screen.findByRole('option', { name: /^Mockwort/ });
    fireEvent.keyDown(box('Substitute Ingredient'), { key: 'Enter' });
    type('Substitute Ingredient', 'Mockwort Rind');
    settle();
    fireEvent.click(
      await screen.findByRole('option', { name: 'Use what you typed: Mockwort Rind' }),
    );

    expect(removeButton('Zest Root')).toBeInTheDocument();
    expect(removeButton('Mockwort Rind')).toBeInTheDocument();
    expect((await send()).substitutes).toEqual([{ name: 'Zest Root' }, { name: 'Mockwort Rind' }]);
    expect(box('Substitute Ingredient')).not.toBeInvalid();
  });
});
