import type { Story } from '@ladle/react';
import { useEffect, useLayoutEffect, useState } from 'react';
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
  ReferenceQuery,
  ReferenceSuggestionsQuery,
  UpdateCompendiumIngredientMutation,
  UpdateReferenceMutation,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
import { citationText } from '../../lib/citation';
import type { CitationFields } from '../../lib/types';
import Modal from '../Modal';
import IngredientForm from '.';
import { press } from '../../../.ladle/press';
import { Reopenable } from '../../../.ladle/reopenable';
import type { AfterSave, IngredientFormValues, SavedIngredient } from './types';
import { EMPTY_VALUES, EMPTY_VARIANT } from './values';

// Render-only; behaviour is asserted in tests/components/IngredientForm. The
// workshop has no API, and on staging its pages may not fetch at all
// (claude-docs/workshop.md, "On staging"), so the story answers the form
// itself: while it is mounted, a request to /api/graphql naming one of its
// lookups is answered from the invented rows below, filtered by what was
// typed, and a save is answered after a pause long enough to watch Save wait.
// None of it leaves the page. "What to try" above the form says what to type
// for each state. The TanStack Query client comes from the workshop's global provider
// (.ladle/components.tsx), as it does from the app's root layout.
export default {
  title: 'Admin / Ingredient Form',
};

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000000';

/** Case-folded substring, standing in for the server's trigram match: enough to filter as you type. */
const matches = (query: string, ...texts: (string | null)[]) =>
  texts.some((text) => text?.toLowerCase().includes(query.trim().toLowerCase()));

// A curated row carries the id a pick sends (MB.169); one only in use has none.
const FORMS = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    value: 'Wax',
    description: 'Beeswax, as it comes from the comb.',
    group: 'Animal',
    curated: true,
    claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    value: 'Wax',
    description: 'Candle and poppet wax.',
    group: 'Substance',
    curated: true,
    claimants: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    value: 'Dried leaf',
    description: null,
    group: 'Plant part',
    curated: true,
    claimants: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    value: 'Whole root',
    description: null,
    group: 'Plant part',
    curated: true,
    claimants: [],
  },
  {
    id: null,
    value: 'Moon-dried shavings',
    description: null,
    group: null,
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
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    value: 'Hecate',
    description: 'Called Trivia in Rome, goddess of the three-way crossroads.',
    tradition: 'Roman',
    curated: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    value: 'Hermes',
    description: null,
    tradition: 'Greek',
    curated: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    value: 'Mercury',
    description: null,
    tradition: 'Roman',
    curated: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    value: 'Freyja',
    description: null,
    tradition: 'Norse',
    curated: true,
  },
  {
    id: null,
    value: 'Hedge Mother Fixture',
    description: null,
    tradition: null,
    curated: false,
  },
];

// The two Testworts differ only in forms and tier, which a picked pill's
// tooltip tells (MB.164, MB.222). A row's forms are its variants.
const INGREDIENTS = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'Testwort',
    canonicalName: 'Fixtura testalis',
    description: 'A fixture herb, for the workshop.',
    isGlobal: true,
    // In forms, so a variant's substitutes rank it and offer it form by form (MB.115).
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

/**
 * What a linked substitute's summary reads of each ingredient above (MB.115):
 * its classification and correspondences, and each form's own, which add to
 * the ingredient's.
 */
const SUMMARIES = Object.fromEntries(
  INGREDIENTS.map((row) => [
    row.id,
    {
      id: row.id,
      name: row.name,
      canonicalName: row.canonicalName,
      // Long enough to run past the panel's three lines and be cut.
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
      })),
    },
  ]),
) satisfies Record<string, IngredientSummaryQuery['ingredient']>;

// Invented sources in both tiers — a book, an article by two authors and a
// web page, so the rows show each short form — one long enough to wrap and
// one carrying an address, rendered by the one renderer as the server
// renders them. Each one's fields are kept whole, for the edit to open on.
const SOURCE_FIELDS = new Map<string, CitationFields>();
const source = (id: string, isGlobal: boolean, fields: CitationFields) => {
  SOURCE_FIELDS.set(id, fields);
  return summaryOf(id, isGlobal, fields);
};
/** A source as a row carries it: its citation, and the fields its short form is made of. */
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

