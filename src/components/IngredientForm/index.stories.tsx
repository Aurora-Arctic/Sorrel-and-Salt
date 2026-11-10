import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type {
  CommonNameSuggestionsQuery,
  CompendiumSubstitutesQuery,
  CreateCompendiumIngredientMutation,
  CreateReferenceMutation,
  CreateWorkspaceIngredientMutation,
  DeitySuggestionsQuery,
  DeleteCompendiumIngredientMutation,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  IngredientSummaryQuery,
  PickerCategoriesQuery,
  CelestialBodySuggestionsQuery,
  PossibleDuplicatesQuery,
  PromoteFolkNameMutation,
  ReferenceQuery,
  ReferenceSuggestionsQuery,
  UpdateCompendiumIngredientMutation,
  UpdateReferenceMutation,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
import { citationText } from '../../lib/citation';
import { fold } from '../../lib/text';
import type { CitationFields } from '../../lib/types';
import { ComboboxEntry } from '../Combobox';
import Modal from '../Modal';
import IngredientForm from '.';
import { NameField } from './duplicates';
import { substituteSummary } from './substitute-summary';
import { PromoteFolkNameQuestion, usePromoteFolkName } from './promote';
import { answerOperations, hangAllOperations, refusal } from '../../../.storybook/mock-api';
import { press, setInputValue } from '../../../.storybook/press';
import { Reopenable } from '../../../.storybook/reopenable';
import type {
  AfterSave,
  IngredientFormProps,
  IngredientFormValues,
  SavedIngredient,
} from './types';
import { EMPTY_VALUES, EMPTY_VARIANT } from './values';

const meta = {
  title: 'Ingredients / Ingredient Form',
  beforeEach: ({ msw }) => msw.use(CANNED_API),
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000000';

const matches = (query: string, ...texts: (string | null)[]) =>
  texts.some((text) => text?.toLowerCase().includes(fold(query)));

const FORMS: FormSuggestionsQuery['formSuggestions']['edges'][number]['node'][] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    value: 'Wax',
    description: 'Beeswax, as it comes from the comb.',
    group: 'Animal',
    icon: 'animal',
    curated: true,
    claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    value: 'Wax',
    description: 'Candle and poppet wax.',
    group: 'Substance',
    icon: 'substance',
    curated: true,
    claimants: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    value: 'Dried leaf',
    description: null,
    group: 'Plant part',
    icon: 'botanical',
    curated: true,
    claimants: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    value: 'Whole root',
    description: null,
    group: 'Plant part',
    icon: 'botanical',
    curated: true,
    claimants: [],
  },
  {
    id: null,
    value: 'Moon-dried shavings',
    description: null,
    group: null,
    icon: null,
    curated: false,
    claimants: [{ name: 'Mockleaf', canonicalName: null }],
  },
];

const COMMON_NAMES = [
  { value: 'Hedge Fixture', claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }] },
  { value: 'Fixture Bane', claimants: [{ name: 'Mockleaf', canonicalName: null }] },
];

const CELESTIAL_BODIES = [
  ...['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((value) => ({
    value,
    description: null,
    curated: true,
  })),
  { value: 'Moonfixture', description: null, curated: false },
];

const SIGNS = [
  ...[
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ].map((value) => ({ value, description: null, curated: true })),
  { value: 'Cancerfixture', description: null, curated: false },
];

const DEITIES = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    value: 'Hecate',
    description: 'Goddess of crossroads, witchcraft and the night.',
    tradition: 'Greek',
    curated: true,
    matchedName: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    value: 'Hecate',
    description: 'Called Trivia in Rome, goddess of the three-way crossroads.',
    tradition: 'Roman',
    curated: true,
    matchedName: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    value: 'Hermes',
    description: null,
    tradition: 'Greek',
    curated: true,
    matchedName: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    value: 'Mercury',
    description: null,
    tradition: 'Roman',
    curated: true,
    matchedName: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    value: 'Freyja',
    description: null,
    tradition: 'Norse',
    curated: true,
    matchedName: null,
  },
  {
    id: null,
    value: 'Hedge Mother Fixture',
    description: null,
    tradition: null,
    curated: false,
    matchedName: null,
  },
];

const INGREDIENTS = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'Testwort',
    canonicalName: 'Fixtura testalis',
    description: 'A fixture herb, for the workshop.',
    isGlobal: true,
    variants: [
      { id: '00000000-0000-4000-8000-000000000401', form: 'Dried leaf', formChoice: null },
      { id: '00000000-0000-4000-8000-000000000402', form: 'Oil', formChoice: null },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    name: 'Testwort',
    canonicalName: 'Fixtura testalis',
    description: 'A fixture herb, for the workshop.',
    isGlobal: false,
    variants: [{ id: '00000000-0000-4000-8000-000000000403', form: 'Tincture', formChoice: null }],
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    name: 'Fixturewort',
    canonicalName: 'Fixtura vulgaris',
    description: null,
    isGlobal: true,
    variants: [
      { id: '00000000-0000-4000-8000-000000000404', form: 'Whole root', formChoice: null },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    name: 'Mockleaf',
    canonicalName: null,
    description: null,
    isGlobal: false,
    variants: [],
  },
];

