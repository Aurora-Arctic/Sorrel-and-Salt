import type { Route } from 'next';
import type { CardCategory } from '../src/components/CategoryChips/types';
import type { SpellBuilderStep } from '../src/components/SpellBuilder/types';
import type { RecipeStep } from '../src/components/SpellRecipe/types';
import type { WorkingView } from '../src/components/SpellWorkings/types';
import type { PickerCategoriesQuery } from '../src/gql/graphql';
import type { GroupColors } from '../src/lib/types';

// Invented rows the grimoire's stories share, so the builder's Category Match, the recipe and the
// cards draw the same categories in the same colours. Group names are invented (Fixture, Mock);
// the category names are ordinary words, as an admin would curate them.

type CategoryRow = PickerCategoriesQuery['categories']['edges'][number]['node'];

const PURPOSE = {
  id: 'group-purpose',
  name: 'Fixture Purpose',
  colorDark: '#7aa7d9',
  colorLight: '#1f4f8a',
};
const ELEMENT = {
  id: 'group-element',
  name: 'Mock Element',
  colorDark: '#c9a3e0',
  colorLight: '#6b2f8a',
};

const row = (name: string, group: CategoryRow['group']): CategoryRow => ({
  id: `category-${name.toLowerCase()}`,
  name,
  description: `Spells and ingredients for ${name.toLowerCase()}.`,
  group,
});

/** Fourteen categories in two groups: enough for three assigned and nine extras past them. */
export const GRIMOIRE_CATEGORIES: readonly CategoryRow[] = [
  ...['Protection', 'Clarity', 'Healing', 'Banishing', 'Luck', 'Courage', 'Calm', 'Dreams'].map(
    (name) => row(name, PURPOSE),
  ),
  ...['Fire', 'Water', 'Earth', 'Air', 'Memory', 'Growth'].map((name) => row(name, ELEMENT)),
];

/** The `PickerCategories` answer: every category above, as the builder's Categories field reads them. */
export const CATEGORIES_ANSWER: PickerCategoriesQuery = {
  categories: { edges: GRIMOIRE_CATEGORIES.map((node) => ({ node })) },
};

const byName = new Map(GRIMOIRE_CATEGORIES.map((category) => [category.name, category]));

/** The named categories as a step or the assigned list carries them: id and name. */
export function namedCategories(...names: string[]): { id: string; name: string }[] {
  return names.map((name) => {
    const found = byName.get(name);
    if (!found) throw new Error(`No fixture category named ${name}`);
    return { id: found.id, name: found.name };
  });
}

/** The named categories as a card or a recipe draws them: each with its group's colours. */
export function cardCategories(...names: string[]): CardCategory[] {
  return names.map((name) => {
    const found = byName.get(name);
    if (!found) throw new Error(`No fixture category named ${name}`);
    const { colorDark, colorLight } = found.group;
    return { category: { id: found.id, name: found.name }, group: { colorDark, colorLight } };
  });
}

/** Each category's group colours by its id, as the recipe's Category Match looks them up. */
export const GROUP_COLORS: ReadonlyMap<string, GroupColors> = new Map(
  GRIMOIRE_CATEGORIES.map(({ id, group: { colorDark, colorLight } }) => [
    id,
    { colorDark, colorLight },
  ]),
);

type Jar = NonNullable<SpellBuilderStep['ingredient']>['stock'][number];

/** A step of an ingredient's form, against the coven's jar of that form. */
const formStep = (
  id: string,
  name: string,
  form: string,
  { quantity, unit }: Pick<SpellBuilderStep, 'quantity' | 'unit'>,
  {
    categories,
    jar,
    toxic = false,
    safetyNotes = null,
  }: {
    categories: string[];
    jar: Omit<Jar, 'variant'>;
    toxic?: boolean;
    safetyNotes?: string | null;
  },
): SpellBuilderStep => ({
  id,
  name,
  form,
  quantity,
  unit,
  body: null,
  ingredient: {
    id: `ingredient-${id}`,
    toxic: false,
    safetyNotes: null,
    categories: namedCategories(...categories),
    stock: [{ ...jar, variant: { id: `variant-${id}` } }],
  },
  variant: {
    id: `variant-${id}`,
    toxic,
    safetyNotes,
    categories: [],
    formChoice: { group: { icon: 'botanical' } },
  },
});

