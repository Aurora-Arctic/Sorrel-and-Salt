import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertSpell } from '../support/db/insert-spell';
import { makeIngredient, makeSpell } from '../support/fixtures';

// The setup inserter for a spell, held to insert-ingredient.ts's terms: every
// row stamped by the author, and a category name the database does not hold
// live refused by name (claude-docs/testing.md, "Fixture factories").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const countOf = async (table: 'spells' | 'spell_ingredients' | 'spell_categories') => {
  const [row] = await sql`select count(*)::int as count from ${sql(table)}`;
  return row.count as number;
};

describe('insertSpell', () => {
  it('writes a spell with a linked and a custom layer and its categories, every row stamped by the author', async () => {
    const ingredientId = await insertIngredient(sql, makeIngredient(), A.id);

    const id = await insertSpell(
      sql,
      makeSpell({
        visibility: 'private',
        categories: ['Protection'],
        layers: [{ ingredientId }, {}],
      }),
      B.id,
    );

    const [spell] = await sql`
      select workspace_id, title, visibility, created_by, updated_by, deleted_at
      from spells where id = ${id}`;
    expect(spell).toEqual({
      workspace_id: WORKSPACE_W_ID,
      title: 'Hearth Warding Jar',
      visibility: 'private',
      created_by: B.id,
      updated_by: B.id,
      deleted_at: null,
    });

    const layers = await sql`
      select layer_order, ingredient_id, name, form, created_by, updated_by
      from spell_ingredients where spell_id = ${id} order by layer_order`;
    expect(layers).toEqual([
      {
        layer_order: 1,
        ingredient_id: ingredientId,
        name: null,
        form: null,
        created_by: B.id,
        updated_by: B.id,
      },
      {
        layer_order: 2,
        ingredient_id: null,
        name: 'Fixture Ash 2',
        form: 'ash',
        created_by: B.id,
        updated_by: B.id,
      },
    ]);

    const categories = await sql`
      select c.name, l.created_by from spell_categories l join categories c on c.id = l.category_id
      where l.spell_id = ${id}`;
    expect(categories).toEqual([{ name: 'Protection', created_by: B.id }]);
  });

  it('refuses a category name the database does not hold live, writing nothing', async () => {
    await expect(
      insertSpell(sql, makeSpell({ categories: ['Fixture Sorcery'] }), A.id),
    ).rejects.toThrow('"Fixture Sorcery"');

    expect(await countOf('spells')).toBe(0);
    expect(await countOf('spell_ingredients')).toBe(0);
    expect(await countOf('spell_categories')).toBe(0);
  });
});
