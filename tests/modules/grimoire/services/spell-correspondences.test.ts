import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { spellCorrespondencesOf } from '@/modules/grimoire';
import type { SpellCorrespondences, SpellVisibility } from '@/modules/grimoire';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { curatedDeityId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeSpell,
  makeVariant,
} from '../../../support/fixtures';

// The spell page's Correspondences block reads through `spellCorrespondencesOf`: every list
// value and deity of the spell's step ingredients, each once, with the steps' names for the
// ingredients that gave it (claude-docs/components/spell-recipe.md).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// A keeper-listed deity from the standard seed, which `truncate ingredients` leaves alone.
let hecate: { id: string; tradition: string };
beforeAll(async () => {
  const id = await curatedDeityId(sql, 'Hecate');
  const [row] = await sql`
    select deity_traditions.name from deities
    join deity_traditions on deity_traditions.id = deities.tradition_id
    where deities.id = ${id}`;
  hecate = { id, tradition: row.name as string };
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const ingredient = (overrides: Overrides<IngredientFixture>): Promise<string> =>
  insertIngredient(
    sql,
    makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', ...overrides }),
    A.id,
  );

const spellOf = (
  ingredientIds: string[],
  author: typeof A = B,
  visibility: SpellVisibility = 'workspace',
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> =>
  insertSpell(
    sql,
    makeSpell({
      workspaceId,
      visibility,
      steps: ingredientIds.map((ingredientId) => ({ ingredientId })),
    }),
    author.id,
  );

const valuesOf = (rows: SpellCorrespondences['elements']) => rows.map(({ value }) => value);

describe('spellCorrespondencesOf', () => {
  it('combines the lists and deities of every step, each value once in the first spelling met, beside the steps that gave it', async () => {
    const root = await ingredient({
      name: 'Testroot',
      elements: ['fire'],
      celestialBodies: ['Fixture Sun'],
      zodiacSigns: ['Fixture Ram'],
      colors: ['Blue'],
      deities: ['Testdeity'],
    });
    await insertDeityLink(sql, root, hecate.id, 1, A.id);
    const bark = await ingredient({
      name: 'Testbark',
      elements: ['water', 'fire'],
      celestialBodies: ['Fixture Moon'],
      zodiacSigns: ['Fixture Ram'],
      // The same colour in other capitals and with spaces round it is the same colour.
      colors: [' blue ', 'Green'],
      deities: ['testdeity'],
    });
    await insertDeityLink(sql, bark, hecate.id, 1, A.id);
    // Testroot again: a step repeating an ingredient names it once beside a value.
    const spell = await spellOf([root, bark, root]);

    const found = await spellCorrespondencesOf(asUser(C), WORKSPACE_W_ID, spell);

    const both = ['Testroot (Testform)', 'Testbark (Testform)'];
    expect(found).toEqual({
      elements: [
        { value: 'fire', sources: both },
        { value: 'water', sources: ['Testbark (Testform)'] },
      ],
      celestialBodies: [
        { value: 'Fixture Sun', sources: ['Testroot (Testform)'] },
        { value: 'Fixture Moon', sources: ['Testbark (Testform)'] },
      ],
      zodiacSigns: [{ value: 'Fixture Ram', sources: both }],
      colors: [
        { value: 'Blue', sources: both },
        { value: 'Green', sources: ['Testbark (Testform)'] },
      ],
      deities: [
        // A typed deity is matched by its name; a listed one by the keepers' row.
        { value: { name: 'Testdeity', tradition: null, otherNames: [] }, sources: both },
        {
          value: expect.objectContaining({ name: 'Hecate', tradition: hecate.tradition }),
          sources: both,
        },
      ],
    } satisfies SpellCorrespondences);
  });

  it("adds the form's own lists to its ingredient's, and names the form as the step does", async () => {
    const root = await ingredient({
      name: 'Testroot',
      elements: ['earth'],
      colors: ['Brown'],
      variants: [makeVariant({ form: 'dried testleaf', elements: ['air'], colors: ['Grey'] })],
    });
    const spell = await spellOf([root]);

    const found = await spellCorrespondencesOf(asUser(B), WORKSPACE_W_ID, spell);

    expect(found.elements).toEqual([
      { value: 'earth', sources: ['Testroot (Dried Testleaf)'] },
      { value: 'air', sources: ['Testroot (Dried Testleaf)'] },
    ]);
    expect(valuesOf(found.colors)).toEqual(['Brown', 'Grey']);
  });

  it('still counts an ingredient removed since, its deities included', async () => {
    const live = await ingredient({ name: 'Testroot', colors: ['Blue'] });
    const gone = await ingredient({
      name: 'Testbark',
      colors: ['Green'],
      zodiacSigns: ['Fixture Bull'],
      deities: ['Testdeity'],
    });
    await insertDeityLink(sql, gone, hecate.id, 1, A.id);
    const spell = await spellOf([live, gone]);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

    const found = await spellCorrespondencesOf(asUser(B), WORKSPACE_W_ID, spell);

    expect(found.colors).toEqual([
      { value: 'Blue', sources: ['Testroot (Testform)'] },
      { value: 'Green', sources: ['Testbark (Testform)'] },
    ]);
    expect(valuesOf(found.zodiacSigns)).toEqual(['Fixture Bull']);
    expect(found.deities).toEqual([
      {
        value: { name: 'Testdeity', tradition: null, otherNames: [] },
        sources: ['Testbark (Testform)'],
      },
      {
        value: expect.objectContaining({ name: 'Hecate', tradition: hecate.tradition }),
        sources: ['Testbark (Testform)'],
      },
    ]);
  });

  it("reads a compendium entry's lists as the coven's own note on it has them", async () => {
    const entry = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: null,
        name: 'Compendium Testwort',
        nomenclature: 'none',
        colors: ['Blue'],
        elements: ['fire'],
        variants: [makeVariant()],
      }),
      E.id,
    );
    // The note sets colours and leaves elements to the compendium.
    await insertCupboardEntry(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: entry,
        label: 'Hedge Testwort',
        colors: ['Red'],
      },
      A.id,
    );
    const spell = await spellOf([entry]);

    const found = await spellCorrespondencesOf(asUser(B), WORKSPACE_W_ID, spell);

    expect(found.colors).toEqual([{ value: 'Red', sources: ['Hedge Testwort (Testform)'] }]);
    expect(valuesOf(found.elements)).toEqual(['fire']);
  });

  it('refuses D by direct id, though a member of the coven reads the same spell', async () => {
    const root = await ingredient({ name: 'Testroot', colors: ['Blue'] });
    const spell = await spellOf([root]);
    // Why this could have succeeded: the spell is shared and has values to give.
    await expect(spellCorrespondencesOf(asUser(B), WORKSPACE_W_ID, spell)).resolves.toMatchObject({
      colors: [{ value: 'Blue' }],
    });

    await expect(spellCorrespondencesOf(asUser(D), WORKSPACE_W_ID, spell)).rejects.toBeInstanceOf(
      Forbidden,
    );
    // Named under D's own coven, the spell is not there.
    await expect(spellCorrespondencesOf(asUser(D), WORKSPACE_X_ID, spell)).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('answers NotFound to anyone but the author of a private spell, and gives the author its values', async () => {
    const root = await ingredient({ name: 'Testroot', colors: ['Blue'] });
    const hidden = await spellOf([root], A, 'private');

    await expect(spellCorrespondencesOf(asUser(A), WORKSPACE_W_ID, hidden)).resolves.toMatchObject({
      colors: [{ value: 'Blue', sources: ['Testroot (Testform)'] }],
    });
    await expect(spellCorrespondencesOf(asUser(B), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(
      NotFound,
    );
  });
});
