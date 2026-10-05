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
import { noSender } from '../support/email-verification';
import { makeIngredient } from '../support/fixtures';
import type { Context } from '@/graphql/types';
import type { Answer, WorkspaceIdProbe } from './types';

// A `workspaceId` is whatever string the client sent, and asked of the
// database one that is not a uuid is a driver error, which leaves masked as
// INTERNAL_SERVER_ERROR. `assertMembership` refuses it as FORBIDDEN first,
// the answer a coven the caller is not in gets. Every field taking a
// `workspaceId` is named here, and the first test fails on one that is not,
// so a field added later is held to the same answer
// (claude-docs/db/membership-proof.md, "What the check asks").

const MALFORMED = ['not-a-coven', WORKSPACE_W_ID.slice(0, -1)];

let ingredientId: string;
// Its own row, so the delete probe's admitted call leaves the update probe's standing.
let deletableId: string;

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
  form: '',
  description: '',
  element: null,
  planets: [],
  zodiacSigns: [],
  deities: [],
  colors: [],
  safetyNotes: '',
  substitutes: [],
  folkNames: [],
};

const PROBES: Record<string, WorkspaceIdProbe> = {
  commonNameSuggestions: suggestion('commonNameSuggestions'),
  formSuggestions: suggestion('formSuggestions'),
  planetSuggestions: suggestion('planetSuggestions'),
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
  ingredient: {
    source:
      'query ($workspaceId: ID, $id: ID!) { ingredient(workspaceId: $workspaceId, id: $id) { id } }',
    variables: () => ({ id: ingredientId }),
  },
  createWorkspaceIngredient: {
    source: `mutation ($workspaceId: ID!, $input: IngredientInput!) {
      createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) { id }
    }`,
    variables: () => ({ input: { name: 'Fixture Created' } }),
  },
  updateIngredient: {
    source: `mutation ($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
      updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) { id }
    }`,
    variables: () => ({ id: ingredientId, input: WHOLE_INGREDIENT }),
  },
  deleteIngredient: {
    source:
      'mutation ($workspaceId: ID!, $id: ID!) { deleteIngredient(workspaceId: $workspaceId, id: $id) }',
    variables: () => ({ id: deletableId }),
  },
};

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

/** The probe as B, a member of W, so the signed-in scope passes and only the id can refuse. */
async function run(probe: WorkspaceIdProbe, workspaceId: string): Promise<Answer> {
  const session = asUser(B);
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
    { session, loaders: createLoaders(session), emailVerification: noSender },
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
    const admitted = await run(probe, WORKSPACE_W_ID);
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
