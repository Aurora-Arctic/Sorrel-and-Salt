import type { GraphQLObjectType } from 'graphql';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';
import { A, E, F, asUser } from '../support/as-user';
import { run } from '../support/graphql/run';
import type { AdminWrite, Governed, ScopeProbe } from './types';

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

/** An id naming nothing: a signed-out caller is refused before any row is looked for. */
const NOWHERE = '00000000-0000-4000-8000-000000000000';

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
  compendiumFacets: {
    source: '{ compendiumFacets { forms { value count } } }',
    outcome: 'answers',
  },
  // A curator's count (M12.25): the scope refuses a null session before the id is read.
  compendiumEntryUsers: {
    source: `{ compendiumEntryUsers(id: "${NOWHERE}") }`,
    outcome: 'refuses',
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
  celestialBodies: {
    source: '{ celestialBodies(first: 1) { edges { node { id } } } }',
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
  compendiumMatches: {
    source: `query ($workspaceId: ID!) {
      compendiumMatches(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
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
  reference: {
    source:
      'query ($workspaceId: ID!, $id: ID!) { reference(workspaceId: $workspaceId, id: $id) { id } }',
    variables: { workspaceId: WORKSPACE_W_ID, id: NOWHERE },
    outcome: 'refuses',
  },
  workspaceIngredients: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredients(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  workspaceIngredientFacets: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredientFacets(workspaceId: $workspaceId) { forms { value count } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  grimoire: {
    source: `query ($workspaceId: ID!) {
      grimoire(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  spell: {
    source:
      'query ($id: ID!, $workspaceId: ID!) { spell(id: $id, workspaceId: $workspaceId) { id } }',
    variables: { id: NOWHERE, workspaceId: WORKSPACE_W_ID },
    outcome: 'refuses',
  },
  deitySuggestions: suggestion('deitySuggestions'),
  formSuggestions: suggestion('formSuggestions'),
  celestialBodySuggestions: suggestion('celestialBodySuggestions'),
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
  celestialBodySuggestions: nullWorkspaceSuggestion('celestialBodySuggestions'),
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
  reference: {
    source:
      'query ($workspaceId: ID, $id: ID!) { reference(workspaceId: $workspaceId, id: $id) { id } }',
    variables: { workspaceId: null, id: NOWHERE },
    outcome: 'refuses',
  },
  // The question the add form asks is always asked in some coven (M12.20).
  compendiumMatches: {
    source: `query ($workspaceId: ID!) {
      compendiumMatches(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // The substitute picker always has a coven, so the SDL takes no null.
  ingredientSuggestions: {
    source: `query ($workspaceId: ID!) {
      ingredientSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // A coven's ingredients are always some coven's (M9.4).
  workspaceIngredients: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredients(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // Counted over the same rows as workspaceIngredients, so always some coven's (M12.3).
  workspaceIngredientFacets: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredientFacets(workspaceId: $workspaceId) { forms { value count } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // A spell is always some coven's (M10.9).
  grimoire: {
    source: `query ($workspaceId: ID!) {
      grimoire(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  spell: {
    source:
      'query ($id: ID!, $workspaceId: ID!) { spell(id: $id, workspaceId: $workspaceId) { id } }',
    variables: { id: NOWHERE, workspaceId: null },
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

// Every write refuses a null session. The ids are NOWHERE, since a
// signed-out caller is refused before any row is looked for, and the inputs
// are the least each SDL type takes, so the refusal is the field's and not
// the document's.

const write = (source: string, variables?: Record<string, unknown>): ScopeProbe => ({
  source,
  variables,
  outcome: 'refuses',
});

const WHOLE_INGREDIENT = {
  name: 'Testwort',
  canonicalName: '',
  nomenclature: 'none',
  variants: [],
  description: '',
  elements: [],
  celestialBodies: [],
  zodiacSigns: [],
  deities: [],
  colors: [],
  safetyNotes: '',
  toxic: false,
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
  setName: write('mutation { setName(name: "Fixture") { id } }'),
  grantWorkspaceCreation: write(`mutation { grantWorkspaceCreation(userId: "${NOWHERE}") { id } }`),
  revokeWorkspaceCreation: write(
    `mutation { revokeWorkspaceCreation(userId: "${NOWHERE}") { id } }`,
  ),
  setUserRole: write(`mutation { setUserRole(userId: "${NOWHERE}", role: admin) { id } }`),
  pauseAdminRoleChanges: write('mutation { pauseAdminRoleChanges }'),
  resumeAdminRoleChanges: write('mutation { resumeAdminRoleChanges }'),
  // A malformed address, so an admin past the scope is refused by the service
  // before anything is written or mailed.
  createAdminInvitation: write(
    'mutation { createAdminInvitation(email: "not-an-address", siteRole: curator) { id } }',
  ),
  revokeAdminInvitation: write(`mutation { revokeAdminInvitation(id: "${NOWHERE}") { id } }`),
  acceptInvitation: write('mutation { acceptInvitation(token: "no-such-token") { id } }'),
  acceptInvitationById: write(`mutation { acceptInvitationById(id: "${NOWHERE}") { id } }`),
  declineInvitationById: write(`mutation { declineInvitationById(id: "${NOWHERE}") { id } }`),
  // A blank name, so a caller past the scope that may create one is refused by
  // the service before anything is written.
  createWorkspace: write('mutation { createWorkspace(name: "") { id } }'),
  // A malformed person id, so a caller past the scope is refused by the service.
  updateMemberRole: write(
    `mutation { updateMemberRole(workspaceId: "${WORKSPACE_W_ID}", userId: "not-an-id", role: member) { role } }`,
  ),
  // A malformed id, so a caller past the scope is refused by the service
  // before anything is deleted.
  deleteWorkspace: write('mutation { deleteWorkspace(workspaceId: "not-an-id") }'),
  // Malformed ids again, so nothing is removed whoever gets past the scope.
  // A malformed address, so a caller past the scope is refused by the service
  // before anything is written or mailed.
  createInvitation: write(
    `mutation { createInvitation(workspaceId: "${WORKSPACE_W_ID}", email: "not-an-address", role: viewer) { id } }`,
  ),
  // An id naming no invitation, so a caller past the scope is refused by the
  // service before anything is stamped.
  revokeInvitation: write(
    `mutation { revokeInvitation(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") { id } }`,
  ),
  removeMember: write('mutation { removeMember(workspaceId: "not-an-id", userId: "not-an-id") }'),
  leaveWorkspace: write('mutation { leaveWorkspace(workspaceId: "not-an-id") }'),
  createWorkspaceIngredient: write(
    `mutation { createWorkspaceIngredient(workspaceId: "${WORKSPACE_W_ID}", input: { name: "Testwort", variants: [] }) { id } }`,
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
  // Ids naming no form and no jar, so a caller past the scope is refused by
  // the service before anything is written.
  addIngredientToWorkspace: write(
    `mutation { addIngredientToWorkspace(workspaceId: "${WORKSPACE_W_ID}", variantId: "${NOWHERE}", input: {}) { id } }`,
  ),
  updateStock: write(
    `mutation { updateStock(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", input: {}) { id } }`,
  ),
  saveStock: write(
    `mutation { saveStock(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}", input: { create: [], update: [], delete: [] }) { id } }`,
  ),
  deleteStock: write(
    `mutation { deleteStock(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") }`,
  ),
  // Ids naming no compendium entry, so a caller past the scope is refused by
  // the service before anything is written.
  addCupboardEntry: write(
    `mutation { addCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}") { id } }`,
  ),
  annotateCupboardEntry: write(
    `mutation { annotateCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}", input: {}) { id } }`,
  ),
  removeCupboardEntry: write(
    `mutation { removeCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}") }`,
  ),
  // An id naming no compendium entry the coven holds, so a caller past the
  // scope is refused by the service before anything is written.
  convertCompendiumEntryToLocal: write(
    `mutation { convertCompendiumEntryToLocal(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}") { entry { id } } }`,
  ),
  createCompendiumIngredient: write(
    'mutation { createCompendiumIngredient(input: { name: "Testwort", nomenclature: none, variants: [] }) { id } }',
  ),
  updateCompendiumIngredient: write(
    `mutation ($input: CompendiumIngredientUpdateInput!) {
      updateCompendiumIngredient(id: "${NOWHERE}", input: $input) { id }
    }`,
    { input: WHOLE_INGREDIENT },
  ),
  deleteCompendiumIngredient: write(`mutation { deleteCompendiumIngredient(id: "${NOWHERE}") }`),
  setCompendiumEntryReviewed: write(
    `mutation { setCompendiumEntryReviewed(id: "${NOWHERE}", reviewed: true) { id } }`,
  ),
  createReference: write(
    `mutation { createReference(workspaceId: "${WORKSPACE_W_ID}", input: ${REFERENCE}) { id } }`,
  ),
  promoteFolkName: write(
    `mutation { promoteFolkName(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", folkNameId: "${NOWHERE}") { id } }`,
  ),
  createSpell: write(
    `mutation { createSpell(workspaceId: "${WORKSPACE_W_ID}", input: { status: complete }) { id } }`,
  ),
  updateSpell: write(
    `mutation { updateSpell(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", input: { expectedRevision: null }) { id } }`,
  ),
  deleteSpell: write(
    `mutation { deleteSpell(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") }`,
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
  createCelestialBody: write(`mutation { createCelestialBody(input: ${NAMED}) { id } }`),
  updateCelestialBody: write(
    `mutation { updateCelestialBody(id: "${NOWHERE}", input: ${NAMED}) { id } }`,
  ),
  deleteCelestialBody: write(`mutation { deleteCelestialBody(id: "${NOWHERE}") }`),
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
  setCompendiumEntryReviewed: { governs: 'compendium' },
  // A null `workspaceId` is the compendium's tier (MB.153); a coven's is the
  // member's, below.
  createReference: {
    governs: 'references',
    probe: write(`mutation { createReference(input: ${REFERENCE}) { id } }`),
  },
  // A null `workspaceId` is the compendium's tier (M8.3a); a coven's is the
  // member's, below.
  promoteFolkName: {
    governs: 'compendium',
    probe: write(
      `mutation { promoteFolkName(workspaceId: null, id: "${NOWHERE}", folkNameId: "${NOWHERE}") { id } }`,
    ),
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
  // MB.59, M11.20: who is an admin or a curator, granted and revoked by an admin.
  setUserRole: { governs: 'site role' },
  // MB.63: the primary admin's pause on those changes.
  pauseAdminRoleChanges: { governs: 'site role' },
  resumeAdminRoleChanges: { governs: 'site role' },
  // MB.70: inviting an address to become an admin, and withdrawing it.
  createAdminInvitation: { governs: 'site role' },
  revokeAdminInvitation: { governs: 'site role' },
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
  createCelestialBody: { governs: 'celestialBodies' },
  updateCelestialBody: { governs: 'celestialBodies' },
  deleteCelestialBody: { governs: 'celestialBodies' },
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
  // The invited address is what admits, which the service checks (MB.70).
  'acceptInvitation',
  // The session's own verified address is what admits, matched in SQL (M10.32).
  'acceptInvitationById',
  // The same address match decides a decline (M10.34).
  'declineInvitationById',
  'setName',
  // The flag decides who may, which the service reads (M6.7).
  'createWorkspace',
  // The owner's `member: update` decides, which the service checks (M9.14).
  'updateMemberRole',
  // The owner's `workspace: delete` decides, which the service checks (M6.14).
  'deleteWorkspace',
  // `member: remove` decides removal, and leaving is the caller's own seat (M6.15).
  // The owner's `member: invite` decides, which the service checks (M7.3).
  'createInvitation',
  // The owner's `member: invite` decides, which the service checks (M7.6).
  'revokeInvitation',
  'removeMember',
  'leaveWorkspace',
  'createWorkspaceIngredient',
  'updateIngredient',
  'deleteIngredient',
  // The coven's `inventory: update` decides, which the stock service checks (M9.4).
  'addIngredientToWorkspace',
  'updateStock',
  'saveStock',
  'deleteStock',
  'addCupboardEntry',
  'annotateCupboardEntry',
  'removeCupboardEntry',
  'convertCompendiumEntryToLocal',
  'createReference',
  'updateReference',
  'promoteFolkName',
  // The coven's `spell: create` and `spell: update` decide, which the spell service checks (M10.10).
  'createSpell',
  'updateSpell',
  // The coven's `spell: delete` decides, which the spell service checks (M13.11).
  'deleteSpell',
];

const adminProbe = (field: string): ScopeProbe =>
  ADMIN_WRITES[field].probe ?? MUTATION_PROBES[field];

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

  // The check reads the site role alone, so one non-admin stands for every
  // one (claude-docs/testing/layer-ownership.md, rule 6): A, who owns a coven
  // and so holds the most a role of `user` can.
  it.each(Object.keys(ADMIN_WRITES))('%s refuses a non-admin at the scope', async (field) => {
    const probe = adminProbe(field);

    // Preconditions: the field admits a site admin past the scope, so the
    // refusal below is the role's; and the service would refuse in other
    // words than the scope's default, so the message says which check spoke.
    const admitted = await run(asUser(E), probe.source, probe.variables);
    expect(admitted.errors?.map((error) => error.extensions?.code) ?? []).not.toContain(
      'FORBIDDEN',
    );
    expect(() => assertSiteAdmin(asUser(A))).toThrow(Forbidden);
    expect(() => assertSiteAdmin(asUser(A))).not.toThrow(SCOPE_REFUSAL);
    expect(asUser(A).role).toBe('user');

    const result = await run(asUser(A), probe.source, probe.variables);

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: [field],
      message: SCOPE_REFUSAL,
      extensions: { code: 'FORBIDDEN' },
    });
  });
});

// M11.20: the people page's writes are an admin's alone, and every other admin
// write is curation, which a curator's scope admits as an admin's does. The
// split is by what a write governs, so a write added to ADMIN_WRITES lands on
// one side or the other without a list of its own.
const PEOPLE_PAGE: readonly Governed[] = ['workspace creation', 'site role'];
const governsPeople = (field: string) => PEOPLE_PAGE.includes(ADMIN_WRITES[field].governs);
const PEOPLE_WRITES = Object.keys(ADMIN_WRITES).filter(governsPeople);
const CURATION_WRITES = Object.keys(ADMIN_WRITES).filter((field) => !governsPeople(field));

/** The codes a result's errors carry, none for none. */
const codesOf = (result: Awaited<ReturnType<typeof run>>) =>
  result.errors?.map((error) => error.extensions?.code) ?? [];

describe('a curator at every admin write, and at the people page’s reads', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', E.email);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Each side holds something, or the sweeps below would pass by running nothing.
  it('splits the admin writes into curation and the people page', () => {
    expect(CURATION_WRITES.length).toBeGreaterThan(0);
    expect(PEOPLE_WRITES).toEqual(
      expect.arrayContaining(['setUserRole', 'grantWorkspaceCreation', 'createAdminInvitation']),
    );
  });

  it.each(CURATION_WRITES)('%s admits a curator past the scope and the service', async (field) => {
    const probe = adminProbe(field);
    // Why F could have been refused: the role is not an admin's.
    expect(asUser(F).role).toBe('curator');
    expect(() => assertSiteAdmin(asUser(F))).toThrow(Forbidden);

    const result = await run(asUser(F), probe.source, probe.variables);

    expect(codesOf(result)).not.toContain('FORBIDDEN');
  });

  it.each(PEOPLE_WRITES)('%s refuses a curator at the scope', async (field) => {
    const probe = adminProbe(field);
    // Preconditions: the field admits an admin, and F holds a proof that
    // curates, so the refusal below is the scope's line between the two.
    expect(codesOf(await run(asUser(E), probe.source, probe.variables))).not.toContain('FORBIDDEN');
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    const result = await run(asUser(F), probe.source, probe.variables);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]).toMatchObject({
      path: [field],
      message: SCOPE_REFUSAL,
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it.each(['users', 'privilegeChanges'])(
    '%s refuses a curator, answering an admin',
    async (field) => {
      const { source } = PROBES[field];
      expect(codesOf(await run(asUser(E), source))).toEqual([]);

      const result = await run(asUser(F), source);

      expect(result.data?.[field] ?? null).toBeNull();
      expect(codesOf(result)).toEqual(['FORBIDDEN']);
    },
  );
});
