import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { A, B, C, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// The two spell saves over the wire (M10.10): what the transport adds to
// services/spells.test.ts, which owns who may save what and how a recipe is
// written. Here: the answer's shape and revision, a save's steps read fresh in
// the same request, a null the wire allows but the service does not, and one
// refusal per code a save can answer.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const SPELL = `id title status visibility revision jarDescription
  steps { position body name form ingredient { id } variant { form } }`;

const CREATE = `mutation ($workspaceId: ID!, $input: SpellInput!) {
  createSpell(workspaceId: $workspaceId, input: $input) { ${SPELL} }
}`;

const UPDATE = `mutation ($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {
  updateSpell(workspaceId: $workspaceId, id: $id, input: $input) { ${SPELL} }
}`;

const ONE = `query ($workspaceId: ID!, $id: ID!) {
  spell(workspaceId: $workspaceId, id: $id) { ${SPELL} }
}`;

type SpellNode = {
  id: string;
  title: string | null;
  status: string;
  visibility: string;
  revision: number;
  jarDescription: string | null;
  steps: {
    position: number;
    body: string | null;
    name: string | null;
    form: string | null;
    ingredient: { id: string } | null;
    variant: { form: string } | null;
  }[];
};

/** A coven ingredient of W with one form, Testform, and that form's id. */
async function testroot() {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Testroot',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Testform' })],
    }),
    A.id,
  );
  return { ingredientId, variantId: await variantIdOf(sql, ingredientId, 'Testform') };
}

describe('createSpell', () => {
  it('answers the new spell at revision 1, with its recipe in order', async () => {
    const root = await testroot();

    const result = await run<{ createSpell: SpellNode }>(asUser(B), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      input: {
        title: 'Testing Jar',
        status: 'complete',
        jarDescription: 'Small',
        steps: [{ body: 'Stir three times.' }, root, { name: 'River Water', form: 'Bottled' }],
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.createSpell).toMatchObject({
      title: 'Testing Jar',
      status: 'complete',
      jarDescription: 'Small',
      revision: 1,
      steps: [
        { position: 1, body: 'Stir three times.', ingredient: null },
        { position: 2, name: 'Testroot', ingredient: { id: root.ingredientId } },
        { position: 3, name: 'River Water', form: 'Bottled', variant: null },
      ],
    });
  });

  it('reads a status, visibility, recipe or category list sent as null as left out', async () => {
    const result = await run<{ createSpell: SpellNode }>(asUser(B), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      input: { status: null, visibility: null, steps: null, categoryIds: null },
    });

    expect(result.errors).toBeUndefined();
    // The columns' own defaults: a draft, shared with the coven, with no steps.
    expect(result.data!.createSpell).toMatchObject({
      title: null,
      status: 'draft',
      visibility: 'workspace',
      steps: [],
    });
  });

  it('answers VALIDATION at the step that names both an ingredient and a custom name', async () => {
    const root = await testroot();

    const result = await run(asUser(B), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      input: { steps: [{ body: 'Stir.' }, { ...root, name: 'River Water' }] },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['steps', 1, 'name'] }],
    });
    expect(await sql`select id from spells`).toHaveLength(0);
  });
});

describe('updateSpell', () => {
  async function savedSpell() {
    return insertSpell(
      sql,
      makeSpell({
        workspaceId: WORKSPACE_W_ID,
        title: 'Testing Jar',
        steps: [{ body: 'Stir three times.' }],
      }),
      B.id,
    );
  }

  it('answers the raised revision and the new recipe, read fresh after the spell was read in the same request', async () => {
    const id = await savedSpell();
    const session = asUser(B);
    const context = { loaders: createLoaders(session) };
    // The steps the request has already read, which the save must not answer with.
    const before = await run<{ spell: SpellNode }>(
      session,
      ONE,
      { workspaceId: WORKSPACE_W_ID, id },
      context,
    );
    expect(before.data!.spell.steps.map((step) => step.body)).toEqual(['Stir three times.']);
    const [kept] = await sql<{ id: string }[]>`select id from spell_steps where spell_id = ${id}`;

    const result = await run<{ updateSpell: SpellNode }>(
      session,
      UPDATE,
      {
        workspaceId: WORKSPACE_W_ID,
        id,
        input: {
          expectedRevision: before.data!.spell.revision,
          steps: [{ body: 'Seal it.' }, { id: kept!.id, body: 'Stir three times.' }],
        },
      },
      context,
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.updateSpell).toMatchObject({
      title: 'Testing Jar',
      revision: before.data!.spell.revision + 1,
      steps: [
        { position: 1, body: 'Seal it.' },
        { position: 2, body: 'Stir three times.' },
      ],
    });
  });

  it('answers the assigned categories the save names, read fresh after the spell was read in the same request', async () => {
    const id = await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_W_ID, categories: ['Protection'] }),
      B.id,
    );
    const [release] = await sql<{ id: string }[]>`select id from categories where name = 'Release'`;
    const session = asUser(B);
    const context = { loaders: createLoaders(session) };
    const CATEGORIES = `query ($workspaceId: ID!, $id: ID!) {
      spell(workspaceId: $workspaceId, id: $id) { categories { name } }
    }`;
    const before = await run<{ spell: { categories: { name: string }[] } }>(
      session,
      CATEGORIES,
      { workspaceId: WORKSPACE_W_ID, id },
      context,
    );
    expect(before.data!.spell.categories).toEqual([{ name: 'Protection' }]);

    const result = await run<{ updateSpell: { categories: { name: string }[] } }>(
      session,
      `mutation ($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {
        updateSpell(workspaceId: $workspaceId, id: $id, input: $input) { categories { name } }
      }`,
      {
        workspaceId: WORKSPACE_W_ID,
        id,
        input: { expectedRevision: null, categoryIds: [release!.id] },
      },
      context,
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.updateSpell.categories).toEqual([{ name: 'Release' }]);
  });

  it('answers STALE_WRITE with the revision the spell is at now, and writes nothing', async () => {
    const id = await savedSpell();
    // Another member's two saves since: the trigger raises the revision on each update.
    await sql`update spells set note = ${'Saved once.'} where id = ${id}`;
    await sql`update spells set note = ${'Saved twice.'} where id = ${id}`;

    const result = await run(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input: { expectedRevision: 2, title: 'Renamed Jar' },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'STALE_WRITE',
      currentRevision: 3,
    });
    const [row] = await sql<{ title: string }[]>`select title from spells where id = ${id}`;
    expect(row!.title).toBe('Testing Jar');
  });

  it('answers VALIDATION when the save leaves the expected revision out, where null would write', async () => {
    const id = await savedSpell();
    // Why the refusal could have succeeded: the same save stating null writes.
    const stated = await run<{ updateSpell: SpellNode }>(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input: { expectedRevision: null, title: 'Renamed Jar' },
    });
    expect(stated.data!.updateSpell.title).toBe('Renamed Jar');

    const result = await run(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input: { title: 'Renamed Again' },
    });

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['expectedRevision'] }],
    });
  });

  it('answers FORBIDDEN to a viewer naming the spell by id, which a member of the coven saves', async () => {
    const id = await savedSpell();
    const input = { expectedRevision: null, title: 'Renamed Jar' };
    // Why the refusal could have succeeded: the viewer reads the spell by that id.
    const read = await run<{ spell: SpellNode }>(asUser(C), ONE, {
      workspaceId: WORKSPACE_W_ID,
      id,
    });
    expect(read.data!.spell.id).toBe(id);

    const refused = await run(asUser(C), UPDATE, { workspaceId: WORKSPACE_W_ID, id, input });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [row] = await sql<{ title: string }[]>`select title from spells where id = ${id}`;
    expect(row!.title).toBe('Testing Jar');

    const saved = await run<{ updateSpell: SpellNode }>(asUser(B), UPDATE, {
      workspaceId: WORKSPACE_W_ID,
      id,
      input,
    });
    expect(saved.data!.updateSpell.title).toBe('Renamed Jar');
  });
});
