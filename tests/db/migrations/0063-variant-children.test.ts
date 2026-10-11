import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// migration data tests, retired once `0063` is in production's journal. They
// re-run the migration's own guard and fill of `spell_ingredients.variant_id`
// against layers written here, on the table as the fill met it: the column
// there, the CHECK requiring it not yet.

/** `0063`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = readFileSync(fromRoot('src/db/migrations/0063_variant-children.sql'), 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

function statementStarting(prefix: string): string {
  const found = STATEMENTS.find((statement) => statement.startsWith(prefix));
  if (!found) throw new Error(`0063 has no statement starting ${prefix}`);
  return found;
}

const GUARD = statementStarting('DO $$');
const FILL = statementStarting('UPDATE "spell_ingredients"');

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

let spellId: string;
let depth = 0;

/** A fresh coven ingredient under an invented formal name; a form gives it a variant. */
async function anIngredient(form: string | null): Promise<string> {
  const t = crypto.randomUUID().slice(0, 8);
  return insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: `Testwort ${t}`,
      canonicalName: `Fixtura testalis ${t}`,
      form,
    }),
    AUTHOR,
  );
}

/** A layer as it stood before 0063: linked or custom, with no variant. */
async function layer(ingredientId: string | null, removed = false): Promise<string> {
  const [row] = await sql`
    insert into spell_ingredients ${sql({
      spell_id: spellId,
      ingredient_id: ingredientId,
      name: ingredientId === null ? `Fixture Ash ${depth}` : null,
      layer_order: ++depth,
      deleted_at: removed ? new Date() : null,
      deleted_by: removed ? AUTHOR : null,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id`;
  return row.id as string;
}

const variantsOf = async (ids: string[]) =>
  (
    await sql`
      select si.id, si.variant_id, v.ingredient_id as variant_ingredient
      from spell_ingredients si left join ingredient_variants v on v.id = si.variant_id
      where si.id in ${sql(ids)} order by si.layer_order
    `
  ).map((row) => [row.id, row.variant_id === null ? null : row.variant_ingredient]);

beforeAll(async () => {
  await sql`alter table spell_ingredients drop constraint spell_ingredients_variant_with_ingredient`;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
  const [spell] = await sql`
    insert into spells (workspace_id, title, created_by, updated_by)
    values (${WORKSPACE_W_ID}, 'Fixture Rite', ${AUTHOR}, ${AUTHOR}) returning id`;
  spellId = spell.id as string;
});

describe('0063: the layer fill', () => {
  it("names each linked layer's ingredient's one live variant, a removed layer's too, and a custom layer none", async () => {
    const herb = await anIngredient('Testleaf');
    const root = await anIngredient('Testroot');
    // A deleted ingredient keeps its variant (0062), so its layer still fills.
    const gone = await anIngredient('Testbark');
    await sql`update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${gone}`;
    const layers = [
      await layer(herb),
      await layer(root, true),
      await layer(gone),
      await layer(null),
    ];

    await sql.unsafe(GUARD);
    await sql.unsafe(FILL);

    expect(await variantsOf(layers)).toEqual([
      [layers[0], herb],
      [layers[1], root],
      [layers[2], gone],
      [layers[3], null],
    ]);
  });
});

describe('0063: the guard', () => {
  it('refuses a linked layer whose ingredient has no live variant', async () => {
    await layer(await anIngredient(null));

    const error = await failureOf(sql.unsafe(GUARD));

    // P0001 is raise_exception: the guard's own refusal, not a constraint's.
    expect(error.code).toBe('P0001');
  });

  it('refuses a linked layer whose ingredient has several, and passes once one is removed', async () => {
    const ingredientId = await anIngredient('Testleaf');
    const [second] = await sql`
      insert into ingredient_variants ${sql({
        ingredient_id: ingredientId,
        form: 'Testoil',
        created_by: AUTHOR,
        updated_by: AUTHOR,
      })}
      returning id`;
    await layer(ingredientId);

    const error = await failureOf(sql.unsafe(GUARD));
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${AUTHOR}
      where id = ${second.id as string}`;

    expect(error.code).toBe('P0001');
    await expect(sql.unsafe(GUARD)).resolves.toBeDefined();
  });
});