const CATS_CLAW = [
  {
    id: 'claw-1',
    name: "Cat's Claw",
    canonicalName: 'Uncaria tomentosa',
    slug: 'cats-claw-uncaria-tomentosa',
  },
  {
    id: 'claw-2',
    name: "Cat's Claw",
    canonicalName: 'Felis catus',
    slug: 'cats-claw-felis-catus',
  },
  { id: 'claw-3', name: "Cat's Claw", canonicalName: null, slug: 'cats-claw' },
];

/** How long a save takes to be accepted: long enough to see Save busy and shut. */
const SAVE_DELAY_MS = 2000;

/**
 * The seed's eight groups and their colour pairs, copied from
 * src/db/seed/category-groups.ts, which a component may not import (CLAUDE.md
 * rule 1), each with two invented categories (MB.126): the picker reads them
 * all, as one page.
 */
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

/**
 * The answer to one lookup, by its operation name, or undefined for any other
 * operation. Each is typed as its query's result, so a fixture that drifts
 * from the schema stops compiling.
 */
function answer(operation: string, variables: Record<string, unknown>): object | undefined {
  const query = String(variables.query ?? variables.name ?? '');
  const first = Number(variables.first ?? 10);
  switch (operation) {
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
        ingredientSuggestions: page(
          INGREDIENTS.filter((row) => matches(query, row.name, row.canonicalName)),
          first,
        ),
      } satisfies IngredientSuggestionsQuery;
    case 'CompendiumSubstitutes':
      // The compendium's own entries alone, as `compendium(query)` answers.
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
        },
      } satisfies ReferenceQuery;
    }
    case 'UpdateReference': {
      // Kept, so the edit opened again reads what was saved.
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
      // Only a name close to "Cat's Claw" is near anything.
      return {
        possibleDuplicates: page(query.toLowerCase().includes('cat') ? CATS_CLAW : [], first),
      } satisfies PossibleDuplicatesQuery;
    case 'CreateWorkspaceIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        createWorkspaceIngredient: {
          id: crypto.randomUUID(),
          name: input?.name ?? '',
          slug: 'new',
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
        },
      } satisfies CreateCompendiumIngredientMutation;
    }
    case 'UpdateCompendiumIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        updateCompendiumIngredient: { id: ENTRY.id, name: input?.name ?? '', slug: 'saved' },
      } satisfies UpdateCompendiumIngredientMutation;
    }
    case 'DeleteCompendiumIngredient':
      return {
        deleteCompendiumIngredient: ENTRY.id,
      } satisfies DeleteCompendiumIngredientMutation;
    default:
      return undefined;
  }
}

/** The two writes, each answered after `SAVE_DELAY_MS`. */
const SAVES = new Set([
  'CreateWorkspaceIngredient',
  'CreateCompendiumIngredient',
  'UpdateCompendiumIngredient',
  'DeleteCompendiumIngredient',
  'CreateReference',
  'UpdateReference',
]);

/**
 * The refusal a save meets, in the body /api/graphql sends one in, or
 * undefined for a save that lands: a name holding "taken" is refused on the
 * name, one holding "refuse" as a whole, and one holding "retired" on its first
 * category picked, so each server error can be seen.
 * A new or edited reference is refused the same way by its title.
 */