const SUMMARIES = Object.fromEntries(
  INGREDIENTS.map((row) => [
    row.id,
    {
      id: row.id,
      name: row.name,
      canonicalName: row.canonicalName,
      description:
        'An invented herb for the workshop, gathered at dusk from the hedge and hung to dry in bundles. Its leaf is used in washes, its root in sachets, and its smoke to clear a room before working.',
      nomenclature: row.canonicalName ? 'botanical' : 'unknown',
      isGlobal: row.isGlobal,
      slug: row.name.toLowerCase(),
      elements: ['water', 'earth'],
      celestialBodies: ['Moon'],
      zodiacSigns: ['Cancer'],
      colors: ['Green'],
      variants: row.variants.map(({ id, form }) => ({
        id,
        form,
        elements: null,
        celestialBodies: form === 'Oil' ? ['Venus'] : null,
        zodiacSigns: null,
        colors: null,
        formChoice: null,
      })),
    },
  ]),
) satisfies Record<string, IngredientSummaryQuery['ingredient']>;

const SOURCE_FIELDS = new Map<string, CitationFields>();
const source = (id: string, isGlobal: boolean, fields: CitationFields) => {
  SOURCE_FIELDS.set(id, fields);
  return summaryOf(id, isGlobal, fields);
};
const summaryOf = (id: string, isGlobal: boolean, fields: CitationFields) => ({
  id,
  isGlobal,
  citation: citationText(fields),
  kind: fields.kind,
  authors: fields.authors ?? null,
  title: fields.title,
  container: fields.container ?? null,
});

const SOURCES = [
  source('00000000-0000-4000-8000-000000000701', true, {
    kind: 'book',
    authors: 'Fixture, Ada',
    title: 'The Testwort Herbal',
    contributors: 'Edited by Bram Placeholder',
    place: 'Mockford',
    publisher: 'Fixture Press',
    published: '1901',
  }),
  source('00000000-0000-4000-8000-000000000702', false, {
    kind: 'article',
    authors: 'Placeholder, Bram, and Cara Mockley',
    title: 'Notes on Mockleaf: A Survey of Fixture Gardens',
    container: 'Journal of Fixtures',
    volume: '3',
    issue: '2',
    published: '1950',
    pages: '12–19',
  }),
  source('00000000-0000-4000-8000-000000000703', true, {
    kind: 'web_page',
    title: 'Testwort',
    container: 'Fixture Wiki',
    url: 'https://fixture-wiki.example/wiki/Testwort_(herb)_and_its_many_fixture_relatives',
    modified: '2026-09-27',
    accessed: '2026-10-06',
  }),
];

const CATS_CLAW: PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'][] = [
  {
    id: 'claw-1',
    name: "Cat's Claw",
    canonicalName: 'Uncaria tomentosa',
    nomenclature: 'botanical',
    slug: 'cats-claw-uncaria-tomentosa',
    isGlobal: true,
    inCupboard: true,
  },
  {
    id: 'claw-2',
    name: "Cat's Claw",
    canonicalName: 'Felis catus',
    nomenclature: 'zoological',
    slug: 'cats-claw-felis-catus',
    isGlobal: true,
    inCupboard: false,
  },
  {
    id: 'claw-3',
    name: "Cat's Claw",
    canonicalName: null,
    nomenclature: 'unknown',
    slug: 'cats-claw',
    isGlobal: false,
    inCupboard: false,
  },
];

const SAVE_DELAY_MS = 2000;

/** Copied from src/db/seed/category-groups.ts, which a component may not import. */
const CATEGORY_GROUPS = [
  ['Protection & Defense', '#5d8ab1', '#286ba6', ['Testward', 'Fixture Shield']],
  ['Cleansing & Release', '#50a58e', '#1d755d', ['Rinse Trial', 'Mock Release']],
  ['Prosperity & Work', '#86964a', '#606c2f', ['Stub Fortune', 'Test Trade']],
  ['Love & Connection', '#cf6e87', '#a44c63', ['Mock Bond', 'Fixture Mending']],
  ['Mind & Spirit', '#8e7bd1', '#6e4ce6', ['Test Sight', 'Stub Dream']],
  ['Wellbeing', '#559c54', '#326d31', ['Fixture Rest', 'Test Ease']],
  ['Craft & Change', '#c371c6', '#a13ba5', ['Mock Change', 'Stub Making']],
  ['Practice & Place', '#b7783f', '#8a5628', ['Test Hearth', 'Fixture Ground']],
] as const;
const CATEGORIES = CATEGORY_GROUPS.flatMap(([name, colorDark, colorLight, categories], group) =>
  categories.map((category, index) => ({
    id: `00000000-0000-4000-8000-0000000006${group}${index}`,
    name: category,
    description: `An invented category under ${name}.`,
    group: { id: `00000000-0000-4000-8000-00000000050${group}`, name, colorDark, colorLight },
  })),
);

