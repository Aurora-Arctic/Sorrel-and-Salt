import type { GraphQLObjectType } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { run } from '../support/graphql/run';
import type { ScopeProbe } from './types';

// MB.80's line, drawn field by field: the compendium is the one public
// surface, so its queries answer a null session and every other query
// refuses one. Every `Query` field is classified here, and the first test
// fails on one that is not, so a field added later has to say which side it
// is on (claude-docs/graphql/schema.md, "Auth scopes"). Since MB.185 every
// `Mutation` field is probed the same way, and every query taking a
// `workspaceId` again with a null one, so that no resolver file needs a
// signed-out test of its own: what a field's own tests stop repeating is
// still made impossible here (claude-docs/design-decisions/mb.180-graphql-transport-half.md).

let compendiumId: string;

beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL as string);
  const [row] = await sql`
    select id from ingredients where workspace_id is null and deleted_at is null
    order by name, id limit 1`;
  compendiumId = row.id as string;
  await sql.end();
});

/** The names of a root type's fields, which a probe table must equal. */
function fieldsOf(root: GraphQLObjectType | null | undefined): string[] {
  return Object.keys(root?.getFields() ?? {}).sort();
}

/** The `Query` fields declaring a `workspaceId` argument. */
function queriesTakingWorkspaceId(): string[] {
  return Object.values(schema.getQueryType()?.getFields() ?? {})
    .filter((field) => field.args.some((arg) => arg.name === 'workspaceId'))
    .map((field) => field.name)
    .sort();
}

/** Runs a probe signed out and holds it to its outcome. */
async function expectOutcome(field: string, probe: ScopeProbe) {
  const result = await run(null, probe.source, probe.variables);

  if (probe.outcome === 'answers') {
    expect(result.errors).toBeUndefined();
    expect(result.data?.[field]).not.toBeNull();
  } else if (probe.outcome === 'refuses') {
    // The path is what shows the field was reached: a probe the SDL refused
    // would answer an error with none.
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: [field],
      extensions: { code: 'FORBIDDEN' },
    });
  } else {
    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.path).toBeUndefined();
    expect(result.errors?.[0]?.message).toMatch(/non-null type "ID!" must not be null/);
  }
}

const suggestion = (field: string): ScopeProbe => ({
  source: `query ($workspaceId: ID!) {
    ${field}(workspaceId: $workspaceId, first: 1) { edges { node { value } } }
  }`,
  variables: { workspaceId: WORKSPACE_W_ID },
  outcome: 'refuses',
});