// The spell the grimoire stories share, as the builder reads it: ingredient forms with a toxic one
// among them, an instruction and a one-off. Each form has a jar in the coven's stock. Between them
// they carry Protection and Clarity, and nine categories past those.
export const BUILDER_STEPS: SpellBuilderStep[] = [
  formStep(
    'step-1',
    'Testwort',
    'Dried Leaf',
    { quantity: 2, unit: 'tsp' },
    {
      categories: ['Protection', 'Fire', 'Banishing'],
      jar: { unit: 'g', quantityOnHand: 40, lowStockThreshold: 5 },
    },
  ),
  formStep(
    'step-2',
    'Mockleaf',
    'Oil',
    { quantity: 30, unit: 'ml' },
    {
      categories: ['Clarity', 'Water', 'Calm'],
      jar: { unit: 'ml', quantityOnHand: 10, lowStockThreshold: 5 },
      toxic: true,
      safetyNotes: 'Never on the skin undiluted.',
    },
  ),
  {
    id: 'step-3',
    name: null,
    form: null,
    quantity: null,
    unit: null,
    body: 'Stir the oil into the leaf three times, sunwise.',
    ingredient: null,
    variant: null,
  },
  {
    id: 'step-4',
    name: 'Fixture Candle',
    form: null,
    quantity: 1,
    unit: 'piece',
    body: null,
    ingredient: null,
    variant: null,
  },
  formStep(
    'step-5',
    'Stubroot',
    'Root',
    { quantity: 5, unit: 'g' },
    {
      categories: ['Earth', 'Luck', 'Courage'],
      jar: { unit: 'g', quantityOnHand: 0, lowStockThreshold: 10 },
    },
  ),
  formStep(
    'step-6',
    'Testmoss',
    'Dried',
    { quantity: 1, unit: 'g' },
    {
      categories: ['Air', 'Dreams'],
      jar: { unit: 'g', quantityOnHand: 20, lowStockThreshold: 25 },
    },
  ),
];

const COVEN = '/coven/fixture-coven';

const look = (id: string, name: string, canonicalName: string) => ({
  href: `${COVEN}/grimoire/fixture-spell?entry=ingredient-${id}` as Route,
  name,
  canonicalName,
  nomenclature: 'botanical' as const,
});

/**
 * The same spell as the recipe draws it: the steps above, in order, with Testmoss's ingredient
 * deleted since. `supply` is the stock verdict the Quick Look draws in the row; the recipe page
 * leaves it out, as its side column says it.
 */