const page = <N,>(nodes: N[], first: number) => ({
  edges: nodes.slice(0, first).map((node) => ({ node })),
});

function answer(operation: string, variables: Record<string, unknown>): object | undefined {
  const query = String(variables.query ?? variables.name ?? '');
  const first = Number(variables.first ?? 10);
  switch (operation) {
    case 'CompendiumEntryUsers':
      return { compendiumEntryUsers: 3 };
    case 'FormSuggestions':
      return {
        formSuggestions: page(
          FORMS.filter((row) => matches(query, row.value, row.description, row.group)),
          first,
        ),
      } satisfies FormSuggestionsQuery;
    case 'CommonNameSuggestions':
      return {
        commonNameSuggestions: page(
          COMMON_NAMES.filter((row) => matches(query, row.value)),
          first,
        ),
      } satisfies CommonNameSuggestionsQuery;
    case 'CelestialBodySuggestions':
      return {
        celestialBodySuggestions: page(
          CELESTIAL_BODIES.filter((row) => matches(query, row.value)),
          first,
        ),
      } satisfies CelestialBodySuggestionsQuery;
    case 'ZodiacSuggestions':
      return {
        zodiacSuggestions: page(
          SIGNS.filter((row) => matches(query, row.value)),
          first,
        ),
      } satisfies ZodiacSuggestionsQuery;
    case 'DeitySuggestions':
      return {
        deitySuggestions: page(
          DEITIES.filter((row) => matches(query, row.value, row.tradition)),
          first,
        ),
      } satisfies DeitySuggestionsQuery;
    case 'IngredientSuggestions':
      return {
        ingredientSuggestions: {
          edges: INGREDIENTS.filter((row) => matches(query, row.name, row.canonicalName))
            .slice(0, first)
            .map((row) => ({
              group: row.isGlobal ? ('compendium' as const) : ('yours' as const),
              node: { ...row, cupboardEntry: null },
            })),
        },
      } satisfies IngredientSuggestionsQuery;
    case 'CompendiumSubstitutes':
      return {
        compendium: page(
          INGREDIENTS.filter((row) => row.isGlobal && matches(query, row.name, row.canonicalName)),
          first,
        ),
      } satisfies CompendiumSubstitutesQuery;
    case 'IngredientSummary': {
      const ingredient = SUMMARIES[String(variables.id)];
      return ingredient && ({ ingredient } satisfies IngredientSummaryQuery);
    }
    case 'ReferenceSuggestions':
      return {
        referenceSuggestions: page(
          SOURCES.filter((row) => matches(query, row.citation)),
          first,
        ),
      } satisfies ReferenceSuggestionsQuery;
    case 'Reference': {
      const id = String(variables.id);
      const fields = SOURCE_FIELDS.get(id);
      if (!fields) return undefined;
      const blank = (value: string | null | undefined) => value ?? null;
      return {
        reference: {
          id,
          kind: fields.kind,
          title: fields.title,
          authors: blank(fields.authors),
          container: blank(fields.container),
          contributors: blank(fields.contributors),
          edition: blank(fields.edition),
          volume: blank(fields.volume),
          issue: blank(fields.issue),
          series: blank(fields.series),
          place: blank(fields.place),
          publisher: blank(fields.publisher),
          published: blank(fields.published),
          pages: blank(fields.pages),
          host: blank(fields.host),
          url: blank(fields.url),
          modified: blank(fields.modified),
          accessed: blank(fields.accessed),
          note: blank(fields.note),
          scholarly: false,
        },
      } satisfies ReferenceQuery;
    }
    case 'UpdateReference': {
      const id = String(variables.id);
      const input = variables.input as CitationFields;
      SOURCE_FIELDS.set(id, input);
      return {
        updateReference: summaryOf(id, variables.workspaceId == null, input),
      } satisfies UpdateReferenceMutation;
    }
    case 'CreateReference': {
      const input = variables.input as CitationFields;
      return {
        createReference: {
          id: crypto.randomUUID(),
          citation: citationText(input),
          isGlobal: false,
          kind: input.kind,
          authors: input.authors ?? null,
          title: input.title,
          container: input.container ?? null,
        },
      } satisfies CreateReferenceMutation;
    }
    case 'PickerCategories':
      return { categories: page(CATEGORIES, CATEGORIES.length) } satisfies PickerCategoriesQuery;
    case 'PossibleDuplicates':
      return {
        possibleDuplicates: page(
          !query.toLowerCase().includes('cat')
            ? []
            : variables.workspaceId == null
              ? CATS_CLAW.filter((row) => row.isGlobal).map((row) => ({
                  ...row,
                  inCupboard: false,
                }))
              : CATS_CLAW,
          first,
        ),
      } satisfies PossibleDuplicatesQuery;
    case 'CreateWorkspaceIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        createWorkspaceIngredient: {
          id: crypto.randomUUID(),
          name: input?.name ?? '',
          slug: 'new',
          revision: 1,
          stock: [],
        },
      } satisfies CreateWorkspaceIngredientMutation;
    }
    case 'CreateCompendiumIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        createCompendiumIngredient: {
          id: crypto.randomUUID(),
          name: input?.name ?? '',
          slug: 'new',
          revision: 1,
        },
      } satisfies CreateCompendiumIngredientMutation;
    }
    case 'UpdateCompendiumIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        updateCompendiumIngredient: {
          id: ENTRY.id,
          name: input?.name ?? '',
          slug: 'saved',
          revision: 1,
        },
      } satisfies UpdateCompendiumIngredientMutation;
    }
    case 'PromoteFolkName':
      return {
        promoteFolkName: {
          id: ENTRY.id,
          name: 'Hedge Fixture',
          slug: 'promoted',
          folkNames: [
            { id: '00000000-0000-4000-8000-000000000402', name: 'Fixture Bane' },
            { id: '00000000-0000-4000-8000-000000000403', name: ENTRY.values.name },
          ],
        },
      } satisfies PromoteFolkNameMutation;
    case 'DeleteCompendiumIngredient':
      return {
        deleteCompendiumIngredient: ENTRY.id,
      } satisfies DeleteCompendiumIngredientMutation;
    default:
      return undefined;
  }
}

