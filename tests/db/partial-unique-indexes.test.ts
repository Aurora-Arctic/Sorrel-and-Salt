import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { PartialIndexRow, PartialUniqueIndex, Row } from './types';

// Rule 4's other half, once for every table: a unique index carries
// `deleted_at IS NULL`, so a second live row is refused and a soft delete
// frees the slot. A catalogue sweep rather than a pair per schema test, so a
// new partial unique index fails here until it is classified below
// (claude-docs/testing/db-harness.md, "The db test harness").

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A short token no seeded row and no other call holds. */
const token = () => crypto.randomUUID().slice(0, 8);

const stamped = (row: Row): Row => ({ ...row, created_by: AUTHOR, updated_by: AUTHOR });

async function insert(table: string, row: Row): Promise<Row> {
  const [inserted] = await sql<Row[]>`insert into ${sql(table)} ${sql(row as never)} returning *`;
  return inserted;
}

const idOf = async (table: string, row: Row) => (await insert(table, row)).id as string;

// Invented names throughout (M1.25), each carrying a fresh token.

/** A vocabulary row: name, slug, description and a seed key, so both its indexes apply. */
function vocabulary(label: string, extra: Row = {}): Row {
  const t = token();
  return stamped({
    name: `${label} ${t}`,
    slug: `${label.toLowerCase()}-${t}`,
    description: 'A row kept only by fixtures.',
    seed_key: `fixture-${t}`,
    ...extra,
  });
}

const COLOURS = { color_dark: '#c9a66b', color_light: '#7a5a1f' };

const categoryGroup = async () => vocabulary('Testgroup', COLOURS);
const category = async () =>
  vocabulary('Testcategory', { group_id: await idOf('category_groups', await categoryGroup()) });
const formGroup = async () => vocabulary('Testformgroup');
const form = async () =>
  vocabulary('Testform', { group_id: await idOf('ingredient_form_groups', await formGroup()) });
const planet = async () => vocabulary('Testara');
const zodiacSign = async () => vocabulary('Fixturus');
const tradition = async () => vocabulary('Testtradition');
const deity = async () =>
  vocabulary('Testdeity', { tradition_id: await idOf('deity_traditions', await tradition()) });

const reference = async () =>
  stamped({ kind: 'book', title: `A Herbal of Fixture Covens ${token()}`, seed_key: token() });

/** An ingredient with a formal name, in coven W or (`null`) the compendium. */
function ingredient(workspaceId: string | null): () => Promise<Row> {
  return async () => {
    const t = token();
    return stamped({
      workspace_id: workspaceId,
      name: `Testwort ${t}`,
      canonical_name: `Fixtura testalis ${t}`,
      nomenclature: 'botanical',
      form: 'dried',
      slug: `testwort-${t}`,
    });
  };
}
const workspaceIngredient = ingredient(WORKSPACE_W_ID);
const compendiumIngredient = ingredient(null);

let position = 0;
async function ingredientDeity(linked: boolean): Promise<Row> {
  return stamped({
    ingredient_id: await idOf('ingredients', await workspaceIngredient()),
    deity_id: linked ? await idOf('deities', await deity()) : null,
    name: `Testdeity ${token()}`,
    position: position++,
  });
}

async function substitute(linked: boolean): Promise<Row> {
  return stamped({
    ingredient_id: await idOf('ingredients', await workspaceIngredient()),
    substitute_id: linked ? await idOf('ingredients', await workspaceIngredient()) : null,
    name: linked ? null : `Testwort ${token()}`,
  });
}

/** A reference link to a fresh row of `target`, the one subject `reference_links_one_row` allows. */
function referenceLink(column: string, target: string, row: () => Promise<Row>) {
  return async () =>
    stamped({
      reference_id: await idOf('references', await reference()),
      [column]: await idOf(target, await row()),
    });
}

let layer = 0;
async function spellIngredient(linked: boolean): Promise<Row> {
  const spell = stamped({ workspace_id: WORKSPACE_W_ID, title: `Testwort Ward ${token()}` });
  return stamped({
    spell_id: await idOf('spells', spell),
    ingredient_id: linked ? await idOf('ingredients', await workspaceIngredient()) : null,
    name: linked ? null : `Testwort ${token()}`,
    layer_order: layer++,
  });
}

const address = () => `${token()}@partial-unique.test`;

