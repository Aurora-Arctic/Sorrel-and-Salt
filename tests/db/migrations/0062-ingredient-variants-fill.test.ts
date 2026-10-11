import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// migration data tests, retired once `0062` is in production's journal. They
// re-run the migration's own fill and guard against rows written here, rather
// than a copy of either; the tables' shape is the schema tests'.

/** `0062`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = readFileSync(
  fromRoot('src/db/migrations/0062_ingredient-variants-fill.sql'),
  'utf8',
)
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

function statementStarting(prefix: string): string {
  const found = STATEMENTS.find((statement) => statement.startsWith(prefix));
  if (!found) throw new Error(`0062 has no statement starting ${prefix}`);
  return found;
}

const FILL = statementStarting('INSERT INTO "ingredient_variants"');
const GUARD = statementStarting('DO $$');

const AUTHOR = FIXTURE_USERS.A.id;
const EDITOR = FIXTURE_USERS.B.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A fresh ingredient under an invented formal name, written by A. */
async function anIngredient(overrides: Parameters<typeof makeIngredient>[0] = {}) {
  const t = crypto.randomUUID().slice(0, 8);
  return insertIngredient(
    sql,
    makeIngredient({ name: `Testwort ${t}`, canonicalName: `Fixtura testalis ${t}`, ...overrides }),
    AUTHOR,
  );
}

describe('0062: the fill', () => {
  let padded: string;
  let picked: string;
  let formless: string;
  let deleted: string;
  let pick: string;

  beforeAll(async () => {
    [{ id: pick }] = await sql`
      select id from ingredient_forms where deleted_at is null order by name limit 1
    `;
    padded = await anIngredient({ form: '  Testleaf  ', description: 'Kept on the entry.' });
    picked = await anIngredient({ workspaceId: WORKSPACE_W_ID, form: 'Testroot', formId: pick });
    formless = await anIngredient({ form: null });
    deleted = await anIngredient({ form: 'Testbark' });
    // The last editor is B, not the author: the variant is stamped as B.
    await sql`update ingredients set updated_by = ${EDITOR} where id in ${sql([padded, picked])}`;
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${EDITOR}, updated_by = ${EDITOR}
      where id = ${deleted}
    `;

    // The migrated database as the fill met it: no variant yet.
    await sql`truncate ingredient_variants`;
    await sql.unsafe(FILL);
  });

  it('gives every row with a form exactly one variant, and a row without one none', async () => {
    const rows = await sql`
      select i.form is not null as has_form, count(v.id)::int as variants
      from ingredients i left join ingredient_variants v on v.ingredient_id = i.id
      group by i.id
    `;

    // Precondition: both kinds of row are there, seeded entries among them.
    expect(rows.filter((row) => row.has_form).length).toBeGreaterThan(3);
    expect(rows.some((row) => !row.has_form)).toBe(true);
    expect(rows.filter((row) => row.variants !== (row.has_form ? 1 : 0))).toEqual([]);
  });

  it("carries the row's trimmed form and its pick, stamped as its last editor, and nothing else", async () => {
    const variants = await sql`
      select ingredient_id, form, form_id, description, elements, created_by, updated_by, deleted_at
      from ingredient_variants where ingredient_id in ${sql([padded, picked, formless, deleted])}
      order by form
    `;

    expect(variants).toEqual([
      {
        ingredient_id: deleted,
        form: 'Testbark',
        form_id: null,
        description: null,
        elements: null,
        created_by: EDITOR,
        updated_by: EDITOR,
        deleted_at: null,
      },
      {
        ingredient_id: padded,
        form: 'Testleaf',
        form_id: null,
        description: null,
        elements: null,
        created_by: EDITOR,
        updated_by: EDITOR,
        deleted_at: null,
      },
      {
        ingredient_id: picked,
        form: 'Testroot',
        form_id: pick,
        description: null,
        elements: null,
        created_by: EDITOR,
        updated_by: EDITOR,
        deleted_at: null,
      },
    ]);
  });
});

describe('0062: the guard', () => {
  beforeAll(async () => {
    // The database as the guard met it: the indexes it protects come after it.
    await sql`drop index ingredients_compendium_identity_key_unique`;
    await sql`drop index ingredients_workspace_identity_key_unique`;
  });

  it('passes a database holding one formal name once per tier, the same name in two tiers included', async () => {
    const t = crypto.randomUUID().slice(0, 8);
    await anIngredient({ canonicalName: `Fixtura bitieria ${t}`, form: 'Testleaf' });
    await anIngredient({
      workspaceId: WORKSPACE_W_ID,
      canonicalName: `Fixtura bitieria ${t}`,
      form: 'Testroot',
    });

    await expect(sql.unsafe(GUARD)).resolves.toBeDefined();
  });

  it('refuses two live entries of one formal name in a tier, naming the procedure, and passes once one is deleted', async () => {
    const t = crypto.randomUUID().slice(0, 8);
    await anIngredient({ canonicalName: `Fixtura duplex ${t}`, form: 'Testleaf' });
    const second = await anIngredient({ canonicalName: `Fixtura duplex ${t}`, form: 'Testroot' });

    const error = await failureOf(sql.unsafe(GUARD));

    // P0001 is raise_exception: the guard's own refusal, not a constraint's.
    expect(error.code).toBe('P0001');
    expect(error.hint).toEqual(expect.stringContaining('Merging a group'));

    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${second}
    `;
    await expect(sql.unsafe(GUARD)).resolves.toBeDefined();
  });
});