const SAVES = new Set([
  'CreateWorkspaceIngredient',
  'CreateCompendiumIngredient',
  'UpdateCompendiumIngredient',
  'PromoteFolkName',
  'DeleteCompendiumIngredient',
  'CreateReference',
  'UpdateReference',
]);

function saveRefusal(operation: string, variables: Record<string, unknown>) {
  const input = variables.input as
    { name?: string; title?: string; categoryIds?: string[] } | undefined;
  const field = operation.endsWith('Reference') ? 'title' : 'name';
  const name = String(input?.[field] ?? '');
  if (
    /redirect/i.test(name) &&
    operation.endsWith('CompendiumIngredient') &&
    !variables.endRedirect
  ) {
    return refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['endRedirect'],
          message:
            '"fixturewort-fixtura-vulgaris" redirects to "Fixturewort" (Fixtura vulgaris, whole root) until 4 April 2027, 00:00 UTC — confirm to end that redirect',
        },
      ],
    });
  }
  if (/taken/i.test(name)) {
    return refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [
        field === 'title'
          ? { path: ['title'], message: 'This coven already has a source by that title' }
          : { path: ['name'], message: 'This coven already has an ingredient by that name' },
      ],
    });
  }
  if (/retired/i.test(name) && input?.categoryIds?.length) {
    return refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [{ path: ['categoryIds', 0], message: 'No such category' }],
    });
  }
  if (/refuse/i.test(name)) {
    return refusal({
      message: `You can't add ${field === 'title' ? 'sources' : 'ingredients'} to this coven`,
      code: 'FORBIDDEN',
    });
  }
  return undefined;
}

const CANNED_API = answerOperations(
  ({ operationName, variables }) => {
    const data = answer(operationName, variables);
    if (!data) return undefined;
    return SAVES.has(operationName) ? (saveRefusal(operationName, variables) ?? data) : data;
  },
  { delayFor: (operationName) => (SAVES.has(operationName) ? SAVE_DELAY_MS : 0) },
);

type CompendiumFormProps =
  Extract<IngredientFormProps, { workspaceId: null }> extends infer P
    ? Omit<P, 'workspaceId' | 'workspaceName' | 'duplicateHref'> & {
        duplicateHref?: typeof compendiumDuplicateHref;
      }
    : never;

function CompendiumForm(props: CompendiumFormProps) {
  return <IngredientForm workspaceId={null} duplicateHref={compendiumDuplicateHref} {...props} />;
}

