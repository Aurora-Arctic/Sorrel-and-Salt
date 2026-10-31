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

// Only the compendium's queries answer a null session; every other query, and every mutation, refuses one.
// Every `Query` field is classified here, and the first test fails on one that is not (claude-docs/graphql/schema.md, "Auth scopes").
// Resolver files need no signed-out test of their own (claude-docs/design-decisions/mb.180-graphql-transport-half.md).

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
  invitationCardBatches: {
    source: '{ invitationCardBatches(first: 1) { edges { node { batchId } } } }',
    outcome: 'refuses',
  },
  invitationCardAttempts: {
    source: `{ invitationCardAttempts(batchId: "${NOWHERE}", first: 1) { edges { node { id } } } }`,
    outcome: 'refuses',
  },
  cardArrivals: {
    source: '{ cardArrivals(first: 1) { edges { node { id } } } }',
    outcome: 'refuses',
  },
  cardArrivalsCsv: { source: '{ cardArrivalsCsv }', outcome: 'refuses' },
  mySupportRequests: {
    source: '{ mySupportRequests(first: 1) { edges { node { id } } } }',
    outcome: 'refuses',
  },
  mySupportRequest: { source: `{ mySupportRequest(id: "${NOWHERE}") { id } }`, outcome: 'refuses' },
  supportRequests: {
    source: '{ supportRequests(first: 1) { edges { node { id } } } }',
    outcome: 'refuses',
  },
  supportRequest: { source: `{ supportRequest(id: "${NOWHERE}") { id } }`, outcome: 'refuses' },
  compendium: {
    source: '{ compendium(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  compendiumFacets: {
    source: '{ compendiumFacets { forms { value count } } }',
    outcome: 'answers',
  },
  // A curator's count: the scope refuses a null session before the id is read.
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
  workingDeductionPreview: {
    source: `query ($workspaceId: ID!, $spellId: ID!) {
      workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) { deductions { stepId } }
    }`,
    variables: { workspaceId: WORKSPACE_W_ID, spellId: NOWHERE },
    outcome: 'refuses',
  },
  workspace: {
    source: 'query ($id: ID!) { workspace(id: $id) { id } }',
    variables: { id: WORKSPACE_W_ID },
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

// The compendium-only mode a null `workspaceId` asks for must not be
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
  // The question the add form asks is always asked in some coven.
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
  // A coven's ingredients are always some coven's.
  workspaceIngredients: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredients(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // Counted over the same rows as workspaceIngredients, so always some coven's.
  workspaceIngredientFacets: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredientFacets(workspaceId: $workspaceId) { forms { value count } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  // A spell is always some coven's.
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
  // A working is always some coven's spell's.
  workingDeductionPreview: {
    source: `query ($workspaceId: ID!, $spellId: ID!) {
      workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) { deductions { stepId } }
    }`,
    variables: { workspaceId: null, spellId: NOWHERE },
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

// Every write refuses a null session before any row is looked for, so ids are NOWHERE
// and inputs are the least each SDL type takes: the refusal is the field's, not the document's.

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
  setPassword: write('mutation { setPassword(newPassword: "fixture password") }'),
  // Open to anyone by design. The honeypot field is filled, so the send is dropped and the probe stores and mails nothing.
  sendSignedOutSupportRequest: {
    source:
      'mutation { sendSignedOutSupportRequest(input: { about: account, email: "fixture@example.org", subject: "Fixture", message: "Fixture", website: "filled" }) }',
    outcome: 'answers',
  },
  sendSupportRequest: write(
    'mutation { sendSupportRequest(input: { about: bug, subject: "Fixture", message: "Fixture" }) { id } }',
  ),
  replyToSupportRequest: write(
    `mutation { replyToSupportRequest(requestId: "${NOWHERE}", body: "Fixture") { id } }`,
  ),
  sendSupportMessage: write(
    `mutation { sendSupportMessage(requestId: "${NOWHERE}", body: "Fixture") { id } }`,
  ),
  addSupportInternalNote: write(
    `mutation { addSupportInternalNote(requestId: "${NOWHERE}", body: "Fixture") { id } }`,
  ),
  closeSupportRequest: write(`mutation { closeSupportRequest(id: "${NOWHERE}") { id } }`),
  assignSupportRequest: write(`mutation { assignSupportRequest(id: "${NOWHERE}") { id } }`),
  setSupportRequestCuratorVisible: write(
    `mutation { setSupportRequestCuratorVisible(id: "${NOWHERE}", visible: true) { id } }`,
  ),
  resolveSupportRequest: write(`mutation { resolveSupportRequest(id: "${NOWHERE}") { id } }`),
  setSupportRequestIssueUrl: write(
    `mutation { setSupportRequestIssueUrl(id: "${NOWHERE}", issueUrl: null) { id } }`,
  ),
  timeOutSupportSender: write(
    `mutation { timeOutSupportSender(userId: "${NOWHERE}", until: "2999-01-01T00:00:00Z") { id } }`,
  ),
  liftSupportTimeout: write(`mutation { liftSupportTimeout(id: "${NOWHERE}") { id } }`),
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
  createInvitationCards: write(
    'mutation { createInvitationCards(sheets: 1, expiresAt: "2099-01-01T00:00:00Z") { batchId } }',
  ),
  revokeInvitationCardBatch: write(
    `mutation { revokeInvitationCardBatch(batchId: "${NOWHERE}") { id } }`,
  ),
  recordCardAttempt: write('mutation { recordCardAttempt(token: "no-such-token") }'),
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
  duplicateSpell: write(
    `mutation { duplicateSpell(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") { id } }`,
  ),
  recordWorking: write(
    `mutation { recordWorking(workspaceId: "${WORKSPACE_W_ID}", spellId: "${NOWHERE}", input: { workedOn: "2026-10-01" }) { id } }`,
  ),
  updateWorking: write(
    `mutation { updateWorking(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}", input: { workedOn: "2026-10-01" }) { id } }`,
  ),
  completeWorking: write(
    `mutation { completeWorking(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") { working { id } } }`,
  ),
  deleteWorking: write(
    `mutation { deleteWorking(workspaceId: "${WORKSPACE_W_ID}", id: "${NOWHERE}") }`,
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

// Every admin write carries the `admin` scope, which refuses a signed-in user before the service is asked; the service refuses too, so the message tells which check spoke
// (the scope answers `Forbidden`'s default message, `assertSiteAdmin` its own). Every write is named admin or any-session, so a new write must say which.
const SCOPE_REFUSAL = new Forbidden().message;

const ADMIN_WRITES: Record<string, AdminWrite> = {
  createCompendiumIngredient: { governs: 'compendium' },
  updateCompendiumIngredient: { governs: 'compendium' },
  deleteCompendiumIngredient: { governs: 'compendium' },
  setCompendiumEntryReviewed: { governs: 'compendium' },
  // A null `workspaceId` is the compendium's tier; a coven's is the
  // member's, below.
  createReference: {
    governs: 'references',
    probe: write(`mutation { createReference(input: ${REFERENCE}) { id } }`),
  },
  // A null `workspaceId` is the compendium's tier; a coven's is the
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
  // Who may create a coven, granted and revoked by an admin.
  grantWorkspaceCreation: { governs: 'workspace creation' },
  revokeWorkspaceCreation: { governs: 'workspace creation' },
  // Who is an admin or a curator, granted and revoked by an admin.
  setUserRole: { governs: 'site role' },
  // The primary admin's pause on those changes.
  pauseAdminRoleChanges: { governs: 'site role' },
  resumeAdminRoleChanges: { governs: 'site role' },
  // Inviting an address to become an admin, and withdrawing it.
  createAdminInvitation: { governs: 'site role' },
  revokeAdminInvitation: { governs: 'site role' },
  // Printed invitation cards: minting, withdrawing one or a batch.
  createInvitationCards: { governs: 'site role' },
  revokeInvitationCardBatch: { governs: 'site role' },
  // A sender's requests and their sanctions: an admin's alone, so a curator is refused at the scope.
  assignSupportRequest: { governs: 'support' },
  setSupportRequestCuratorVisible: { governs: 'support' },
  setSupportRequestIssueUrl: { governs: 'support' },
  timeOutSupportSender: { governs: 'support' },
  liftSupportTimeout: { governs: 'support' },
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
  // The invited address is what admits, which the service checks.
  'acceptInvitation',
  // The session's own verified address is what admits, matched in SQL.
  'acceptInvitationById',
  // The same address match decides a decline.
  'declineInvitationById',
  'setName',
  // The session's own cookie names the account, which Better Auth reads.
  'setPassword',
  // The flag decides who may, which the service reads.
  'createWorkspace',
  // The owner's `member: update` decides, which the service checks.
  'updateMemberRole',
  // The owner's `workspace: delete` decides, which the service checks.
  'deleteWorkspace',
  // `member: remove` decides removal, and leaving is the caller's own seat.
  // The owner's `member: invite` decides, which the service checks.
  'createInvitation',
  // The owner's `member: invite` decides, which the service checks.
  'revokeInvitation',
  'removeMember',
  'leaveWorkspace',
  'createWorkspaceIngredient',
  'updateIngredient',
  'deleteIngredient',
  // The coven's `inventory: update` decides, which the stock service checks.
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
  // The coven's `spell: create` and `spell: update` decide, which the spell service checks.
  'createSpell',
  'updateSpell',
  // The coven's `spell: delete` decides, which the spell service checks.
  'deleteSpell',
  // The coven's `spell: create` decides, which the spell service checks.
  'duplicateSpell',
  // The coven's `working: create`, `update` and `delete` decide, which the working service checks; a change or a delete
  // also needs the recorder, or for a change someone named on the working.
  // Any signed-in account may report a refused card open; the service records it only against a real card.
  'recordCardAttempt',
  // Open to anyone, signed in or not: the service allows two topics and counts the sends.
  'sendSignedOutSupportRequest',
  // Any verified session may send; the service reads the limit and any time-out.
  'sendSupportRequest',
  // Any verified session may write on a request; the service finds only the sender's own.
  'sendSupportMessage',
  // A curator's scope admits; the service decides which requests (an admin any, a curator one assigned to them).
  'replyToSupportRequest',
  'resolveSupportRequest',
  'addSupportInternalNote',
  'closeSupportRequest',
  'recordWorking',
  'updateWorking',
  'completeWorking',
  'deleteWorking',
];

const adminProbe = (field: string): ScopeProbe =>
  ADMIN_WRITES[field].probe ?? MUTATION_PROBES[field];

describe('a signed-in non-admin at every admin write', () => {
  // E as the primary admin, so the pause's two writes, which the service
  // allows the primary admin alone, admit the admin past the scope.
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

// The people page's writes are an admin's alone; every other admin write is curation, which a curator's scope admits.
// A write added to ADMIN_WRITES lands on one side or the other.
const PEOPLE_PAGE: readonly Governed[] = ['workspace creation', 'site role', 'support'];
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
