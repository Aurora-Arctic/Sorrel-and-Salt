import { createYoga } from 'graphql-yoga';
import type { GraphQLObjectType } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { A, B, asUser } from '../support/as-user';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertReference } from '../support/db/insert-reference';
import { insertSpell } from '../support/db/insert-spell';
import { insertStock } from '../support/db/insert-stock';
import { variantIdOf } from '../support/db/read-variants';
import { noSender } from '../support/email-verification';
import {
  makeIngredient,
  makeSpell,
  makeVariant,
  makeWorkspace,
  workspaceColumns,
} from '../support/fixtures';
import type { Context } from '@/graphql/types';
import type { InvitationSender } from '@/modules/identity';
import type { Answer, WorkspaceIdProbe } from './types';

// A non-uuid `workspaceId` is a driver error masked as INTERNAL_SERVER_ERROR, so `assertMembership` refuses it as FORBIDDEN first, the answer a coven the caller is not in gets.
// Every field taking a `workspaceId` is named here and the first test fails on one that is not (claude-docs/db/membership-proof.md, "What the check asks").

const MALFORMED = ['not-a-coven', WORKSPACE_W_ID.slice(0, -1)];

let ingredientId: string;
// Its own row, so the delete probe's admitted call leaves the update probe's standing.
let deletableId: string;
// Its own row and common name, which the promote probe's admitted call swaps.
let promotableId: string;
let folkNameId: string;
// A coven of its own for the delete probe's admitted call, which would take W down.
let deletableWorkspaceId: string;
// Covens of their own for the removal and leave probes, whose admitted calls take B out of one.
let removableWorkspaceId: string;
let leavableWorkspaceId: string;
// W's pending invitation, which the revoke probe's admitted call revokes.
let revocableInvitationId: string;
// W's own reference, which the read probe reads and the update probe replaces.
let referenceId: string;
// Three forms of one W entry: the add probe stocks the first, the update probe
// changes the second's jar and the delete probe deletes the third's, so no
// admitted call depends on another having run.
let unheldVariantId: string;
let jarId: string;
let deletableJarId: string;
// Three compendium entries: the add probe takes the first into W's cupboard,
// the annotate probe relabels the second W holds, and the remove probe removes
// the third, so no admitted call depends on another having run.
let unheldEntryId: string;
let heldEntryId: string;
let removableEntryId: string;
// A compendium entry W holds, for the probe that makes it W's own.
let ownableEntryId: string;
// A shared spell of W, which the spell probe reads.
let spellId: string;
// A spell of W of its own, which the update probe saves.
let updatableSpellId: string;

beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL as string);
  ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
    A.id,
  );
  deletableId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Fixture Deleted', nomenclature: 'none' }),
    A.id,
  );
  promotableId = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Fixture Promoted',
      nomenclature: 'none',
      folkNames: ['Fixture Folk Name'],
    }),
    A.id,
  );
  const [folk] = await sql`
    select id from ingredient_folk_names where ingredient_id = ${promotableId}`;
  folkNameId = folk.id as string;
  referenceId = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);
  const stockedId = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Fixture Stocked',
      nomenclature: 'none',
      variants: ['Root', 'Herb', 'Oil'].map((form) => makeVariant({ form })),
    }),
    A.id,
  );
  unheldVariantId = await variantIdOf(sql, stockedId, 'Root');
  const jarOf = async (form: string) =>
    insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: stockedId,
        variantId: await variantIdOf(sql, stockedId, form),
      },
      A.id,
    );
  jarId = await jarOf('Herb');
  deletableJarId = await jarOf('Oil');
  const compendiumEntry = (name: string) =>
    insertIngredient(sql, makeIngredient({ name, nomenclature: 'none' }), A.id);
  unheldEntryId = await compendiumEntry('Fixture Unheld Entry');
  heldEntryId = await compendiumEntry('Fixture Held Entry');
  removableEntryId = await compendiumEntry('Fixture Removable Entry');
  await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: heldEntryId }, A.id);
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: removableEntryId },
    A.id,
  );
  ownableEntryId = await compendiumEntry('Fixture Ownable Entry');
  await insertCupboardEntry(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId: ownableEntryId },
    A.id,
  );
  const insertCoven = async (name: string) => {
    const [coven] = await sql`
      insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
      returning id`;
    const id = coven.id as string;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${id}, ${A.id}, 'owner', ${A.id}, ${A.id}), (${id}, ${B.id}, 'member', ${A.id}, ${A.id})`;
    return id;
  };
  deletableWorkspaceId = await insertCoven('Fixture Deletable Coven');
  removableWorkspaceId = await insertCoven('Fixture Removable Coven');
  leavableWorkspaceId = await insertCoven('Fixture Leavable Coven');
  const [invitation] = await sql`
    insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by)
    values ('revoked@workspace-ids.test', 'workspace-ids-hash', ${WORKSPACE_W_ID}, 'viewer', ${A.id}, ${A.id})
    returning id`;
  revocableInvitationId = invitation.id as string;
  spellId = await insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace' }),
    A.id,
  );
  updatableSpellId = await insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace' }),
    A.id,
  );
  await sql.end();
});

const suggestion = (field: string): WorkspaceIdProbe => ({
  source: `query ($workspaceId: ID!) {
    ${field}(workspaceId: $workspaceId, first: 1) { edges { node { value } } }
  }`,
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

const REFERENCE = { kind: 'book', title: 'A Herbal of Fixture Covens', published: '1988' };

const PROBES: Record<string, WorkspaceIdProbe> = {
  commonNameSuggestions: suggestion('commonNameSuggestions'),
  deitySuggestions: suggestion('deitySuggestions'),
  formSuggestions: suggestion('formSuggestions'),
  celestialBodySuggestions: suggestion('celestialBodySuggestions'),
  zodiacSuggestions: suggestion('zodiacSuggestions'),
  ingredientSuggestions: {
    source: `query ($workspaceId: ID!) {
      ingredientSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
  },
  possibleDuplicates: {
    source: `query ($workspaceId: ID!) {
      possibleDuplicates(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
  },
  compendiumMatches: {
    source: `query ($workspaceId: ID!) {
      compendiumMatches(workspaceId: $workspaceId, name: "Testwort", first: 1) { edges { node { id } } }
    }`,
  },
  ingredient: {
    source:
      'query ($workspaceId: ID, $id: ID!) { ingredient(workspaceId: $workspaceId, id: $id) { id } }',
    variables: () => ({ id: ingredientId }),
  },
  grimoire: {
    source: `query ($workspaceId: ID!) {
      grimoire(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
  },
  spell: {
    source:
      'query ($workspaceId: ID!, $id: ID!) { spell(workspaceId: $workspaceId, id: $id) { id } }',
    variables: () => ({ id: spellId }),
  },
  createSpell: {
    source: `mutation ($workspaceId: ID!) {
      createSpell(workspaceId: $workspaceId, input: {}) { id }
    }`,
  },
  updateSpell: {
    source: `mutation ($workspaceId: ID!, $id: ID!) {
      updateSpell(workspaceId: $workspaceId, id: $id, input: { expectedRevision: null, note: "Saved" }) { id }
    }`,
    variables: () => ({ id: updatableSpellId }),
  },
  createWorkspaceIngredient: {
    source: `mutation ($workspaceId: ID!, $input: IngredientInput!) {
      createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) { id }
    }`,
    variables: () => ({ input: { name: 'Fixture Created', variants: [] } }),
  },
  updateMemberRole: {
    source: `mutation ($workspaceId: ID!, $userId: ID!) {
      updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: member) { role }
    }`,
    variables: () => ({ userId: B.id }),
    asOwner: true,
  },
  createInvitation: {
    source: `mutation ($workspaceId: ID!) {
      createInvitation(workspaceId: $workspaceId, email: "invited@workspace-ids.test", role: viewer) { id }
    }`,
    asOwner: true,
  },
  revokeInvitation: {
    source: `mutation ($workspaceId: ID!, $id: ID!) {
      revokeInvitation(workspaceId: $workspaceId, id: $id) { id }
    }`,
    variables: () => ({ id: revocableInvitationId }),
    asOwner: true,
  },
  removeMember: {
    source: `mutation ($workspaceId: ID!, $userId: ID!) {
      removeMember(workspaceId: $workspaceId, userId: $userId)
    }`,
    variables: () => ({ userId: B.id }),
    asOwner: true,
    admittedTo: () => removableWorkspaceId,
  },
  leaveWorkspace: {
    source: `mutation ($workspaceId: ID!) {
      leaveWorkspace(workspaceId: $workspaceId)
    }`,
    admittedTo: () => leavableWorkspaceId,
  },
  deleteWorkspace: {
    source: `mutation ($workspaceId: ID!) {
      deleteWorkspace(workspaceId: $workspaceId)
    }`,
    asOwner: true,
    admittedTo: () => deletableWorkspaceId,
  },
  updateIngredient: {
    source: `mutation ($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
      updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) { id }
    }`,
    variables: () => ({ id: ingredientId, input: WHOLE_INGREDIENT }),
  },
  referenceSuggestions: {
    source: `query ($workspaceId: ID!) {
      referenceSuggestions(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
  },
  reference: {
    source:
      'query ($workspaceId: ID, $id: ID!) { reference(workspaceId: $workspaceId, id: $id) { id } }',
    variables: () => ({ id: referenceId }),
  },
  createReference: {
    source: `mutation ($workspaceId: ID, $input: ReferenceInput!) {
      createReference(workspaceId: $workspaceId, input: $input) { id }
    }`,
    variables: () => ({ input: REFERENCE }),
  },
  updateReference: {
    source: `mutation ($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {
      updateReference(workspaceId: $workspaceId, id: $id, input: $input) { id }
    }`,
    variables: () => ({ id: referenceId, input: REFERENCE }),
  },
  promoteFolkName: {
    source: `mutation ($workspaceId: ID, $id: ID!, $folkNameId: ID!) {
      promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) { id }
    }`,
    variables: () => ({ id: promotableId, folkNameId }),
  },
  deleteIngredient: {
    source:
      'mutation ($workspaceId: ID!, $id: ID!) { deleteIngredient(workspaceId: $workspaceId, id: $id) }',
    variables: () => ({ id: deletableId }),
  },
  workspaceIngredients: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredients(workspaceId: $workspaceId, first: 1) { edges { node { id } } }
    }`,
  },
  workspaceIngredientFacets: {
    source: `query ($workspaceId: ID!) {
      workspaceIngredientFacets(workspaceId: $workspaceId) { forms { value count } }
    }`,
  },
  addIngredientToWorkspace: {
    source: `mutation ($workspaceId: ID!, $variantId: ID!) {
      addIngredientToWorkspace(workspaceId: $workspaceId, variantId: $variantId, input: {}) { id }
    }`,
    variables: () => ({ variantId: unheldVariantId }),
  },
  updateStock: {
    source: `mutation ($workspaceId: ID!, $id: ID!) {
      updateStock(workspaceId: $workspaceId, id: $id, input: { quantityOnHand: 1 }) { id }
    }`,
    variables: () => ({ id: jarId }),
  },
  saveStock: {
    source: `mutation ($workspaceId: ID!, $ingredientId: ID!) {
      saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: { create: [], update: [], delete: [] }) { id }
    }`,
    variables: () => ({ ingredientId: heldEntryId }),
  },
  deleteStock: {
    source:
      'mutation ($workspaceId: ID!, $id: ID!) { deleteStock(workspaceId: $workspaceId, id: $id) }',
    variables: () => ({ id: deletableJarId }),
  },
  addCupboardEntry: {
    source: `mutation ($workspaceId: ID!, $ingredientId: ID!) {
      addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) { id }
    }`,
    variables: () => ({ ingredientId: unheldEntryId }),
  },
  annotateCupboardEntry: {
    source: `mutation ($workspaceId: ID!, $ingredientId: ID!) {
      annotateCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: { label: "Fixture Relabel" }) { id }
    }`,
    variables: () => ({ ingredientId: heldEntryId }),
  },
  removeCupboardEntry: {
    source: `mutation ($workspaceId: ID!, $ingredientId: ID!) {
      removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)
    }`,
    variables: () => ({ ingredientId: removableEntryId }),
  },
  convertCompendiumEntryToLocal: {
    source: `mutation ($workspaceId: ID!, $ingredientId: ID!) {
      convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {
        entry { id }
      }
    }`,
    variables: () => ({ ingredientId: ownableEntryId }),
  },
};

// The admitted createInvitation reaches its sender; this one mails no one.
const mailsNothing: InvitationSender = {
  siteInvitation: async () => {},
  workspaceInvitation: async () => {},
};

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

/** The probe as B, a member of W (or A, its owner, when the probe says), so only the id can refuse. */
async function run(probe: WorkspaceIdProbe, workspaceId: string): Promise<Answer> {
  const session = asUser(probe.asOwner ? A : B);
  const response = await yoga.fetch(
    'http://localhost/graphql',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: probe.source,
        variables: { ...probe.variables?.(), workspaceId },
      }),
    },
    {
      session,
      loaders: createLoaders(session),
      emailVerification: noSender,
      invitations: mailsNothing,
    },
  );
  return (await response.json()) as Answer;
}

/** Every Query and Mutation field declaring a `workspaceId` argument. */
function fieldsTakingWorkspaceId(): string[] {
  const roots = [schema.getQueryType(), schema.getMutationType()] as GraphQLObjectType[];
  return roots
    .flatMap((root) => Object.values(root.getFields()))
    .filter((field) => field.args.some((arg) => arg.name === 'workspaceId'))
    .map((field) => field.name);
}

describe('a workspaceId that is not a uuid', () => {
  it('is probed at every field that takes one', () => {
    expect(fieldsTakingWorkspaceId().sort()).toEqual(Object.keys(PROBES).sort());
  });

  it.each(Object.entries(PROBES))('is FORBIDDEN at %s', async (field, probe) => {
    // Why it could have answered: the same request naming W reaches the
    // field's service, and B is admitted to W.
    const admitted = await run(probe, probe.admittedTo?.() ?? WORKSPACE_W_ID);
    expect(admitted.errors).toBeUndefined();
    expect(admitted.data?.[field]).toBeTruthy();

    for (const workspaceId of MALFORMED) {
      const result = await run(probe, workspaceId);

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        path: [field],
        extensions: { code: 'FORBIDDEN' },
      });
    }
  });
});