function refusal(operation: string, variables: Record<string, unknown>): object | undefined {
  const input = variables.input as
    { name?: string; title?: string; categoryIds?: string[] } | undefined;
  const field = operation.endsWith('Reference') ? 'title' : 'name';
  const name = String(input?.[field] ?? '');
  // A compendium save whose name holds "redirect" would take another entry's
  // old address (MB.82), until it is sent again confirmed.
  if (
    /redirect/i.test(name) &&
    operation.endsWith('CompendiumIngredient') &&
    !variables.endRedirect
  ) {
    return {
      data: null,
      errors: [
        {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION',
            fieldErrors: [
              {
                path: ['endRedirect'],
                message:
                  '"fixturewort-fixtura-vulgaris" redirects to "Fixturewort" (Fixtura vulgaris, whole root) until 4 April 2027, 00:00 UTC — confirm to end that redirect',
              },
            ],
          },
        },
      ],
    };
  }
  if (/taken/i.test(name)) {
    return {
      data: null,
      errors: [
        {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION',
            fieldErrors: [
              field === 'title'
                ? { path: ['title'], message: 'This coven already has a source by that title' }
                : { path: ['name'], message: 'This coven already has an ingredient by that name' },
            ],
          },
        },
      ],
    };
  }
  // A retired category, picked before an admin deleted it: the first pick's.
  if (/retired/i.test(name) && input?.categoryIds?.length) {
    return {
      data: null,
      errors: [
        {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION',
            fieldErrors: [{ path: ['categoryIds', 0], message: 'No such category' }],
          },
        },
      ],
    };
  }
  if (/refuse/i.test(name)) {
    return {
      data: null,
      errors: [
        {
          message: `You can't add ${field === 'title' ? 'sources' : 'ingredients'} to this coven`,
          extensions: { code: 'FORBIDDEN' },
        },
      ],
    };
  }
  return undefined;
}

/**
 * Answers the form from the rows above while the story is mounted, in place
 * of `window.fetch`, which the GraphQL client looks up on every request; a save
 * after `SAVE_DELAY_MS`, refused or accepted. The original is put back on
 * unmount, so no other story sees the stub.
 */
function useCannedApi(): void {
  useLayoutEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/graphql' && typeof init?.body === 'string') {
        const { operationName, variables = {} } = JSON.parse(init.body) as {
          operationName?: string;
          variables?: Record<string, unknown>;
        };
        const data = operationName ? answer(operationName, variables) : undefined;
        if (data) {
          let body: object = { data };
          if (operationName && SAVES.has(operationName)) {
            await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
            body = refusal(operationName, variables) ?? body;
          }
          return new Response(JSON.stringify(body), {
            headers: { 'content-type': 'application/json' },
          });
        }
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, []);
}

/** What to type for each state the form can be in, beside it in the workshop. */
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
          <strong>A pick:</strong> pick either Wax in New Form, and a Wax variant is added, its
          group following the text in its Form box, muted, its description in a tooltip on hover or
          focus; edit the text and the group goes. Pick both Hecates in Deity, and each pill reads
          with its tradition, its description in its tooltip.
        </li>
        <li>
          <strong>Variants:</strong> type Oil in New Form and press Add, then add Oil again: the
          repeat is refused at the box. The new variant opens first, just beneath the box, with
          every one of its sections open; each heading folds its own, as the ingredient&rsquo;s do,
          and Open All / Close All reaches them too. Done folds the variant to its summary line, and
          Edit opens it again, closing any other. Save with a variant&rsquo;s box holding text while
          it or its section is folded, and both open on the error. Remove takes a variant out. In a
          variant&rsquo;s Substitute Ingredient, &ldquo;test&rdquo; lists the Testwort that comes in
          oil first, one row for each of its forms, and never Mockleaf, which comes in none; pick a
          form, and its pill names it. Each of a variant&rsquo;s fields has Copy From Ingredient,
          shut while the ingredient&rsquo;s own field is empty: fill the ingredient&rsquo;s, and
          press it to add what the variant lacks. Its Substitute Ingredients links the same form of
          each, and names beneath the list those in no such form, with Copy Anyway to add them as
          names.
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
          unchanged. A compendium source has none here: it is the admins&rsquo; to change.
        </li>
        <li>
          <strong>A new reference:</strong> pick &ldquo;New Reference&hellip;&rdquo;, the
          list&rsquo;s last row, and choose a Kind: each shows only its own fields, the required
          ones starred. Save Reference with a Chapter&rsquo;s Book empty, or a Web Page&rsquo;s
          Address, to see them refused; a Title with &ldquo;taken&rdquo; in it is refused by the
          server beside Title, and one with &ldquo;refuse&rdquo; in it above the panel&rsquo;s
          fields. Enter in a field saves the reference, not the ingredient. Save the ingredient with
          the panel open to see it held.
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

