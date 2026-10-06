import type { Story } from '@ladle/react';
import { useLayoutEffect, useState } from 'react';
import type {
  CommonNameSuggestionsQuery,
  CreateWorkspaceIngredientMutation,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
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

/**
 * The refusal a save meets, in the body /api/graphql sends one in, or
 * undefined for a save that lands: a name holding "taken" is refused on the
 * name, one holding "refuse" as a whole, so the two server errors can be seen.
 */
function refusal(variables: Record<string, unknown>): object | undefined {
  const name = String((variables.input as { name?: string } | undefined)?.name ?? '');
  if (/taken/i.test(name)) {
    return {
      data: null,
      errors: [
        {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION',
            fieldErrors: [
              { path: ['name'], message: 'This coven already has an ingredient by that name' },
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
        { message: "You can't add ingredients to this coven", extensions: { code: 'FORBIDDEN' } },
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
          if (operationName === 'CreateWorkspaceIngredient') {
            await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
            body = refusal(variables) ?? body;
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
          <strong>Repeated entry:</strong> add the same Folk Name twice, then Save.
        </li>
        <li>
          <strong>Long entry:</strong> add a Folk Name too long for the box, then hover it.
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