export const RECIPE_STEPS: RecipeStep[] = [
  {
    kind: 'ingredient',
    id: 'step-1',
    name: 'Testwort',
    form: 'Dried Leaf',
    formal: null,
    variantId: 'variant-step-1',
    quantity: '2',
    unit: 'tsp',
    look: look('step-1', 'Testwort', 'Testus wortus'),
    safety: { toxic: false, safetyNotes: null, variants: [] },
    oneOff: false,
    deleted: false,
    body: 'Crush it first.',
  },
  {
    kind: 'ingredient',
    id: 'step-2',
    name: 'Mockleaf',
    form: 'Oil',
    formal: null,
    variantId: 'variant-step-2',
    quantity: '30',
    unit: 'ml',
    look: look('step-2', 'Mockleaf', 'Mockus folium'),
    safety: {
      toxic: false,
      safetyNotes: null,
      variants: [{ form: 'Oil', toxic: true, safetyNotes: 'Never on the skin undiluted.' }],
    },
    supply: 'short',
    oneOff: false,
    deleted: false,
    body: null,
  },
  { kind: 'instruction', id: 'step-3', body: 'Stir the oil into the leaf three times, sunwise.' },
  {
    kind: 'ingredient',
    id: 'step-4',
    name: 'Fixture Candle',
    form: null,
    formal: null,
    variantId: null,
    quantity: '1',
    unit: 'piece',
    look: null,
    safety: null,
    oneOff: true,
    deleted: false,
    body: null,
  },
  {
    kind: 'ingredient',
    id: 'step-5',
    name: 'Stubroot',
    form: 'Root',
    formal: null,
    variantId: 'variant-step-5',
    quantity: '5',
    unit: 'g',
    look: look('step-5', 'Stubroot', 'Stubus radix'),
    safety: { toxic: false, safetyNotes: 'Wash hands after handling.', variants: [] },
    supply: 'out',
    oneOff: false,
    deleted: false,
    body: null,
  },
  {
    kind: 'ingredient',
    id: 'step-6',
    name: 'Testmoss',
    form: 'Dried',
    formal: null,
    variantId: 'variant-step-6',
    quantity: '1',
    unit: 'g',
    look: null,
    safety: null,
    oneOff: false,
    deleted: true,
    body: null,
  },
];

/** The spell's Workings, newest first: a draft, a private one and a complete one. */
export const WORKINGS: WorkingView[] = [
  {
    id: 'working-draft',
    status: 'draft',
    visibility: 'workspace',
    workedOn: '2026-10-24',
    note: 'Started at dusk; finishing tomorrow.',
    recordedBy: 'Testa Owner',
    participants: ['Testa Owner'],
    deductions: [],
    warnings: ['Completing takes nothing from the jars for 1 ingredient.'],
    canChange: true,
    editable: {
      id: 'working-draft',
      workedOn: '2026-10-24',
      note: 'Started at dusk; finishing tomorrow.',
      visibility: 'workspace',
      status: 'draft',
      participants: [{ userId: 'user-a', name: 'Testa Owner' }],
    },
  },
  {
    id: 'working-private',
    status: 'complete',
    visibility: 'private',
    workedOn: '2026-10-12',
    note: null,
    recordedBy: 'Testa Owner',
    participants: ['Testa Owner'],
    deductions: [{ id: 'd1', name: 'Testwort (Dried Leaf)', quantity: '4', unit: 'g' }],
    canChange: true,
    editable: {
      id: 'working-private',
      workedOn: '2026-10-12',
      note: null,
      visibility: 'private',
      status: 'complete',
      participants: [{ userId: 'user-a', name: 'Testa Owner' }],
    },
  },
  {
    id: 'working-complete',
    status: 'complete',
    visibility: 'workspace',
    workedOn: '2026-09-30',
    note: 'Under a clear sky. The oil ran short.',
    recordedBy: 'Mocka Member',
    participants: ['Mocka Member', 'Testa Owner', 'A Visiting Friend'],
    deductions: [
      { id: 'd2', name: 'Testwort (Dried Leaf)', quantity: '4', unit: 'g' },
      { id: 'd3', name: 'Mockleaf (Oil)', quantity: '10', unit: 'ml' },
    ],
    canChange: false,
  },
];

/** The coven's members, as Record a Working's participants box suggests them. */
export const MEMBERS = [
  { userId: 'user-a', name: 'Testa Owner' },
  { userId: 'user-b', name: 'Mocka Member' },
];

/** The spell's ingredient steps as a working's preview names them. */
export const WORKING_STEPS = [
  { id: 'step-1', name: 'Testwort (Dried Leaf)', form: 'Dried Leaf', seed: 'ingredient-step-1' },
  { id: 'step-2', name: 'Mockleaf (Oil)', form: 'Oil', seed: 'ingredient-step-2' },
  { id: 'step-4', name: 'Fixture Candle', seed: 'Fixture Candle', oneOff: true },
];