function WhatToTry() {
  return (
    <details open className="story-guide">
      <summary>What to try</summary>
      <ul>
        <li>
          <strong>Suggestions:</strong> focus New Form, Folk Name, Celestial Body, Zodiac Sign,
          Deity or Substitute Ingredient to list everything, then type to narrow it.
          &ldquo;wax&rdquo; in New Form shows two forms named Wax, told apart by group;
          &ldquo;mo&rdquo; in Celestial Body shows From Compendium and From Coven; &ldquo;hec&rdquo;
          in Deity shows Hecate under two traditions; &ldquo;test&rdquo; in Substitute Ingredient
          shows one plant twice, the compendium&rsquo;s and this coven&rsquo;s.
        </li>
        <li>
          <strong>A pick:</strong> pick either Wax in New Form, and a Wax form is added, its group
          following the text in its Form box, muted, its description in a tooltip on hover or focus;
          edit the text and the group goes. Pick both Hecates in Deity, and each pill reads with its
          tradition, its description in its tooltip.
        </li>
        <li>
          <strong>Forms:</strong> type Oil in New Form and press Add, then add Oil again: the repeat
          is refused at the box. The new form opens first, just beneath the box, with every one of
          its sections open; each heading folds its own, as the ingredient&rsquo;s do, and Open All
          / Close All reaches them too. Done folds the form to its summary line, and Edit opens it
          again, closing any other. Save with a form&rsquo;s box holding text while it or its
          section is folded, and both open on the error. Remove takes a form out. In a form&rsquo;s
          Substitute Ingredient, &ldquo;test&rdquo; lists the Testwort that comes in oil first, one
          row for each of its forms, and never Mockleaf, which comes in none; pick a form, and its
          pill names it. Each of a form&rsquo;s fields has a Copy From Ingredient icon button, shut
          while the ingredient&rsquo;s own field is empty: fill the ingredient&rsquo;s, and press it
          to add what the form lacks. Its Substitute Ingredients links the same form of each, and
          names beneath the list those in no such form, with Copy Anyway to add them as names.
        </li>
        <li>
          <strong>Your own text:</strong> type something nothing matches and pick &ldquo;Use what
          you typed&rdquo;, or press Add or Enter in a list.
        </li>
        <li>
          <strong>Duplicate warning:</strong> a Name with &ldquo;cat&rdquo; in it, such as
          Cat&rsquo;s Claw. Save is held until you press Create Anyway.
        </li>
        <li>
          <strong>Missing name:</strong> Save with Name empty.
        </li>
        <li>
          <strong>Classification and formal name:</strong> type a Formal Name and Save with no
          Classification, or choose Botanical and Save with no Formal Name. Choosing Unknown or None
          shuts the Formal Name.
        </li>
        <li>
          <strong>Text left in a box:</strong> type into any list&rsquo;s box without pressing Add,
          then Save.
        </li>
        <li>
          <strong>Moving an entry:</strong> add a few Celestial Bodies, Zodiac Signs, Colours or
          Deities, enough to wrap onto a second row, and drag one by its grip; or Tab to it, press
          Space, move it with the arrow keys and press Space again. Folk Names and Substitute
          Ingredients have no grip.
        </li>
        <li>
          <strong>Repeated entry:</strong> add Mars to Celestial Bodies, then type
          &ldquo;mars&rdquo; and press Add: nothing is added, and the box says why. Mars is no
          longer suggested, nor is the Name among Folk Names. Pick Greek Hecate, and Roman Hecate is
          still offered.
        </li>
        <li>
          <strong>Long entry:</strong> add a Folk Name too long for the box, then hover it.
        </li>
        <li>
          <strong>References:</strong> focus Reference to list three sources, or type
          &ldquo;fixture&rdquo;; pick one and it becomes a one-line row beneath the box. Its pencil
          opens the row to the whole citation, wrapping the web page&rsquo;s long address, and a
          Locator to fill in; its &times; takes it out. A picked source is not offered again. An
          open row of this coven&rsquo;s own source has Edit Source, which opens the panel filled in
          with the whole source; Save Source changes it for every entry citing it, and the row reads
          the new short form, while Cancel or the &times; at the panel&rsquo;s top closes it
          unchanged. A compendium source has none here: it is the keepers&rsquo; to change.
        </li>
        <li>
          <strong>A new reference:</strong> pick &ldquo;New Reference&rdquo;, the list&rsquo;s last
          row, and choose a Kind: each shows only its own fields, the required ones starred. Save
          Reference with a Chapter&rsquo;s Book empty, or a Web Page&rsquo;s Address, to see them
          refused; a Title with &ldquo;taken&rdquo; in it is refused by the server beside Title, and
          one with &ldquo;refuse&rdquo; in it above the panel&rsquo;s fields. Enter in a field saves
          the reference, not the ingredient. Save the ingredient with the panel open to see it held.
        </li>
        <li>
          <strong>Tidied as you go:</strong> in a new reference, type a Title in quotation marks, an
          Edition of &ldquo;2&rdquo;, Published &ldquo;1882-88&rdquo; or an Address with no
          https://, then Tab away; each is written as it will be saved. A picked source&rsquo;s
          Locator dashes its ranges the same way, and holds every place it is cited at: &ldquo;pp.
          12-19, 40; chap. 3&rdquo;. Published &ldquo;soon&rdquo;, Pages &ldquo;the middle&rdquo; or
          an Accessed day next month are refused beside the field.
        </li>
        <li>
          <strong>Categories:</strong> focus Category, or press its chevron, to list every category
          under its group, and type to narrow them; a pick is a chip in its group&rsquo;s colour
          inside the box, as a Deity is. Nothing typed is a category, so there is no Add and no
          &ldquo;Use what you typed&rdquo;.
        </li>
        <li>
          <strong>Refused by the server:</strong> a Name with &ldquo;taken&rdquo; in it is refused
          beside Name; one with &ldquo;refuse&rdquo; in it is refused above the form; one with
          &ldquo;retired&rdquo; in it, with a category picked, refuses the first category picked,
          named beneath the box.
        </li>
        <li>
          <strong>Saved:</strong> any other Name. The button pressed reads &ldquo;Saving
          Ingredient&rdquo; for two seconds. Save Ingredient then says what it saved, keeps the
          form, and names the page it would open beneath the buttons, since on a real page the new
          ingredient opens in its place; Save &amp; Add Another says what it saved, clears the form
          and puts you back in Name.
        </li>
      </ul>
    </details>
  );
}

