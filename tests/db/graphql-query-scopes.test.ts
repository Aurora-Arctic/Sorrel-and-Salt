import type { GraphQLObjectType } from 'graphql';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import { assertSiteAdmin } from '@/modules/identity';
import { A, B, C, D, E, asUser } from '../support/as-user';
import { run } from '../support/graphql/run';
import type { AdminWrite, ScopeProbe } from './types';

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
  privilegeChanges: {
    source: '{ privilegeChanges(first: 1) { edges { node { id } } } }',
    outcome: 'refuses',
  },
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
  deities: {
    source: '{ deities(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  deityTraditions: {
    source: '{ deityTraditions(first: 1) { edges { node { id } } } }',
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
const TRADITIONED = `{ name: "Fixture", description: "", traditionId: "${NOWHERE}" }`;
const REFERENCE = '{ kind: book, title: "A Herbal of Fixture Covens" }';

const MUTATION_PROBES: Record<string, ScopeProbe> = {
  setEmail: write('mutation { setEmail(email: "fixture@example.org") { id } }'),
  grantWorkspaceCreation: write(`mutation { grantWorkspaceCreation(userId: "${NOWHERE}") { id } }`),
  revokeWorkspaceCreation: write(
    `mutation { revokeWorkspaceCreation(userId: "${NOWHERE}") { id } }`,
  ),
  setUserRole: write(`mutation { setUserRole(userId: "${NOWHERE}", role: admin) { id } }`),
  pauseAdminRoleChanges: write('mutation { pauseAdminRoleChanges }'),
  resumeAdminRoleChanges: write('mutation { resumeAdminRoleChanges }'),
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
  createDeity: write(`mutation { createDeity(input: ${TRADITIONED}) { id } }`),
  updateDeity: write(`mutation { updateDeity(id: "${NOWHERE}", input: ${TRADITIONED}) { id } }`),
  deleteDeity: write(`mutation { deleteDeity(id: "${NOWHERE}") }`),
  createDeityTradition: write(`mutation { createDeityTradition(input: ${NAMED}) { id } }`),
  updateDeityTradition: write(
    `mutation { updateDeityTradition(id: "${NOWHERE}", input: ${NAMED}) { id } }`,
  ),
  deleteDeityTradition: write(`mutation { deleteDeityTradition(id: "${NOWHERE}") }`),
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

// M5.7's second check, field by field: every admin write carries the `admin`
// scope, which refuses a signed-in user before the service is asked. The
// service refuses them too, and its refusal is the gate (CLAUDE.md rule 1),
// so a code alone cannot say which check spoke: the scope answers
// `Forbidden`'s default message and `assertSiteAdmin` one of its own, and the
// message is how this sweep knows the field refused on its own. Every write
// is named as an admin write or one any session may reach, so a write added
// later says which it is, and an admin write says what it governs.
const SCOPE_REFUSAL = new Forbidden().message;

const ADMIN_WRITES: Record<string, AdminWrite> = {
  createCompendiumIngredient: { governs: 'compendium' },
  updateCompendiumIngredient: { governs: 'compendium' },
  deleteCompendiumIngredient: { governs: 'compendium' },
  // A null `workspaceId` is the compendium's tier (MB.153); a coven's is the
  // member's, below.
  createReference: {
    governs: 'references',
    probe: write(`mutation { createReference(input: ${REFERENCE}) { id } }`),
  },
  updateReference: {
    governs: 'references',
    probe: write(
      `mutation { updateReference(workspaceId: null, id: "${NOWHERE}", input: ${REFERENCE}) { id } }`,
    ),
  },
  // M5.8: who may create a coven, granted and revoked by an admin.
  grantWorkspaceCreation: { governs: 'workspace creation' },
  revokeWorkspaceCreation: { governs: 'workspace creation' },
  // MB.59: who is an admin, granted and revoked by an admin.
  setUserRole: { governs: 'admin role' },
  // MB.63: the primary admin's pause on those changes.
  pauseAdminRoleChanges: { governs: 'admin role' },
  resumeAdminRoleChanges: { governs: 'admin role' },
  createCategory: { governs: 'categories' },
  updateCategory: { governs: 'categories' },
  deleteCategory: { governs: 'categories' },
  createCategoryGroup: { governs: 'category groups' },
  updateCategoryGroup: { governs: 'category groups' },
  deleteCategoryGroup: { governs: 'category groups' },
  createIngredientFormValue: { governs: 'forms' },
  updateIngredientFormValue: { governs: 'forms' },
  deleteIngredientFormValue: { governs: 'forms' },
  createIngredientFormGroup: { governs: 'form groups' },
  updateIngredientFormGroup: { governs: 'form groups' },
  deleteIngredientFormGroup: { governs: 'form groups' },
  createPlanet: { governs: 'planets' },
  updatePlanet: { governs: 'planets' },
  deletePlanet: { governs: 'planets' },
  createZodiacSign: { governs: 'zodiac signs' },
  updateZodiacSign: { governs: 'zodiac signs' },
  deleteZodiacSign: { governs: 'zodiac signs' },
  createDeity: { governs: 'deities' },
  updateDeity: { governs: 'deities' },
  deleteDeity: { governs: 'deities' },
  createDeityTradition: { governs: 'deity traditions' },
  updateDeityTradition: { governs: 'deity traditions' },
  deleteDeityTradition: { governs: 'deity traditions' },
};

/** Writes any signed-in session's scope admits, the service deciding who may. */
const OPEN_WRITES = [
  'setEmail',
  'createWorkspaceIngredient',
  'updateIngredient',
  'deleteIngredient',
  'createReference',
  'updateReference',
];

const adminProbe = (field: string): ScopeProbe =>
  ADMIN_WRITES[field].probe ?? MUTATION_PROBES[field];

const NON_ADMINS = [A, B, C, D];

describe('a signed-in non-admin at every admin write', () => {
  // E as the primary admin, so the pause's two writes, which the service
  // allows the primary admin alone (MB.63), admit the admin past the scope.
  beforeEach(() => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', E.email);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is classified for every Mutation field the schema has', () => {
    const fields = fieldsOf(schema.getMutationType());

    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toEqual([...new Set([...Object.keys(ADMIN_WRITES), ...OPEN_WRITES])].sort());
  });

  it('would hear the service in other words than the scope', () => {
    // Why a default message is the scope's alone: the service's refusal is
    // worded, and each resolver's own `Forbidden` is for a null session.
    expect(() => assertSiteAdmin(asUser(B))).toThrow(Forbidden);
    expect(() => assertSiteAdmin(asUser(B))).not.toThrow(SCOPE_REFUSAL);
  });

  it.each(Object.keys(ADMIN_WRITES))('%s admits a site admin past the scope', async (field) => {
    const probe = adminProbe(field);
    const result = await run(asUser(E), probe.source, probe.variables);

    expect(result.errors?.map((error) => error.extensions?.code) ?? []).not.toContain('FORBIDDEN');
  });

  it.each(
    Object.keys(ADMIN_WRITES).flatMap((field) =>
      NON_ADMINS.map((user) => [field, user.name, user] as const),
    ),
  )('%s refuses %s at the scope', async (field, _name, user) => {
    expect(asUser(user).role).toBe('user');

    const probe = adminProbe(field);
    const result = await run(asUser(user), probe.source, probe.variables);

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: [field],
      message: SCOPE_REFUSAL,
      extensions: { code: 'FORBIDDEN' },
    });
  });
});
