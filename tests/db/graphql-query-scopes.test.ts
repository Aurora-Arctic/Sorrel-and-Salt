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

// Every `Query` field is classified here, and the first test fails on one that is not (claude-docs/graphql/schema.md, "Auth scopes: the second check").
// Resolver files need no signed-out test of their own (claude-docs/design-decisions/graphql.md, "The GraphQL file holds the transport's half").

let compendiumId: string;

const NOWHERE = '00000000-0000-4000-8000-000000000000';

beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL as string);
  const [row] = await sql`
    select id from ingredients where workspace_id is null and deleted_at is null
    order by name, id limit 1`;
  compendiumId = row.id as string;
  await sql.end();
});

function fieldsOf(root: GraphQLObjectType | null | undefined): string[] {
  return Object.keys(root?.getFields() ?? {}).sort();
}

function queriesTakingWorkspaceId(): string[] {
  return Object.values(schema.getQueryType()?.getFields() ?? {})
    .filter((field) => field.args.some((arg) => arg.name === 'workspaceId'))
    .map((field) => field.name)
    .sort();
}

async function expectOutcome(field: string, probe: ScopeProbe) {
  const result = await run(null, probe.source, probe.variables);

  if (probe.outcome === 'answers') {
    expect(result.errors).toBeUndefined();
    expect(result.data?.[field]).not.toBeNull();
  } else if (probe.outcome === 'nulls') {
    expect(result.errors).toBeUndefined();
    expect(result.data).toHaveProperty(field, null);
  } else if (probe.outcome === 'refuses') {
    // The path is what shows the field was reached: a probe the SDL refused
    // would answer an error with none.
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: [field],
      extensions: { code: 'FORBIDDEN' },
    });
  } else if (probe.outcome === 'not-found') {
    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]).toMatchObject({ path: [field], extensions: { code: 'NOT_FOUND' } });
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
  userAccessPauses: {
    source: `{ userAccessPauses(userId: "${NOWHERE}", first: 1) { edges { node { id } } } }`,
    outcome: 'refuses',
  },
  documentForEditing: {
    source: '{ documentForEditing(key: "disclaimer") { id } }',
    outcome: 'refuses',
  },
  documentMailings: {
    source: '{ documentMailings { accountCount } }',
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
  supportDialogState: { source: '{ supportDialogState { kind } }', outcome: 'answers' },
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
  supportRequestByViewToken: {
    source: '{ supportRequestByViewToken(token: "fixture-token") { id } }',
    outcome: 'not-found',
  },
  compendium: {
    source: '{ compendium(first: 1) { edges { node { id } } } }',
    outcome: 'answers',
  },
  compendiumFacets: {
    source: '{ compendiumFacets { forms { value count } } }',
    outcome: 'answers',
  },
  compendiumEntryUsers: {
    source: `{ compendiumEntryUsers(id: "${NOWHERE}") }`,
    outcome: 'refuses',
  },
  compendiumSourcingScore: {
    source: `{ compendiumSourcingScore(id: "${NOWHERE}") { score } }`,
    outcome: 'nulls',
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

// A null `workspaceId` asks for the compendium alone, and must not be a way round the session.
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
  compendiumMatches: {
    source: `query ($workspaceId: ID!) {
      compendiumMatches(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  ingredientSuggestions: {
    source: `query ($workspaceId: ID!) {
      ingredientSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  workspaceIngredients: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredients(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
  workspaceIngredientFacets: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredientFacets(workspaceId: $workspaceId) { forms { value count } }
    }`,
    variables: { workspaceId: null },
    outcome: 'invalid',
  },
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
  saveDocumentDraft: write(
    `mutation { saveDocumentDraft(documentId: "${NOWHERE}", body: "Fixture", expectedRevision: null) { id } }`,
  ),
  publishDocumentDraft: write(
    `mutation { publishDocumentDraft(documentId: "${NOWHERE}", expectedRevision: null) { number } }`,
  ),
  discardDocumentDraft: write(
    `mutation { discardDocumentDraft(documentId: "${NOWHERE}", expectedRevision: 1) }`,
  ),
  updateDocument: write(
    `mutation { updateDocument(id: "${NOWHERE}", input: { title: "Fixture", lede: "Fixture" }) { id } }`,
  ),
  emailDocumentsToEveryAccount: write(
    `mutation { emailDocumentsToEveryAccount(summaries: [{ versionId: "${NOWHERE}", summary: "Fixture" }]) { accountCount } }`,
  ),
  resumeDocumentMailing: write(
    `mutation { resumeDocumentMailing(mailingId: "${NOWHERE}") { accountCount } }`,
  ),
  setName: write('mutation { setName(name: "Fixture") { id } }'),
  setPassword: write('mutation { setPassword(newPassword: "fixture password") }'),
  agreeToTerms: write(
    'mutation { agreeToTerms(version: { terms: 1, disclaimer: 1, ethics: 1 }) { id } }',
  ),
  // Open to anyone by design. The honeypot field is filled, so the send is dropped and the probe stores and mails nothing.
  sendSignedOutSupportRequest: {
    source:
      'mutation { sendSignedOutSupportRequest(input: { about: account, email: "fixture@example.org", subject: "Fixture", message: "Fixture", website: "filled" }) }',
    outcome: 'answers',
  },
  // Open to anyone by design. The honeypot field is filled, so the reply is dropped and the probe writes nothing.
  replyToSupportRequestByViewToken: {
    source:
      'mutation { replyToSupportRequestByViewToken(token: "fixture-token", body: "Fixture", website: "filled") }',
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
  resolveMySupportRequest: write(`mutation { resolveMySupportRequest(id: "${NOWHERE}\") { id } }`),
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
  timeOutSignedOutSender: write(
    `mutation { timeOutSignedOutSender(requestId: "${NOWHERE}", note: "Spam", message: "Hi") { id } }`,
  ),
  timeOutSupportSender: write(
    `mutation { timeOutSupportSender(userId: "${NOWHERE}", note: "Spam", message: "Hi") { id } }`,
  ),
  liftSupportTimeout: write(`mutation { liftSupportTimeout(id: "${NOWHERE}") { id } }`),
  grantWorkspaceCreation: write(`mutation { grantWorkspaceCreation(userId: "${NOWHERE}") { id } }`),
  revokeWorkspaceCreation: write(
    `mutation { revokeWorkspaceCreation(userId: "${NOWHERE}") { id } }`,
  ),
  setUserRole: write(`mutation { setUserRole(userId: "${NOWHERE}", role: admin) { id } }`),
  pauseUserAccess: write(
    `mutation { pauseUserAccess(userId: "${NOWHERE}", note: "Testnote", message: "Hi") { id } }`,
  ),
  liftUserAccessPause: write(`mutation { liftUserAccessPause(userId: "${NOWHERE}") { id } }`),
  pauseAdminRoleChanges: write('mutation { pauseAdminRoleChanges }'),
  resumeAdminRoleChanges: write('mutation { resumeAdminRoleChanges }'),
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
  createWorkspace: write('mutation { createWorkspace(name: "") { id } }'),
  updateMemberRole: write(
    `mutation { updateMemberRole(workspaceId: "${WORKSPACE_W_ID}", userId: "not-an-id", role: member) { role } }`,
  ),
  pauseMemberAccess: write(
    `mutation { pauseMemberAccess(workspaceId: "${WORKSPACE_W_ID}", userId: "not-an-id") { id } }`,
  ),
  liftMemberAccessPause: write(
    `mutation { liftMemberAccessPause(workspaceId: "${WORKSPACE_W_ID}", userId: "not-an-id") { id } }`,
  ),
  deleteWorkspace: write('mutation { deleteWorkspace(workspaceId: "not-an-id") }'),
  createInvitation: write(
    `mutation { createInvitation(workspaceId: "${WORKSPACE_W_ID}", email: "not-an-address", role: viewer) { id } }`,
  ),
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
  addCupboardEntry: write(
    `mutation { addCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}") { id } }`,
  ),
  annotateCupboardEntry: write(
    `mutation { annotateCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}", input: {}) { id } }`,
  ),
  removeCupboardEntry: write(
    `mutation { removeCupboardEntry(workspaceId: "${WORKSPACE_W_ID}", ingredientId: "${NOWHERE}") }`,
  ),
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
  setCompendiumEntryShown: write(
    `mutation { setCompendiumEntryShown(id: "${NOWHERE}", shown: false) { id } }`,
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
  setCompendiumEntryShown: { governs: 'compendium' },
  createReference: {
    governs: 'references',
    probe: write(`mutation { createReference(input: ${REFERENCE}) { id } }`),
  },
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
  grantWorkspaceCreation: { governs: 'workspace creation' },
  revokeWorkspaceCreation: { governs: 'workspace creation' },
  setUserRole: { governs: 'site role' },
  pauseUserAccess: { governs: 'site access' },
  liftUserAccessPause: { governs: 'site access' },
  pauseAdminRoleChanges: { governs: 'site role' },
  resumeAdminRoleChanges: { governs: 'site role' },
  createAdminInvitation: { governs: 'site role' },
  revokeAdminInvitation: { governs: 'site role' },
  createInvitationCards: { governs: 'site role' },
  revokeInvitationCardBatch: { governs: 'site role' },
  assignSupportRequest: { governs: 'support' },
  setSupportRequestCuratorVisible: { governs: 'support' },
  setSupportRequestIssueUrl: { governs: 'support' },
  timeOutSupportSender: { governs: 'support' },
  timeOutSignedOutSender: { governs: 'support' },
  liftSupportTimeout: { governs: 'support' },
  saveDocumentDraft: { governs: 'documents' },
  publishDocumentDraft: { governs: 'documents' },
  discardDocumentDraft: { governs: 'documents' },
  updateDocument: { governs: 'documents' },
  emailDocumentsToEveryAccount: { governs: 'documents' },
  resumeDocumentMailing: { governs: 'documents' },
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

const OPEN_WRITES = [
  'setEmail',
  'acceptInvitation',
  'acceptInvitationById',
  'declineInvitationById',
  'setName',
  'setPassword',
  'agreeToTerms',
  'createWorkspace',
  'updateMemberRole',
  'pauseMemberAccess',
  'liftMemberAccessPause',
  'deleteWorkspace',
  'createInvitation',
  'revokeInvitation',
  'removeMember',
  'leaveWorkspace',
  'createWorkspaceIngredient',
  'updateIngredient',
  'deleteIngredient',
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
  'createSpell',
  'updateSpell',
  'deleteSpell',
  'duplicateSpell',
  // Any signed-in account may report a refused card open; the service records it only against a real card.
  'recordCardAttempt',
  // Open to anyone, signed in or not: the service allows two topics and counts the sends.
  'sendSignedOutSupportRequest',
  // Open to anyone, signed in or not: the service finds the request by the token's hash and counts the replies.
  'replyToSupportRequestByViewToken',
  'sendSupportRequest',
  'sendSupportMessage',
  'resolveMySupportRequest',
  // A curator's scope admits; the service decides which requests (a keeper any, a curator one assigned to them).
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

describe('a signed-in non-keeper at every keeper write', () => {
  // E as the primary keeper, so the pause's two writes, which the service
  // allows the primary keeper alone, admit the admin past the scope.
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

  // The check reads the site role alone, so one non-keeper stands for every
  // one (claude-docs/testing/layer-ownership.md, rule 6): A, who owns a coven
  // and so holds the most a role of `user` can.
  it.each(Object.keys(ADMIN_WRITES))('%s refuses a non-keeper at the scope', async (field) => {
    const probe = adminProbe(field);

    // Preconditions: the field admits a site keeper past the scope, so the
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

// The people page's writes, and the site's documents, are a keeper's alone; every other keeper write is curation, which a curator's
// scope admits. A write added to ADMIN_WRITES lands on one side or the other.
const PEOPLE_PAGE: readonly Governed[] = [
  'workspace creation',
  'site role',
  'site access',
  'support',
  'documents',
];
const governsPeople = (field: string) => PEOPLE_PAGE.includes(ADMIN_WRITES[field].governs);
const PEOPLE_WRITES = Object.keys(ADMIN_WRITES).filter(governsPeople);
const CURATION_WRITES = Object.keys(ADMIN_WRITES).filter((field) => !governsPeople(field));

const codesOf = (result: Awaited<ReturnType<typeof run>>) =>
  result.errors?.map((error) => error.extensions?.code) ?? [];

describe('a curator at every keeper write, and at the people page’s reads', () => {
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
      expect.arrayContaining([
        'setUserRole',
        'grantWorkspaceCreation',
        'createAdminInvitation',
        'publishDocumentDraft',
      ]),
    );
  });

  it.each(CURATION_WRITES)('%s admits a curator past the scope and the service', async (field) => {
    const probe = adminProbe(field);
    // Why F could have been refused: the role is not a keeper's.
    expect(asUser(F).role).toBe('curator');
    expect(() => assertSiteAdmin(asUser(F))).toThrow(Forbidden);

    const result = await run(asUser(F), probe.source, probe.variables);

    expect(codesOf(result)).not.toContain('FORBIDDEN');
  });

  it.each(PEOPLE_WRITES)('%s refuses a curator at the scope', async (field) => {
    const probe = adminProbe(field);
    // Preconditions: the field admits a keeper, and F holds a proof that
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

  it.each([
    'users',
    'privilegeChanges',
    'userAccessPauses',
    'documentForEditing',
    'documentMailings',
  ])('%s refuses a curator, answering an admin', async (field) => {
    const { source } = PROBES[field];
    expect(codesOf(await run(asUser(E), source))).toEqual([]);

    const result = await run(asUser(F), source);

    expect(result.data?.[field] ?? null).toBeNull();
    expect(codesOf(result)).toEqual(['FORBIDDEN']);
  });
});