const CovenView = () => {
  const [opens, setOpens] = useState<string | null>(null);
  const onSaved = ({ id }: SavedIngredient, next: AfterSave) =>
    setOpens(next === 'open' ? `/coven/fixture-coven/ingredients/${id}` : null);
  return (
    <>
      <WhatToTry />
      <IngredientForm
        workspaceId={WORKSPACE_ID}
        duplicateHref={covenDuplicateHref}
        onSaved={onSaved}
      />
      {opens !== null && (
        // `output` carries the status role itself, so no `role` attribute.
        <output className="story-note">
          Save Ingredient would now open <code>{opens}</code>, the new ingredient&rsquo;s page.
        </output>
      )}
    </>
  );
};
const covenNode = <CovenView />;

const linkOf = ({
  id,
  canonicalName,
  description,
  isGlobal,
  variants,
}: (typeof INGREDIENTS)[number]) => ({
  id,
  canonicalName,
  description,
  isGlobal,
  forms: variants.map(({ form }) => form),
  variants: variants.map(({ id: variantId, form }) => ({ id: variantId, form, group: null })),
});

const covenDuplicateHref = ({ id }: { id: string }) => `/coven/fixture-coven/ingredients/${id}`;
const compendiumDuplicateHref = ({ slug }: { slug: string }) => `/curator/compendium?edit=${slug}`;

const entryHref = ({ slug }: { slug: string }) => `/curator/compendium?edit=${slug}`;

const cited = ({ citation, ...link }: (typeof SOURCES)[number], locator = '') => ({
  value: citation,
  link,
  locator,
  nameBasis: '' as const,
  supports: [],
});

const ENTRY = {
  id: '00000000-0000-4000-8000-000000000301',
  values: {
    ...EMPTY_VALUES,
    name: 'Testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    variants: [
      {
        ...EMPTY_VARIANT,
        variantId: '00000000-0000-4000-8000-000000000311',
        form: 'Dried leaf',
        formLink: {
          id: '00000000-0000-4000-8000-000000000103',
          name: 'Dried leaf',
          group: 'Plant part',
          icon: 'botanical',
          description: null,
        },
        safetyNotes: 'Dry away from damp.',
        toxic: true,
        celestialBodies: [{ value: 'Mercury' }],
        categoryIds: [CATEGORIES[0].id, CATEGORIES[1].id],
        substitutes: [
          {
            value: 'Fixturewort',
            link: linkOf(INGREDIENTS[2]),
            variantId: INGREDIENTS[2].variants[0].id,
          },
          { value: 'Hedge Mockroot' },
        ],
        references: [cited(SOURCES[1], 'pp. 12–19')],
      },
      {
        ...EMPTY_VARIANT,
        variantId: '00000000-0000-4000-8000-000000000312',
        form: 'Whole root',
        formLink: {
          id: '00000000-0000-4000-8000-000000000104',
          name: 'Whole root',
          group: 'Plant part',
          icon: 'botanical',
          description: null,
        },
      },
    ],
    description: 'A fixture herb, for the workshop.',
    celestialBodies: [{ value: 'Mercury' }],
    substitutes: [
      { value: 'Fixturewort', link: linkOf(INGREDIENTS[2]) },
      {
        value: 'Testwort',
        link: linkOf(INGREDIENTS[0]),
        variantId: INGREDIENTS[0].variants[1].id,
      },
      { value: 'Hedge Mockroot' },
    ],
    categoryIds: [CATEGORIES[0].id],
    references: [cited(SOURCES[0], 'p. 112'), cited(SOURCES[1], 'p. 14'), cited(SOURCES[2])],
  } satisfies IngredientFormValues,
};

function openSection(title: string, root: ParentNode = document): void {
  [...root.querySelectorAll<HTMLButtonElement>('.collapsible-section__toggle')]
    .find((button) => button.textContent === title && button.ariaExpanded === 'false')
    ?.click();
}

function openDriedLeaf(): HTMLElement | null {
  const edit = document.querySelector<HTMLButtonElement>('button[aria-label="Edit Dried leaf"]');
  edit?.click();
  return edit?.closest<HTMLElement>('.ingredient-form__variant') ?? null;
}