/**
 * Every lookup answered and the save faked, with what to type for each state
 * beside it. Unframed: the form takes its width from whatever holds it.
 */
export const Blank: Story = () => {
  useCannedApi();
  // Where Save Ingredient would go: the page holding the form navigates on
  // 'open', and the workshop has no page to go to, so it says so instead.
  const [opens, setOpens] = useState<string | null>(null);
  const onSaved = ({ id }: SavedIngredient, next: AfterSave) =>
    setOpens(next === 'open' ? `/ingredients/${id}` : null);
  return (
    <>
      <WhatToTry />
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
      {opens !== null && (
        // `output` carries the status role itself, so no `role` attribute.
        <output className="story-note">
          Save Ingredient would now open <code>{opens}</code>, the new ingredient&rsquo;s page.
        </output>
      )}
    </>
  );
};

/** One of INGREDIENTS as a substitute's link, as an edit reads it back. */
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

/** Where a summary links its entry on the admin's page: that entry's modal. */
const entryHref = ({ slug }: { slug: string }) => `/admin/compendium?edit=${slug}`;

/** One of SOURCES as a reference row, cited at `locator`. */
const cited = ({ citation, ...link }: (typeof SOURCES)[number], locator = '') => ({
  value: citation,
  link,
  locator,
});

// The entry the edit story opens: a celestial body listed, a category picked
// (MB.126), three sources — a book, an article by two authors and a web
// page — and two forms, one carrying details of its own.
const ENTRY = {
  id: '00000000-0000-4000-8000-000000000301',
  values: {
    ...EMPTY_VALUES,
    name: 'Testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    // Two forms (MB.221), the first with details of its own and the second
    // with none, so their summary lines show both (MB.115).
    variants: [
      {
        ...EMPTY_VARIANT,
        variantId: '00000000-0000-4000-8000-000000000311',
        form: 'Dried leaf',
        formLink: {
          id: '00000000-0000-4000-8000-000000000103',
          name: 'Dried leaf',
          group: 'Plant part',
          description: null,
        },
        safetyNotes: 'Dry away from damp.',
        celestialBodies: [{ value: 'Mercury' }],
        categoryIds: [CATEGORIES[0].id, CATEGORIES[1].id],
        // A form's link names one form of what it links (MB.115): Fixturewort
        // in its one form, beside a name typed.
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
          description: null,
        },
      },
    ],
    description: 'A fixture herb, for the workshop.',
    celestialBodies: [{ value: 'Mercury' }],
    // Two linked compendium entries, one in a form of it, and a name typed
    // (MB.115): the linked chips lead with a link mark and open a summary.
    substitutes: [
      { value: 'Fixturewort', link: linkOf(INGREDIENTS[2]) },
      {
        value: 'Testwort',
        link: linkOf(INGREDIENTS[0]),
        variantId: INGREDIENTS[0].variants[1].id,
      },
      { value: 'Hedge Mockroot' },
    ],
    // Testward, one of the categories the stand-in answers the picker with.
    categoryIds: [CATEGORIES[0].id],
    references: [cited(SOURCES[0], 'p. 112'), cited(SOURCES[1], 'p. 14'), cited(SOURCES[2])],
  } satisfies IngredientFormValues,
};

/**
 * Opens the form's section titled `title` once the story is drawn, as a
 * person opens it, by its heading: an edit opens with every section closed
 * (MB.115), and which are open is the form's own state. Within `root`, an
 * open variant's card, it opens that variant's section of the name.
 */