const PROBES: Record<string, ScopeProbe> = {
  ok: { source: '{ ok }', outcome: 'answers' },
  me: { source: '{ me { id } }', outcome: 'refuses' },
  users: { source: '{ users(first: 1) { edges { node { id } } } }', outcome: 'refuses' },
  compendium: {
    source: '{ compendium(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  ingredient: {
    source: 'query ($id: ID!) { ingredient(id: $id) { id } }',
    get variables() {
      return { id: compendiumId };
    },
    outcome: 'answers',
  },
  categories: {
    source: '{ categories(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  ingredientFormValues: {
    source: '{ ingredientFormValues(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  ingredientFormGroups: {
    source: '{ ingredientFormGroups(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  planets: {
    source: '{ planets(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  zodiacSigns: {
    source: '{ zodiacSigns(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  commonNameSuggestions: suggestion('commonNameSuggestions'),
  ingredientSuggestions: {
    source: `query ($workspaceId: ID!) {
      ingredientSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  possibleDuplicates: {
    source: `query ($workspaceId: ID!) {
      possibleDuplicates(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  referenceSuggestions: {
    source: `query ($workspaceId: ID!) {
      referenceSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  deitySuggestions: suggestion('deitySuggestions'),
  formSuggestions: suggestion('formSuggestions'),
  planetSuggestions: suggestion('planetSuggestions'),
  zodiacSuggestions: suggestion('zodiacSuggestions'),
};

describe('a null session at every Query field', () => {
  it('is classified for every field the schema has', () => {
    expect(fieldsOf(schema.getQueryType())).toEqual(Object.keys(PROBES).sort());
  });

  it.each(Object.entries(PROBES))('%s: %o', expectOutcome);
});

// The compendium-only mode a null `workspaceId` asks for (M5.5) must not be
// a way round the session: a suggestion field stays signed-in without a
// coven, and `ingredient` still answers the compendium alone.
const nullWorkspaceSuggestion = (field: string): ScopeProbe => ({
  source: `query ($workspaceId: ID) {
    ${field}(workspaceId: $workspaceId, first: 1) { edges { node { value } } }
  }`,
  variables: { workspaceId: null },
  outcome: 'refuses',
});

const NULL_WORKSPACE_PROBES: Record<string, ScopeProbe> = {
  ingredient: {
    source:
      'query ($id: ID!, $workspaceId: ID) { ingredient(id: $id, workspaceId: $workspaceId) { id } }',
    get variables() {
      return { id: compendiumId, workspaceId: null };
    },
    outcome: 'answers',
  },
  commonNameSuggestions: nullWorkspaceSuggestion('commonNameSuggestions'),
  deitySuggestions: nullWorkspaceSuggestion('deitySuggestions'),
  formSuggestions: nullWorkspaceSuggestion('formSuggestions'),
  planetSuggestions: nullWorkspaceSuggestion('planetSuggestions'),
  zodiacSuggestions: nullWorkspaceSuggestion('zodiacSuggestions'),
  possibleDuplicates: {
    source: `query ($workspaceId: ID) {
      possibleDuplicates(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'refuses',
  },
  referenceSuggestions: {
    source: `query ($workspaceId: ID) {
      referenceSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'refuses',
  },
  // The substitute picker always has a coven, so the SDL takes no null.
  ingredientSuggestions: {
    source: `query ($workspaceId: ID!) {
      ingredientSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
};

describe('a null session and a null workspaceId at every Query field taking one', () => {
  it('is classified for every such field the schema has', () => {
    const fields = queriesTakingWorkspaceId();

    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toEqual(Object.keys(NULL_WORKSPACE_PROBES).sort());
  });

  it.each(Object.entries(NULL_WORKSPACE_PROBES))('%s: %o', expectOutcome);
});

// Every write refuses a null session. The ids name nothing, since a
// signed-out caller is refused before any row is looked for, and the inputs
// are the least each SDL type takes, so the refusal is the field's and not
// the document's.
const NOWHERE = '00000000-0000-4000-8000-000000000000';

const write = (source: string, variables?: Record<string, unknown>): ScopeProbe => ({
  source,
  variables,
  outcome: 'refuses',
});

const WHOLE_INGREDIENT = {
  name: 'Testwort',
  canonicalName: '',
  nomenclature: 'none',
  form: '',
  formId: '',
  description: '',
  elements: [],
  planets: [],
  zodiacSigns: [],
  deities: [],
  colors: [],
  safetyNotes: '',
  substitutes: [],
  folkNames: [],
  references: [],
  categoryIds: [],
};

const NAMED = '{ name: "Fixture", description: "" }';
const GROUP = `{ name: "Fixture", description: "", colorDark: "#ffffff", colorLight: "#000000" }`;
const FILED = `{ name: "Fixture", description: "", groupId: "${NOWHERE}" }`;
const REFERENCE = '{ kind: book, title: "A Herbal of Fixture Covens" }';

const MUTATION_PROBES: Record<string, ScopeProbe> = {
  setEmail: write('mutation { setEmail(email: "fixture@example.org") { id } }'),
  createWorkspaceIngredient: write(
    `mutation { createWorkspaceIngredient(workspaceId: "${WORKSPACE_W_ID}", input: { name: "Testwort" }) { id } }`,
  ),
  updateIngredient: write(
    `mutation ($input: IngredientUpdateInput!) {
      updateIngredient(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", input: $input) { id }
    }`,
    { input: WHOLE_INGREDIENT },
  ),
  deleteIngredient: write(
    `mutation { deleteIngredient(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") }`,
  ),
  createCompendiumIngredient: write(
    'mutation { createCompendiumIngredient(input: { name: "Testwort", nomenclature: none }) { id } }',
  ),
  updateCompendiumIngredient: write(
    `mutation ($input: CompendiumIngredientUpdateInput!) {
      updateCompendiumIngredient(id: "${NOWHERE}", input: $input) { id }
    }`,
    { input: WHOLE_INGREDIENT },
  ),
  deleteCompendiumIngredient: write(`mutation { deleteCompendiumIngredient(id: "${NOWHERE}") }`),
  createReference: write(
    `mutation { createReference(workspaceId: "${WORKSPACE_W_ID}", input: ${REFERENCE}) { id } }`,
  ),
  updateReference: write(
    `mutation { updateReference(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", input: ${REFERENCE}) { id } }`,
  ),
  createCategory: write(`mutation { createCategory(input: ${FILED}) { id } }`),
  updateCategory: write(`mutation { updateCategory(id: "${NOWHERE}", input: ${FILED}) { id } }`),
  deleteCategory: write(`mutation { deleteCategory(id: "${NOWHERE}") }`),
  createCategoryGroup: write(`mutation { createCategoryGroup(input: ${GROUP}) { id } }`),
  updateCategoryGroup: write(
    `mutation { updateCategoryGroup(id: "${NOWHERE}", input: ${GROUP}) { id } }`,
  ),
  deleteCategoryGroup: write(`mutation { deleteCategoryGroup(id: "${NOWHERE}") }`),
  createIngredientFormGroup: write(
    `mutation { createIngredientFormGroup(input: ${NAMED}) { id } }`,
  ),
  updateIngredientFormGroup: write(
    `mutation { updateIngredientFormGroup(id: "${NOWHERE}", input: ${NAMED}) { id } }`,
  ),
  deleteIngredientFormGroup: write(`mutation { deleteIngredientFormGroup(id: "${NOWHERE}") }`),
  createIngredientFormValue: write(
    `mutation { createIngredientFormValue(input: ${FILED}) { id } }`,
  ),
  updateIngredientFormValue: write(
    `mutation { updateIngredientFormValue(id: "${NOWHERE}", input: ${FILED}) { id } }`,
  ),
  deleteIngredientFormValue: write(`mutation { deleteIngredientFormValue(id: "${NOWHERE}") }`),
  createPlanet: write(`mutation { createPlanet(input: ${NAMED}) { id } }`),
  updatePlanet: write(`mutation { updatePlanet(id: "${NOWHERE}", input: ${NAMED}) { id } }`),
  deletePlanet: write(`mutation { deletePlanet(id: "${NOWHERE}") }`),
  createZodiacSign: write(`mutation { createZodiacSign(input: ${NAMED}) { id } }`),
  updateZodiacSign: write(
    `mutation { updateZodiacSign(id: "${NOWHERE}", input: ${NAMED}) { id } }`,
  ),
  deleteZodiacSign: write(`mutation { deleteZodiacSign(id: "${NOWHERE}") }`),
};

describe('a null session at every Mutation field', () => {
  it('is classified for every field the schema has', () => {
    const fields = fieldsOf(schema.getMutationType());

    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toEqual(Object.keys(MUTATION_PROBES).sort());
  });

  it.each(Object.entries(MUTATION_PROBES))('%s: %o', expectOutcome);
});
