import { graphql } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import { noSender } from '../support/email-verification';
import type { ScopeProbe } from './types';

// MB.80's line, drawn field by field: the compendium is the one public
// surface, so its three queries answer a null session and every other query
// refuses one. Every `Query` field is classified here, and the first test
// fails on one that is not, so a field added later has to say which side it
// is on (claude-docs/graphql/schema.md, "Auth scopes").

let compendiumId: string;

beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL as string);
  const [row] = await sql`
    select id from ingredients where workspace_id is null and deleted_at is null
    order by name, id limit 1`;
  compendiumId = row.id as string;
  await sql.end();
});

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
  ingredientFormValues: {
    source: '{ ingredientFormValues(first: 1) { edges { node { id } } } }',
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
  deitySuggestions: suggestion('deitySuggestions'),
  formSuggestions: suggestion('formSuggestions'),
  planetSuggestions: suggestion('planetSuggestions'),
  zodiacSuggestions: suggestion('zodiacSuggestions'),
};

describe('a null session at every Query field', () => {
  it('is classified for every field the schema has', () => {
    const fields = Object.keys(schema.getQueryType()?.getFields() ?? {});

    expect(fields.sort()).toEqual(Object.keys(PROBES).sort());
  });

  it.each(Object.entries(PROBES))('%s: %o', async (field, probe) => {
    const result = await graphql({
      schema,
      source: probe.source,
      variableValues: probe.variables,
      contextValue: { session: null, loaders: createLoaders(null), emailVerification: noSender },
    });

    if (probe.outcome === 'answers') {
      expect(result.errors).toBeUndefined();
      expect(result.data?.[field]).not.toBeNull();
    } else {
      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.path).toEqual([field]);
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
    }
  });
});