function openSection(title: string, root: ParentNode = document): void {
  [...root.querySelectorAll<HTMLButtonElement>('.ingredient-form__fold-toggle')]
    .find((button) => button.textContent === title && button.ariaExpanded === 'false')
    ?.click();
}

/** Opens the entry's Dried leaf by its Edit, its sections closed as an edit's are, and returns its card. */
function openDriedLeaf(): HTMLElement | null {
  const edit = document.querySelector<HTMLButtonElement>('button[aria-label="Edit Dried leaf"]');
  edit?.click();
  return edit?.closest<HTMLElement>('.ingredient-form__variant') ?? null;
}

/** What the compendium form adds to the coven's, beside it in the workshop. */
function WhatToTryOnTheCompendium({ editing }: { editing: boolean }) {
  return (
    <details open className="story-guide">
      <summary>What to try</summary>
      <ul>
        <li>
          <strong>Classification:</strong> required here: Save with none chosen to see it refused.
        </li>
        <li>
          <strong>Picks only:</strong> New Form, a variant&rsquo;s Form, Celestial Body, Zodiac Sign
          and Deity offer the curated rows alone, with no &ldquo;Use what you typed&rdquo; and no
          Add; type into one and Save, or press Enter, to see the text refused. Substitute
          Ingredient offers the compendium&rsquo;s entries alone{editing ? ', never this one' : ''}.
        </li>
        <li>
          <strong>Another entry&rsquo;s redirect:</strong> a Name with &ldquo;redirect&rdquo; in it
          is asked about in place of the saves; End Redirect &amp; Save sends it again, Keep It
          drops the question.
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

/** The admin's form for a new compendium entry (M5.5): no coven, so every lookup asks the compendium alone. */
export const Compendium: Story = () => {
  useCannedApi();
  return (
    <>
      <WhatToTryOnTheCompendium editing={false} />
      <IngredientForm workspaceId={null} onCancel={() => undefined} />
    </>
  );
};

/** The admin's form over an existing compendium entry: one save, and a delete. */
export const CompendiumEntry: Story = () => {
  useCannedApi();
  return (
    <>
      <WhatToTryOnTheCompendium editing />
      <IngredientForm
        workspaceId={null}
        entry={ENTRY}
        entryHref={entryHref}
        onCancel={() => undefined}
      />
    </>
  );
};

/** The same entry with its Correspondences open, the other sections summarised. */
export const CompendiumEntrySectionOpen: Story = () => {
  useCannedApi();
  useEffect(() => openSection('Correspondences'), []);
  return <IngredientForm workspaceId={null} entry={ENTRY} onCancel={() => undefined} />;
};

/**
 * The same entry, a colour left typed in its box, saved: the save refuses the
 * text, and Correspondences, closed, opens on the error, flagged, the box
 * focused (MB.115). Submitted once drawn, Save being off until a change.
 */
export const CompendiumEntrySaveError: Story = () => {
  useCannedApi();
  useEffect(() => {
    document.querySelector<HTMLFormElement>('form.ingredient-form')?.requestSubmit();
  }, []);
  return (
    <IngredientForm
      workspaceId={null}
      entry={{
        ...ENTRY,
        // Without its links: the stand-in's ids are no ids the schema
        // takes, so a save would refuse each, and the colour is the one error.
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
      onCancel={() => undefined}
    />
  );
};

/**
 * The same entry with its first form open, as its Edit leaves it: the form's
 * own sections closed, as an edit's are, each summarising what it holds
 * (MB.115).
 */
export const CompendiumEntryVariantOpen: Story = () => {
  useCannedApi();
  // Pressed once it is drawn: which form is open is the form's own state.
  useEffect(() => {
    openSection('Variants');
    openDriedLeaf();
  }, []);
  return <IngredientForm workspaceId={null} entry={ENTRY} onCancel={() => undefined} />;
};

// The open form at a phone's width, in each theme.
export const VariantOpenPhoneDark: Story = () => <CompendiumEntryVariantOpen />;
VariantOpenPhoneDark.meta = { theme: 'dark', width: 375 };

export const VariantOpenPhoneLight: Story = () => <CompendiumEntryVariantOpen />;
VariantOpenPhoneLight.meta = { theme: 'light', width: 375 };

/** The same form open, with its own Correspondences opened by its heading, the rest summarised. */
export const CompendiumEntryVariantSectionOpen: Story = () => {
  useCannedApi();
  useEffect(() => {
    openSection('Variants');
    const card = openDriedLeaf();
    if (card) openSection('Correspondences', card);
  }, []);
  return <IngredientForm workspaceId={null} entry={ENTRY} onCancel={() => undefined} />;
};

/**
 * A coven's new ingredient with a form just added from the New Form box: it
 * opens first of the cards with every one of its sections open, as a new
 * entry's are (MB.115). Typed and added once drawn, as a person would.
 */
export const VariantAdded: Story = () => {
  useCannedApi();
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('input[name="drafts.variants"]');
    if (!box) return;
    // React reads a typed value through the input's own setter, not the property.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(box, 'Oil');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    // Once the typed text has reached the form, as a press after typing would.
    const timer = setTimeout(() =>
      document.querySelector<HTMLButtonElement>('button[aria-label="Add Variant"]')?.click(),
    );
    return () => clearTimeout(timer);
  }, []);
  return <IngredientForm workspaceId={WORKSPACE_ID} />;
};

/**
 * The same entry, Mockleaf, in no form at all, among its substitutes, with its
 * first form open, its Relations opened, and that form's Substitute
 * Ingredients copied (MB.115): Testwort links its Dried leaf, and the notice
 * beneath the list names Mockleaf, skipped, with Copy Anyway. Pressed once
 * drawn, as a person would.
 */
export const CompendiumEntryCopySkipped: Story = () => {
  useCannedApi();
  useEffect(() => {
    openSection('Variants');
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
    substitutes: [...ENTRY.values.substitutes, { value: 'Mockleaf', link: linkOf(INGREDIENTS[3]) }],
  };
  return (
    <IngredientForm workspaceId={null} entry={{ ...ENTRY, values }} onCancel={() => undefined} />
  );
};

// The notice at a phone's width, in each theme.
export const CopySkippedPhoneDark: Story = () => <CompendiumEntryCopySkipped />;
CopySkippedPhoneDark.meta = { theme: 'dark', width: 375 };

export const CopySkippedPhoneLight: Story = () => <CompendiumEntryCopySkipped />;
CopySkippedPhoneLight.meta = { theme: 'light', width: 375 };

/** The same entry with its first source open and its Edit Source pressed: the panel prefilled. */
export const CompendiumEntryEditSource: Story = () => {
  useCannedApi();
  // Pressed once drawn: the pencil opens the row, then Edit Source opens the panel.
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
  return <IngredientForm workspaceId={null} entry={ENTRY} onCancel={() => undefined} />;
};

// The edit panel at a phone's width, in each theme.
export const EditSourcePhoneDark: Story = () => <CompendiumEntryEditSource />;
EditSourcePhoneDark.meta = { theme: 'dark', width: 375 };

export const EditSourcePhoneLight: Story = () => <CompendiumEntryEditSource />;
EditSourcePhoneLight.meta = { theme: 'light', width: 375 };

/**
 * The same entry with its first linked substitute's summary open (MB.115):
 * pressed once it is drawn, the summary being the chip's own state.
 */
export const CompendiumEntrySubstituteSummary: Story = () => {
  useCannedApi();
  useEffect(() => {
    openSection('Relations');
    document
      .querySelector<HTMLButtonElement>('button.combobox__entry-open[aria-expanded="false"]')
      ?.click();
  }, []);
  return (
    <IngredientForm
      workspaceId={null}
      entry={ENTRY}
      entryHref={entryHref}
      onCancel={() => undefined}
    />
  );
};

// A phone's width, in each theme: the admin's edit, bare, its sections closed, as at desktop.
/**
 * The edit in its modal, as the admin compendium opens it: the eyebrow over
 * the entry's saved name and formal name, Open All / Close All beside them, and the header staying at the top as the form
 * scrolls beneath it (MB.115).
 */
export const CompendiumEntryInModal: Story = () => {
  useCannedApi();
  return (
    <Reopenable>
      {(close) => (
        <Modal
          eyebrow="Edit Ingredient"
          title="Testwort"
          qualifier={<span className="binomial">Fixtura testalis</span>}
          onClose={close}
        >
          <IngredientForm
            workspaceId={null}
            entry={ENTRY}
            entryHref={entryHref}
            onCancel={() => undefined}
          />
        </Modal>
      )}
    </Reopenable>
  );
};

/** Scrolls the modal's body to this share of the way down, 0 the top and 1 the foot. */
function scrollBody(share: number): void {
  const body = document.querySelector<HTMLElement>('.modal-dialog__body');
  if (body) body.scrollTop = (body.scrollHeight - body.clientHeight) * share;
}

/**
 * The edit in its modal, every section open and scrolled to the foot, where
 * Delete Ingredient is, and pressed: the question over the long form,
 * centred in the part in view, the form dimmed and held beneath it (MB.115).
 */
export const AskingToDeleteInModal: Story = () => {
  useCannedApi();
  useEffect(() => {
    press('Open All');
    // Once the opened sections are laid out, as a person scrolls after opening.
    const later = requestAnimationFrame(() => {
      scrollBody(1);
      press('Delete Ingredient');
    });
    return () => cancelAnimationFrame(later);
  }, []);
  return <CompendiumEntryInModal />;
};

/**
 * The edit in its modal, a change typed, every section open and scrolled half
 * way, then the Close button pressed: the unsaved changes' question over the
 * form, centred where the person had scrolled to (MB.115). Close again
 * flashes it.
 */
export const AskingToDiscardInModal: Story = () => {
  useCannedApi();
  useEffect(() => {
    const name = document.querySelector<HTMLInputElement>('input[name="name"]');
    if (name) {
      // React reads a typed value through the input's own setter, not the property.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        name,
        `${name.value} Renamed`,
      );
      name.dispatchEvent(new Event('input', { bubbles: true }));
    }
    press('Open All');
    const later = requestAnimationFrame(() => {
      scrollBody(0.5);
      press('Close');
    });
    return () => cancelAnimationFrame(later);
  }, []);
  return <CompendiumEntryInModal />;
};

// Both at a phone's width, in each theme: the card fills the width in view,
// its buttons stacked.
export const AskingToDeletePhoneDark: Story = () => <AskingToDeleteInModal />;
AskingToDeletePhoneDark.meta = { theme: 'dark', width: 375 };

export const AskingToDeletePhoneLight: Story = () => <AskingToDeleteInModal />;
AskingToDeletePhoneLight.meta = { theme: 'light', width: 375 };

export const AskingToDiscardPhoneDark: Story = () => <AskingToDiscardInModal />;
AskingToDiscardPhoneDark.meta = { theme: 'dark', width: 375 };

export const AskingToDiscardPhoneLight: Story = () => <AskingToDiscardInModal />;
AskingToDiscardPhoneLight.meta = { theme: 'light', width: 375 };

// The edit's head in each theme, at a desktop's width and a phone's: the
// eyebrow, then the name and its formal name, which wrap on a phone (MB.115).
export const InModalDark: Story = () => <CompendiumEntryInModal />;
InModalDark.meta = { theme: 'dark' };

export const InModalLight: Story = () => <CompendiumEntryInModal />;
InModalLight.meta = { theme: 'light' };

export const InModalPhoneDark: Story = () => <CompendiumEntryInModal />;
InModalPhoneDark.meta = { theme: 'dark', width: 375 };

export const InModalPhoneLight: Story = () => <CompendiumEntryInModal />;
InModalPhoneLight.meta = { theme: 'light', width: 375 };

export const PhoneDark: Story = () => <CompendiumEntry />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <CompendiumEntry />;
PhoneLight.meta = { theme: 'light', width: 375 };