function WhatToTryOnTheCompendium({ editing }: { editing: boolean }) {
  return (
    <details open className="story-guide">
      <summary>What to try</summary>
      <ul>
        <li>
          <strong>Classification:</strong> required here: Save with none chosen to see it refused.
        </li>
        <li>
          <strong>Picks only:</strong> New Form, a form’s Form, Celestial Body, Zodiac Sign and
          Deity offer the curated rows alone, with no &ldquo;Use what you typed&rdquo; and no Add;
          type into one and Save, or press Enter, to see the text refused. Substitute Ingredient
          offers the compendium&rsquo;s entries alone{editing ? ', never this one' : ''}.
        </li>
        <li>
          <strong>Another entry&rsquo;s redirect:</strong> a Name with &ldquo;redirect&rdquo; in it
          is asked about in place of the saves; End Redirect &amp; Save sends it again, Cancel drops
          the question.
        </li>
        {editing && (
          <li>
            <strong>Substitutes:</strong> Fixturewort and Testwort &middot; Oil are linked entries,
            each led by a link mark and underlined: press one to open its summary, and press it
            again, press Escape or press elsewhere to close it. Hedge Mockroot is a name only, plain
            text that opens nothing.
          </li>
        )}
        <li>
          <strong>Sections:</strong> each heading opens and closes its section, several at once;
          {editing
            ? ' an edit opens with every one closed, '
            : ' a new entry opens with every one open, '}
          each closed one summarising what it holds on the line beneath. Open All / Close All above
          them opens or closes every one. Save with an error in a closed section, a colour left in
          its box say, and that section opens on it.
        </li>
        {editing && (
          <li>
            <strong>Edit and delete:</strong> Save Ingredient is off until something changes; Delete
            Ingredient asks first.
          </li>
        )}
      </ul>
    </details>
  );
}

const CompendiumView = () => {
  return (
    <>
      <WhatToTryOnTheCompendium editing={false} />
      <CompendiumForm />
    </>
  );
};
const compendiumNode = <CompendiumView />;

const CompendiumEntryView = () => {
  return (
    <>
      <WhatToTryOnTheCompendium editing />
      <CompendiumForm entry={ENTRY} entryHref={entryHref} />
    </>
  );
};
const compendiumEntryNode = <CompendiumEntryView />;

export const CompendiumEntrySectionOpen: Story = {
  render: () => {
    useEffect(() => openSection('Correspondences'), []);
    return <CompendiumForm entry={ENTRY} />;
  },
};

export const CompendiumEntrySaveError: Story = {
  render: () => {
    useEffect(() => {
      document.querySelector<HTMLFormElement>('form.ingredient-form')?.requestSubmit();
    }, []);
    return (
      <CompendiumForm
        entry={{
          ...ENTRY,
          values: {
            ...ENTRY.values,
            substitutes: [],
            references: [],
            variants: ENTRY.values.variants.map((variant) => ({
              ...variant,
              substitutes: [],
              references: [],
            })),
            drafts: { ...ENTRY.values.drafts, colors: 'Fixture Red' },
          },
        }}
      />
    );
  },
};

export const CompendiumEntryVariantOpen: Story = {
  render: () => {
    useEffect(() => {
      openSection('Forms');
      openDriedLeaf();
    }, []);
    return <CompendiumForm entry={ENTRY} />;
  },
};

export const CompendiumEntryVariantSectionOpen: Story = {
  render: () => {
    useEffect(() => {
      openSection('Forms');
      const card = openDriedLeaf();
      if (card) openSection('Correspondences', card);
    }, []);
    return <CompendiumForm entry={ENTRY} />;
  },
};

export const VariantAdded: Story = {
  render: () => {
    useEffect(() => {
      const box = document.querySelector<HTMLInputElement>('input[name="drafts.variants"]');
      if (!box) return;
      setInputValue(box, 'Oil');
      const timer = setTimeout(() =>
        document.querySelector<HTMLButtonElement>('button[aria-label="Add Form"]')?.click(),
      );
      return () => clearTimeout(timer);
    }, []);
    return <IngredientForm workspaceId={WORKSPACE_ID} duplicateHref={covenDuplicateHref} />;
  },
};

export const CompendiumEntryCopySkipped: Story = {
  render: () => {
    useEffect(() => {
      openSection('Forms');
      const card = openDriedLeaf();
      if (card) openSection('Relations', card);
      const timer = setTimeout(() =>
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Copy From Ingredient: Substitute Ingredients"]',
          )
          ?.click(),
      );
      return () => clearTimeout(timer);
    }, []);
    const values = {
      ...ENTRY.values,
      substitutes: [
        ...ENTRY.values.substitutes,
        { value: 'Mockleaf', link: linkOf(INGREDIENTS[3]) },
      ],
    };
    return <CompendiumForm entry={{ ...ENTRY, values }} />;
  },
};

export const CompendiumEntryEditSource: Story = {
  render: () => {
    useEffect(() => {
      openSection('Sources');
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Fixture, Testwort Herbal"]')
        ?.click();
      const timer = setTimeout(() =>
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Edit Source Fixture, Testwort Herbal"]',
          )
          ?.click(),
      );
      return () => clearTimeout(timer);
    }, []);
    return <CompendiumForm entry={ENTRY} />;
  },
};

export const CompendiumEntrySubstituteSummary: Story = {
  render: () => {
    useEffect(() => {
      openSection('Relations');
      document
        .querySelector<HTMLButtonElement>('button.combobox__entry-open[aria-expanded="false"]')
        ?.click();
    }, []);
    return <CompendiumForm entry={ENTRY} entryHref={entryHref} />;
  },
};

