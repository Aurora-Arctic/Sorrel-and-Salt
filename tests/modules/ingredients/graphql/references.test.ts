import { createYoga } from 'graphql-yoga';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { noSender } from '../../../support/email-verification';
import { makeIngredient } from '../../../support/fixtures';
import type { Context } from '@/graphql/types';
import type { Answer, ReferenceNode } from './types';

// MB.153 over the wire: a reference's two writes, the picker's search,
// `Ingredient.references` and the compendium's to-do filter, run through Yoga
// with the route's own error mapping, so a refusal is asserted as the browser
// receives it. The services' own rules are references.test.ts's and
// ingredient-references.test.ts's; this file holds the transport's half.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
});

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

async function run<T>(
  session: Session | null,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Answer<T>> {
  const response = await yoga.fetch(
    'http://localhost/graphql',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    { session, loaders: createLoaders(session), emailVerification: noSender },
  );
  return (await response.json()) as Answer<T>;
}

const FIELDS = `id kind authors title container url modified accessed citation isGlobal
  audit { createdBy updatedBy }`;

const CREATE = `mutation ($workspaceId: ID, $input: ReferenceInput!) {
  createReference(workspaceId: $workspaceId, input: $input) { ${FIELDS} }
}`;

const UPDATE = `mutation ($workspaceId: ID, $id: ID!, $input: ReferenceInput!) {
  updateReference(workspaceId: $workspaceId, id: $id, input: $input) { ${FIELDS} }
}`;

const WEB_PAGE = {
  kind: 'web_page',
  authors: 'Testwort, Fixtura',
  title: 'Greek Fixtures',
  container: 'Invented History Encyclopedia',
  url: 'https://example.org/Greek_Fixtures/',
  modified: '2024-12-28',
  accessed: '2026-10-06',
};

describe('createReference', () => {
  it('writes a coven’s reference, answering its citation and its days as written', async () => {
    const result = await run<{ createReference: ReferenceNode }>(asUser(B), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      input: WEB_PAGE,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createReference).toMatchObject({
      kind: 'web_page',
      modified: '2024-12-28',
      accessed: '2026-10-06',
      isGlobal: false,
      citation:
        'Testwort, Fixtura. "Greek Fixtures." Invented History Encyclopedia. Last modified December 28, 2024. Accessed October 6, 2026. https://example.org/Greek_Fixtures/.',
      audit: { createdBy: B.id, updatedBy: B.id },
    });
  });

  it('writes a compendium reference for a site admin, with no workspaceId', async () => {
    const result = await run<{ createReference: ReferenceNode }>(asUser(E), CREATE, {
      input: WEB_PAGE,
    });

    expect(result.data?.createReference.isGlobal).toBe(true);
  });

  it('refuses a compendium reference to a member, as FORBIDDEN', async () => {
    const result = await run(asUser(B), CREATE, { input: WEB_PAGE });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('refuses a signed-out request, as FORBIDDEN', async () => {
    const result = await run(null, CREATE, { workspaceId: WORKSPACE_W_ID, input: WEB_PAGE });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('answers a refusal per kind as VALIDATION, each issue pathed to its field', async () => {
    const result = await run(asUser(B), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      input: { kind: 'web_page', title: 'Testwort' },
    });

    expect(result.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [
        { path: ['url'], message: 'A web page needs its address' },
        { path: ['accessed'], message: 'A web page needs the day it was read' },
      ],
    });
  });
});

describe('updateReference', () => {
  it('reaches every ingredient citing it', async () => {
    const reference = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);
    const ids: string[] = [];
    for (const name of ['Testwort', 'Mockleaf']) {
      const id = await insertIngredient(
        sql,
        makeIngredient({ name, workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
        A.id,
      );
      await insertReferenceLink(sql, id, reference, A.id);
      ids.push(id);
    }

    const result = await run(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id: reference,
      input: { kind: 'book', title: 'Renamed Herbal', published: '1990' },
    });
    expect(result.errors).toBeUndefined();

    for (const id of ids) {
      const read = await run<{ ingredient: { references: unknown } }>(
        asUser(B),
        `query ($id: ID!, $workspaceId: ID) {
          ingredient(id: $id, workspaceId: $workspaceId) { references { reference { citation } } }
        }`,
        { id, workspaceId: WORKSPACE_W_ID },
      );
      expect(read.data?.ingredient.references).toEqual([
        { reference: { citation: 'Renamed Herbal. 1990.' } },
      ]);
    }
  });

  // The precondition: the reference exists and the member's coven reaches it
  // through a link; the update still names nothing in the coven's tier.
  it('refuses a member the compendium reference their ingredient cites, as NOT_FOUND', async () => {
    const reference = await insertReference(sql, {}, E.id);
    const id = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
      A.id,
    );
    await insertReferenceLink(sql, id, reference, A.id);

    const result = await run(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id: reference,
      input: { kind: 'book', title: 'Hijacked', published: '1990' },
    });

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

describe('Ingredient.references', () => {
  const SAVE = `mutation ($workspaceId: ID!, $input: IngredientInput!) {
    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
      id references { locator reference { title citation isGlobal } }
    }
  }`;

  const REPLACE = `mutation ($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
    updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) {
      references { locator reference { title } }
    }
  }`;

  const whole = (references: unknown[]) => ({
    name: 'Testwort',
    canonicalName: '',
    nomenclature: 'none',
    form: '',
    description: '',
    elements: [],
    planets: [],
    zodiacSigns: [],
    deities: [],
    colors: [],
    safetyNotes: '',
    substitutes: [],
    folkNames: [],
    references,
  });

  it('saves and reads a coven ingredient’s references, alphabetical by citation', async () => {
    const compendium = await insertReference(sql, { title: 'Zeta Herbal' }, E.id);
    const own = await insertReference(
      sql,
      { workspace_id: WORKSPACE_W_ID, title: 'Alder Notes' },
      A.id,
    );

    const result = await run<{ createWorkspaceIngredient: { references: unknown[] } }>(
      asUser(B),
      SAVE,
      {
        workspaceId: WORKSPACE_W_ID,
        input: {
          name: 'Testwort',
          references: [{ referenceId: compendium, locator: 'p. 112' }, { referenceId: own }],
        },
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createWorkspaceIngredient.references).toEqual([
      {
        locator: null,
        reference: { title: 'Alder Notes', citation: 'Alder Notes. 1988.', isGlobal: false },
      },
      {
        locator: 'p. 112',
        reference: { title: 'Zeta Herbal', citation: 'Zeta Herbal. 1988.', isGlobal: true },
      },
    ]);
  });

  it('answers this write’s references from an update, and [] once cleared', async () => {
    const reference = await insertReference(sql, { title: 'Fixture Herbal' }, E.id);
    const created = await run<{ createWorkspaceIngredient: { id: string } }>(asUser(B), SAVE, {
      workspaceId: WORKSPACE_W_ID,
      input: { name: 'Testwort', references: [{ referenceId: reference }] },
    });
    const id = created.data?.createWorkspaceIngredient.id;

    const moved = await run<{ updateIngredient: { references: unknown[] } }>(asUser(B), REPLACE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input: whole([{ referenceId: reference, locator: 'p. 9' }]),
    });
    expect(moved.data?.updateIngredient.references).toEqual([
      { locator: 'p. 9', reference: { title: 'Fixture Herbal' } },
    ]);

    const cleared = await run<{ updateIngredient: { references: unknown[] } }>(asUser(B), REPLACE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input: whole([]),
    });
    expect(cleared.data?.updateIngredient.references).toEqual([]);
  });

  it('refuses another coven’s reference as VALIDATION, beside the entry', async () => {
    const xReference = await insertReference(sql, { workspace_id: WORKSPACE_X_ID }, D.id);

    const result = await run(asUser(B), SAVE, {
      workspaceId: WORKSPACE_W_ID,
      input: { name: 'Testwort', references: [{ referenceId: xReference }] },
    });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [expect.objectContaining({ path: ['references', 0] })],
    });
  });

  it('reads a compendium entry’s references signed out', async () => {
    const reference = await insertReference(sql, { title: 'Fixture Herbal' }, E.id);
    const id = await insertIngredient(sql, makeIngredient({ nomenclature: 'none' }), A.id);
    await insertReferenceLink(sql, id, reference, A.id, 's.v. Testwort');

    const result = await run<{ ingredient: { references: unknown[] } }>(
      null,
      `query ($id: ID!) { ingredient(id: $id) { references { locator reference { title } } } }`,
      { id },
    );

    expect(result.data?.ingredient.references).toEqual([
      { locator: 's.v. Testwort', reference: { title: 'Fixture Herbal' } },
    ]);
  });
});

describe('referenceSuggestions', () => {
  const SUGGEST = `query ($workspaceId: ID!, $query: String) {
    referenceSuggestions(workspaceId: $workspaceId, query: $query) {
      edges { node { title isGlobal citation } }
    }
  }`;

  type Suggestions = { referenceSuggestions: { edges: { node: { title: string } }[] } };

  it('offers the compendium’s and this coven’s, never another coven’s', async () => {
    await insertReference(sql, { title: 'Testwort Compendium' }, E.id);
    await insertReference(sql, { workspace_id: WORKSPACE_W_ID, title: 'Testwort Notes' }, A.id);
    await insertReference(sql, { workspace_id: WORKSPACE_X_ID, title: 'Testwort Secrets' }, D.id);
    // The precondition: X's reference matches, as X's own member sees.
    const asX = await run<Suggestions>(asUser(D), SUGGEST, {
      workspaceId: WORKSPACE_X_ID,
      query: 'testwort',
    });
    expect(asX.data?.referenceSuggestions.edges.map((edge) => edge.node.title)).toContain(
      'Testwort Secrets',
    );

    const result = await run<Suggestions>(asUser(B), SUGGEST, {
      workspaceId: WORKSPACE_W_ID,
      query: 'testwort',
    });

    expect(result.data?.referenceSuggestions.edges.map((edge) => edge.node.title).sort()).toEqual([
      'Testwort Compendium',
      'Testwort Notes',
    ]);
  });

  it('refuses a signed-out request and a non-member, as FORBIDDEN', async () => {
    const signedOut = await run(null, SUGGEST, { workspaceId: WORKSPACE_W_ID });
    const outsider = await run(asUser(D), SUGGEST, { workspaceId: WORKSPACE_W_ID });

    expect(signedOut.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(outsider.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});

describe('compendium(withoutReferences)', () => {
  it('lists the entries citing nothing, signed out, and counts them', async () => {
    const reference = await insertReference(sql, {}, E.id);
    const cited = await insertIngredient(
      sql,
      makeIngredient({ name: 'Cited', nomenclature: 'none' }),
      A.id,
    );
    await insertReferenceLink(sql, cited, reference, A.id);
    await insertIngredient(sql, makeIngredient({ name: 'Uncited', nomenclature: 'none' }), A.id);

    const result = await run<{
      compendium: { totalCount: number; edges: { node: { name: string } }[] };
    }>(null, `{ compendium(withoutReferences: true) { totalCount edges { node { name } } } }`);

    expect(result.errors).toBeUndefined();
    expect(result.data?.compendium).toEqual({
      totalCount: 1,
      edges: [{ node: { name: 'Uncited' } }],
    });
  });
});