// Keyed by index rather than table: one table's indexes can hold rows on
// opposite sides of a predicate (`deity_id IS NULL` against `IS NOT NULL`).
const ROWS: Record<string, PartialIndexRow> = {
  // `(true)` where open: at most one open pause, whatever it holds.
  admin_role_change_pauses_one_open: { row: async () => stamped({}) },
  categories_seed_key_unique: { row: category },
  categories_slug_unique: { row: category },
  category_groups_seed_key_unique: { row: categoryGroup },
  category_groups_slug_unique: { row: categoryGroup },
  deities_seed_key_unique: { row: deity },
  deities_slug_unique: { row: deity },
  deity_traditions_seed_key_unique: { row: tradition },
  deity_traditions_slug_unique: { row: tradition },
  ingredient_deities_link_unique: { row: () => ingredientDeity(true) },
  ingredient_deities_name_unique: { row: () => ingredientDeity(false) },
  ingredient_deities_position_unique: { row: () => ingredientDeity(false) },
  ingredient_folk_names_unique: {
    row: async () =>
      stamped({
        ingredient_id: await idOf('ingredients', await workspaceIngredient()),
        name: `Fixture-wort ${token()}`,
      }),
  },
  ingredient_form_groups_seed_key_unique: { row: formGroup },
  ingredient_form_groups_slug_unique: { row: formGroup },
  ingredient_forms_seed_key_unique: { row: form },
  ingredient_forms_slug_unique: { row: form },
  ingredient_substitutes_link_unique: { row: () => substitute(true) },
  ingredient_substitutes_name_unique: { row: () => substitute(false) },
  // `canonical_key` is generated: the clash is its formal name and form under
  // another label, which the label index would otherwise refuse first.
  ingredients_compendium_identity_unique: {
    row: compendiumIngredient,
    clash: ['workspace_id', 'canonical_name', 'form'],
  },
  ingredients_compendium_slug_unique: { row: compendiumIngredient },
  ingredients_workspace_identity_unique: {
    row: workspaceIngredient,
    clash: ['workspace_id', 'canonical_name', 'form'],
  },
  ingredients_workspace_label_unique: { row: workspaceIngredient },
  ingredients_workspace_slug_unique: { row: workspaceIngredient },
  inventory_items_workspace_id_ingredient_id_unique: {
    row: async () =>
      stamped({
        workspace_id: WORKSPACE_W_ID,
        ingredient_id: await idOf('ingredients', await workspaceIngredient()),
      }),
  },
  // The site tier, a null pair: the index spans both tiers alike (MB.201).
  invitations_token_hash_unique: {
    row: async () => stamped({ email: address(), token_hash: token() }),
  },
  planets_seed_key_unique: { row: planet },
  planets_slug_unique: { row: planet },
  reference_links_deity_tradition_unique: {
    row: referenceLink('deity_tradition_id', 'deity_traditions', tradition),
  },
  reference_links_deity_unique: { row: referenceLink('deity_id', 'deities', deity) },
  reference_links_ingredient_unique: {
    row: referenceLink('ingredient_id', 'ingredients', compendiumIngredient),
  },
  reference_links_planet_unique: { row: referenceLink('planet_id', 'planets', planet) },
  reference_links_zodiac_sign_unique: {
    row: referenceLink('zodiac_sign_id', 'zodiac_signs', zodiacSign),
  },
  references_seed_key_unique: { row: reference },
  spell_ingredients_spell_id_custom_name_unique: { row: () => spellIngredient(false) },
  spell_ingredients_spell_id_ingredient_id_unique: { row: () => spellIngredient(true) },
  spell_ingredients_spell_id_layer_order_unique: { row: () => spellIngredient(true) },
  users_email_unique: { row: async () => stamped({ name: 'Fixture Person', email: address() }) },
  workspaces_slug_unique: {
    row: async () => {
      const t = token();
      return stamped({ name: `Fixture Coven ${t}`, slug: `fixture-coven-${t}` });
    },
  },
  zodiac_signs_seed_key_unique: { row: zodiacSign },
  zodiac_signs_slug_unique: { row: zodiacSign },
};

/** Every partial unique index in `public`, with each column its key, expressions and predicate read. */
async function partialUniqueIndexes(): Promise<PartialUniqueIndex[]> {
  return await sql<PartialUniqueIndex[]>`
    select ic.relname as index, tc.relname as table,
           array(
             select distinct a.attname from pg_depend d
             join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
             where d.classid = 'pg_class'::regclass and d.objid = i.indexrelid
               and d.refobjsubid > 0
             order by a.attname
           ) as columns
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_class tc on tc.oid = i.indrelid
    join pg_namespace n on n.oid = tc.relnamespace
    where n.nspname = 'public' and i.indisunique and i.indpred is not null
    order by ic.relname
  `;
}

/** What `row` met: the index that refused it, or `admitted`. */
const outcomeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'admitted',
    (error: postgres.PostgresError) =>
      error.code === '23505' ? error.constraint_name : error.message,
  );

/** One index: a holder, a second live row refused by it, and the same row admitted once the holder is soft-deleted. */
async function sweep({ index, table, columns }: PartialUniqueIndex) {
  const { row, clash } = ROWS[index];
  const holder = await insert(table, await row());
  const shared = (clash ?? columns.filter((column) => column !== 'deleted_at')).map((column) => [
    column,
    holder[column],
  ]);
  const second = { ...(await row()), ...Object.fromEntries(shared) };

  const refusedBy = await outcomeOf(insert(table, second));
  await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${holder.id as string}
  `;
  const afterDelete = await outcomeOf(insert(table, second));

  return { index, refusedBy, afterDelete };
}

describe('every partial unique index', () => {
  it('refuses a second live row, and admits it once the holder is soft-deleted (rule 4)', async () => {
    const indexes = await partialUniqueIndexes();

    // Precondition: an empty catalogue would satisfy every comparison below.
    expect(indexes.length).toBeGreaterThan(0);
    // Each is classified, and no row builder outlives its index.
    expect(Object.keys(ROWS).sort()).toEqual(indexes.map(({ index }) => index).sort());

    const outcomes = [];
    for (const index of indexes) {
      outcomes.push(await sweep(index));
    }

    expect(outcomes).toEqual(
      indexes.map(({ index }) => ({ index, refusedBy: index, afterDelete: 'admitted' })),
    );
  });
});