const CompendiumEntryInModalForm = () => {
  return (
    <Reopenable>
      {(close) => (
        <Modal
          eyebrow="Edit Ingredient"
          title="Testwort"
          qualifier={<span className="binomial">Fixtura testalis</span>}
          onClose={close}
        >
          <CompendiumForm entry={ENTRY} entryHref={entryHref} />
        </Modal>
      )}
    </Reopenable>
  );
};

export const CompendiumEntryInModal: Story = { render: () => <CompendiumEntryInModalForm /> };

function scrollBody(share: number): void {
  const body = document.querySelector<HTMLElement>('.modal-dialog__body');
  if (body) body.scrollTop = (body.scrollHeight - body.clientHeight) * share;
}

export const AskingToDeleteInModal: Story = {
  render: () => {
    useEffect(() => {
      press('Open All');
      const later = requestAnimationFrame(() => {
        scrollBody(1);
        press('Delete Ingredient');
      });
      return () => cancelAnimationFrame(later);
    }, []);
    return <CompendiumEntryInModalForm />;
  },
};

const PROMOTABLE = {
  ...ENTRY,
  values: {
    ...ENTRY.values,
    folkNames: [
      { value: 'Hedge Fixture', id: '00000000-0000-4000-8000-000000000401' },
      { value: 'Fixture Bane', id: '00000000-0000-4000-8000-000000000402' },
    ],
  },
};

function PromotableEntry({ asking, changed }: { asking: boolean; changed: boolean }) {
  useEffect(() => {
    openSection('Identity');
    if (changed) {
      const name = document.querySelector<HTMLInputElement>('input[name="name"]');
      if (name) {
        setInputValue(name, 'Testwort Edited');
      }
    }
    if (asking) {
      setTimeout(
        () =>
          document
            .querySelector<HTMLButtonElement>(
              'button[aria-label="Make Hedge Fixture the Display Name"]',
            )
            ?.click(),
        50,
      );
    }
  }, [asking, changed]);
  return <CompendiumForm entry={PROMOTABLE} entryHref={entryHref} mayPromote />;
}

export const PromoteControl: Story = {
  render: () => <PromotableEntry asking={false} changed={false} />,
};

export const PromoteQuestion: Story = { render: () => <PromotableEntry asking changed={false} /> };

export const PromoteQuestionWithChanges: Story = {
  render: () => <PromotableEntry asking changed />,
};

export const PromoteQuestionCoven: Story = {
  render: () => {
    const promotion = usePromoteFolkName(WORKSPACE_ID, PROMOTABLE.id);
    return (
      <PromoteFolkNameQuestion
        promotion={promotion}
        folkName={{ id: '00000000-0000-4000-8000-000000000401', value: 'Hedge Fixture' }}
        displayName="Testwort"
        tier="coven"
        dirty={false}
        saveFirst={async () => true}
        discardFirst={() => undefined}
        onPromoted={() => undefined}
        onKeep={() => undefined}
        onRefused={() => undefined}
      />
    );
  },
};

export const LoadingSubstituteSummary: Story = {
  beforeEach: ({ msw }) => msw.use(hangAllOperations()),
  render: () => {
    const id = useId();
    useEffect(() => {
      document
        .querySelector<HTMLButtonElement>('button.combobox__entry-open[aria-expanded="false"]')
        ?.click();
    }, []);
    return (
      <div className="form" style={{ maxWidth: '32rem' }}>
        <ul className="combobox__entries">
          <ComboboxEntry
            value="Mockleaf"
            onRemove={() => undefined}
            summary={substituteSummary(
              {
                value: 'Mockleaf',
                link: { id, canonicalName: null, forms: [], description: null, isGlobal: true },
              },
              'Mockleaf',
              null,
            )}
          />
        </ul>
      </div>
    );
  },
};

const NEAR_MATCHES = CATS_CLAW.map((match) => ({
  ...match,
  isGlobal: true,
  inCupboard: false,
}));

const noop = async () => false;

function HeldNameField({ blocking }: { blocking: boolean }) {
  const methods = useForm<IngredientFormValues>({
    defaultValues: { ...EMPTY_VALUES, name: "Cat's Claws" },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={(event) => event.preventDefault()}>
        <NameField
          warning={{
            shown: NEAR_MATCHES,
            blocking,
            pending: false,
            exact: [],
            check: noop,
            dismiss: () => undefined,
            added: async () => undefined,
          }}
          hrefOf={covenDuplicateHref}
          onUse={async () => false}
          ref={null}
        />
      </form>
    </FormProvider>
  );
}

function Duplicates() {
  return (
    <div className="page-column">
      <h3>Typing: A Question</h3>
      <HeldNameField blocking={false} />
      <h3>Save Pressed: On Hold</h3>
      <HeldNameField blocking />
    </div>
  );
}

export const DuplicatesNotice: Story = { render: () => <Duplicates /> };

const STATES_STATES: Record<string, ReactNode> = {
  Coven: covenNode,
  Compendium: compendiumNode,
  'Compendium Entry': compendiumEntryNode,
};

export const States: Story = {
  args: { state: 'Coven' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
