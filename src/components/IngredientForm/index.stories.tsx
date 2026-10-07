import type { Story } from '@ladle/react';
import { useLayoutEffect, useState } from 'react';
import type {
  CommonNameSuggestionsQuery,
  CreateReferenceMutation,
  CreateWorkspaceIngredientMutation,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
  ReferenceSuggestionsQuery,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
import { citationText } from '../../lib/citation';
import type { CitationFields } from '../../lib/types';
import IngredientForm from '.';
import type { AfterSave, SavedIngredient } from './types';

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
  title: 'Forms / Ingredient',
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

const PLANETS = [
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

// The two Testworts differ only in form and tier, which a picked pill's
// tooltip tells (MB.164).
const INGREDIENTS = [
  {
    id: 'testwort-c',
    name: 'Testwort',
    canonicalName: 'Fixtura testalis',
    form: 'Dried leaf',
    description: 'A fixture herb, for the workshop.',
    isGlobal: true,
  },
  {
    id: 'testwort-w',
    name: 'Testwort',
    canonicalName: 'Fixtura testalis',
    form: 'Tincture',
    description: 'A fixture herb, for the workshop.',
    isGlobal: false,
  },
  {
    id: 'fixturewort',
    name: 'Fixturewort',
    canonicalName: 'Fixtura vulgaris',
    form: 'Whole root',
    description: null,
    isGlobal: true,
  },
  {
    id: 'mockleaf',
    name: 'Mockleaf',
    canonicalName: null,
    form: null,
    description: null,
    isGlobal: false,
  },
];

// Invented sources in both tiers, one long enough to wrap and one carrying
// an address, rendered by the one renderer as the server renders them.
const SOURCES = [
  {
    id: 'source-herbal',
    isGlobal: true,
    citation: citationText({
      kind: 'book',
      authors: 'Fixture, Ada',
      title: 'The Testwort Herbal',
      contributors: 'Edited by Bram Placeholder',
      place: 'Mockford',
      publisher: 'Fixture Press',
      published: '1901',
    }),
  },
  {
    id: 'source-notes',
    isGlobal: false,
    citation: citationText({
      kind: 'article',
      authors: 'Placeholder, Bram',
      title: 'Notes on Mockleaf',
      container: 'Journal of Fixtures',
      volume: '3',
      issue: '2',
      published: '1950',
      pages: '12–19',
    }),
  },
  {
    id: 'source-wiki',
    isGlobal: true,
    citation: citationText({
      kind: 'web_page',
      title: 'Testwort',
      container: 'Fixture Wiki',
      url: 'https://fixture-wiki.example/wiki/Testwort_(herb)_and_its_many_fixture_relatives',
      modified: '2026-09-27',
      accessed: '2026-10-06',
    }),
  },
];

const CATS_CLAW = [
  { id: 'claw-1', name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' },
  { id: 'claw-2', name: "Cat's Claw", canonicalName: 'Felis catus' },
  { id: 'claw-3', name: "Cat's Claw", canonicalName: null },
];

/** How long a save takes to be accepted: long enough to see Save busy and shut. */
const SAVE_DELAY_MS = 2000;

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
    case 'PlanetSuggestions':
      return {
        planetSuggestions: page(
          PLANETS.filter((row) => matches(query, row.value)),
          first,
        ),
      } satisfies PlanetSuggestionsQuery;
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
    case 'ReferenceSuggestions':
      return {
        referenceSuggestions: page(
          SOURCES.filter((row) => matches(query, row.citation)),
          first,
        ),
      } satisfies ReferenceSuggestionsQuery;
    case 'CreateReference': {
      const input = variables.input as CitationFields;
      return {
        createReference: {
          id: crypto.randomUUID(),
          citation: citationText(input),
          isGlobal: false,
        },
      } satisfies CreateReferenceMutation;
    }
    case 'PossibleDuplicates':
      // Only a name close to "Cat's Claw" is near anything.
      return {
        possibleDuplicates: page(query.toLowerCase().includes('cat') ? CATS_CLAW : [], first),
      } satisfies PossibleDuplicatesQuery;
    case 'CreateWorkspaceIngredient': {
      const input = variables.input as { name?: string } | undefined;
      return {
        createWorkspaceIngredient: { id: crypto.randomUUID(), name: input?.name ?? '' },
      } satisfies CreateWorkspaceIngredientMutation;
    }
    default:
      return undefined;
  }
}

/** The two writes, each answered after `SAVE_DELAY_MS`. */
const SAVES = new Set(['CreateWorkspaceIngredient', 'CreateReference']);

/**
 * The refusal a save meets, in the body /api/graphql sends one in, or
 * undefined for a save that lands: a name holding "taken" is refused on the
 * name, one holding "refuse" as a whole, so the two server errors can be seen.
 * A new reference is refused the same way by its title.
 */
function refusal(operation: string, variables: Record<string, unknown>): object | undefined {
  const input = variables.input as { name?: string; title?: string } | undefined;
  const field = operation === 'CreateReference' ? 'title' : 'name';
  const name = String(input?.[field] ?? '');
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
 * of `window.fetch`, which graphql-request looks up on every request; a save
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
          <strong>Suggestions:</strong> focus Form, Folk Name, Planet, Zodiac Sign, Deity or
          Substitute Ingredient to list everything, then type to narrow it. &ldquo;wax&rdquo; in
          Form shows two forms named Wax, told apart by group; &ldquo;mo&rdquo; in Planet shows From
          Compendium and From Coven; &ldquo;hec&rdquo; in Deity shows Hecate under two traditions;
          &ldquo;test&rdquo; in Substitute Ingredient shows one plant twice, the compendium&rsquo;s
          and this coven&rsquo;s.
        </li>
        <li>
          <strong>A pick:</strong> pick either Wax in Form, and its group follows it in the box,
          muted, its description in a tooltip on hover or focus; edit the text and the group goes.
          Pick both Hecates in Deity, and each pill reads with its tradition, its description in its
          tooltip.
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
          <strong>Moving an entry:</strong> add a few Planets, Zodiac Signs, Colours or Deities,
          enough to wrap onto a second row, and drag one by its grip; or Tab to it, press Space,
          move it with the arrow keys and press Space again. Folk Names and Substitute Ingredients
          have no grip.
        </li>
        <li>
          <strong>Repeated entry:</strong> add Mars to Planets, then type &ldquo;mars&rdquo; and
          press Add: nothing is added, and the box says why. Mars is no longer suggested, nor is the
          Name among Folk Names. Pick Greek Hecate, and Roman Hecate is still offered.
        </li>
        <li>
          <strong>Long entry:</strong> add a Folk Name too long for the box, then hover it.
        </li>
        <li>
          <strong>References:</strong> focus Reference to list three sources, or type
          &ldquo;fixture&rdquo;; pick one and it becomes a row beneath the box, with a Locator to
          fill in. The web page&rsquo;s long address wraps inside its row. A picked source is not
          offered again.
        </li>
        <li>
          <strong>A new reference:</strong> press New Reference, or pick &ldquo;Add a
          reference&rdquo; from the list, and choose a Kind: each shows only its own fields, the
          required ones starred. Save Reference with a Chapter&rsquo;s Book empty, or a Web
          Page&rsquo;s Address, to see them refused; a Title with &ldquo;taken&rdquo; in it is
          refused by the server beside Title, and one with &ldquo;refuse&rdquo; in it above the
          panel&rsquo;s fields. Enter in a field saves the reference, not the ingredient. Save the
          ingredient with the panel open to see it held.
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
          <strong>Refused by the server:</strong> a Name with &ldquo;taken&rdquo; in it is refused
          beside Name; one with &ldquo;refuse&rdquo; in it is refused above the form.
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
