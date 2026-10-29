import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { PartialIndexRow, PartialUniqueIndex, Row } from './types';

// Every unique index carries `deleted_at IS NULL`: a second live row is refused and a soft delete frees the slot.
// A catalogue sweep, so a new partial unique index fails here until classified below
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

// Invented names throughout, each carrying a fresh token.

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
const celestialBody = async () => vocabulary('Testara');
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
      slug: `testwort-${t}`,
    });
  };
}
const workspaceIngredient = ingredient(WORKSPACE_W_ID);
const compendiumIngredient = ingredient(null);
/** A compendium entry as the compendium seed writes it, under the key it gave. */
const seededIngredient = async () => ({
  ...(await compendiumIngredient()),
  seed_key: `fixture-${token()}`,
});

/** A variant of a fresh ingredient, under a form no other row holds. */
async function variant(): Promise<Row> {
  return stamped({
    ingredient_id: await idOf('ingredients', await workspaceIngredient()),
    form: `Testleaf ${token()}`,
  });
}

let position = 0;
async function ingredientDeity(linked: boolean): Promise<Row> {
  return stamped({
    ingredient_id: await idOf('ingredients', await workspaceIngredient()),
    deity_id: linked ? await idOf('deities', await deity()) : null,
    name: `Testdeity ${token()}`,
    position: position++,
  });
}

/** A fresh coven ingredient and a form of it, for a row keyed on the variant. */
async function formed(): Promise<{ ingredient_id: string; variant_id: string }> {
  const ingredientId = await idOf('ingredients', await workspaceIngredient());
  const variantId = await idOf(
    'ingredient_variants',
    stamped({ ingredient_id: ingredientId, form: `Testleaf ${token()}` }),
  );
  return { ingredient_id: ingredientId, variant_id: variantId };
}

/** A category pair, on the parent or on one of its forms. */
async function categoryPair(onForm: boolean): Promise<Row> {
  const { ingredient_id, variant_id } = await formed();
  return stamped({
    ingredient_id,
    variant_id: onForm ? variant_id : null,
    category_id: await idOf('categories', await category()),
  });
}

/** A substitute row standing in for one form of its ingredient. */
async function formSubstitute(linked: boolean): Promise<Row> {
  return stamped({
    ...(await formed()),
    substitute_id: linked ? await idOf('ingredients', await workspaceIngredient()) : null,
    name: linked ? null : `Testwort ${token()}`,
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
async function spellStep(linked: boolean): Promise<Row> {
  const spell = stamped({ workspace_id: WORKSPACE_W_ID, title: `Testwort Ward ${token()}` });
  const layered = linked ? await formed() : { ingredient_id: null, variant_id: null };
  const at = layer++;
  return stamped({
    spell_id: await idOf('spells', spell),
    ...layered,
    name: linked ? null : `Testwort ${token()}`,
    position: at,
  });
}

/** A compendium entry's presence in coven W's cupboard, with no overrides. */
async function cupboardEntry(): Promise<Row> {
  return stamped({
    workspace_id: WORKSPACE_W_ID,
    ingredient_id: await idOf('ingredients', await compendiumIngredient()),
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
  celestial_bodies_seed_key_unique: { row: celestialBody },
  celestial_bodies_slug_unique: { row: celestialBody },
  deities_seed_key_unique: { row: deity },
  deities_slug_unique: { row: deity },
  deity_other_names_unique: {
    row: async () =>
      stamped({ deity_id: await idOf('deities', await deity()), name: `Testarion ${token()}` }),
  },
  deity_traditions_seed_key_unique: { row: tradition },
  deity_traditions_slug_unique: { row: tradition },
  ingredient_deities_link_unique: { row: () => ingredientDeity(true) },
  ingredient_deities_name_unique: { row: () => ingredientDeity(false) },
  ingredient_deities_position_unique: { row: () => ingredientDeity(false) },
  // The pair, on the parent or on a form: hard-deleted, so partial on the
  // variant rather than a tombstone.
  ingredient_categories_ingredient_category_unique: {
    row: () => categoryPair(false),
    hardDeleted: true,
  },
  ingredient_categories_variant_category_unique: {
    row: () => categoryPair(true),
    clash: ['ingredient_id', 'variant_id', 'category_id'],
    hardDeleted: true,
  },
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
  // A form's own list: the clash carries the ingredient, which the
  // composite key would otherwise refuse first.
  ingredient_substitutes_variant_link_unique: {
    row: () => formSubstitute(true),
    clash: ['ingredient_id', 'variant_id', 'substitute_id'],
  },
  ingredient_substitutes_variant_name_unique: {
    row: () => formSubstitute(false),
    clash: ['ingredient_id', 'variant_id', 'name'],
  },
  ingredient_variants_form_unique: { row: variant },
  // `identity_key` is generated: the clash is the formal name alone, under
  // another label, which the label index would otherwise refuse first.
  ingredients_compendium_identity_key_unique: {
    row: compendiumIngredient,
    clash: ['workspace_id', 'canonical_name'],
  },
  ingredients_compendium_slug_unique: { row: compendiumIngredient },
  ingredients_seed_key_unique: { row: seededIngredient },
  ingredients_workspace_identity_key_unique: {
    row: workspaceIngredient,
    clash: ['workspace_id', 'canonical_name'],
  },
  ingredients_workspace_label_unique: { row: workspaceIngredient },
  ingredients_workspace_slug_unique: { row: workspaceIngredient },
  inventory_items_workspace_id_variant_id_unique: {
    row: async () => stamped({ workspace_id: WORKSPACE_W_ID, ...(await formed()) }),
    clash: ['workspace_id', 'ingredient_id', 'variant_id'],
  },
  // The site tier, a null pair: the index spans both tiers alike.
  invitations_token_hash_unique: {
    row: async () => stamped({ email: address(), token_hash: token(), site_role: 'admin' }),
  },
  reference_links_celestial_body_unique: {
    row: referenceLink('celestial_body_id', 'celestial_bodies', celestialBody),
  },
  reference_links_deity_tradition_unique: {
    row: referenceLink('deity_tradition_id', 'deity_traditions', tradition),
  },
  reference_links_deity_unique: { row: referenceLink('deity_id', 'deities', deity) },
  reference_links_ingredient_unique: {
    row: referenceLink('ingredient_id', 'ingredients', compendiumIngredient),
  },
  reference_links_ingredient_variant_unique: {
    row: referenceLink('ingredient_variant_id', 'ingredient_variants', variant),
  },
  reference_links_zodiac_sign_unique: {
    row: referenceLink('zodiac_sign_id', 'zodiac_signs', zodiacSign),
  },
  references_seed_key_unique: { row: reference },
  spell_steps_spell_id_custom_name_unique: { row: () => spellStep(false) },
  spell_steps_spell_id_position_unique: { row: () => spellStep(true) },
  users_email_unique: { row: async () => stamped({ name: 'Fixture Person', email: address() }) },
  workspaces_slug_unique: {
    row: async () => {
      const t = token();
      return stamped({ name: `Fixture Coven ${t}`, slug: `fixture-coven-${t}` });
    },
  },
  // A fresh compendium entry in coven W; the label index's clash is the coven and the
  // label alone, under another entry, which the entry index would otherwise refuse first.
  workspace_compendium_entries_workspace_ingredient_unique: { row: cupboardEntry },
  workspace_compendium_entries_workspace_label_unique: {
    row: async () => ({ ...(await cupboardEntry()), label: `Testleaf ${token()}` }),
    clash: ['workspace_id', 'label'],
  },
  zodiac_signs_seed_key_unique: { row: zodiacSign },
  zodiac_signs_slug_unique: { row: zodiacSign },
};

// The unique indexes a soft-deleted table may carry without the predicate,
// each named with why: rule 4's exceptions are decided here, never found.
const NOT_PARTIAL: Record<string, string> = {
  // The target of the composite foreign keys, which a partial index cannot be; it reserves nothing the
  // primary key on `id` does not.
  ingredient_variants_id_ingredient_id_unique: 'ingredient_variants',
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
  const { row, clash, hardDeleted } = ROWS[index];
  const holder = await insert(table, await row());
  const shared = (clash ?? columns.filter((column) => column !== 'deleted_at')).map((column) => [
    column,
    holder[column],
  ]);
  const second = { ...(await row()), ...Object.fromEntries(shared) };

  const refusedBy = await outcomeOf(insert(table, second));
  if (hardDeleted) {
    // No id and no tombstone: the holder is the one row sharing every column the second does.
    await sql`
      delete from ${sql(table)}
      where ${shared.reduce(
        (where, [column, value], at) =>
          sql`${where} ${at === 0 ? sql`` : sql`and`} ${sql(column as string)} is not distinct from ${value as string | null}`,
        sql``,
      )}
    `;
  } else {
    await sql`
      update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${holder.id as string}
    `;
  }
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

describe('every seed-key index', () => {
  it('leaves the rows no seed wrote unconstrained, however many there are (MB.171)', async () => {
    const indexes = (await partialUniqueIndexes()).filter(({ index }) =>
      index.endsWith('_seed_key_unique'),
    );

    // Precondition: the nine vocabulary and reference tables, and the compendium.
    expect(indexes.map(({ table }) => table)).toContain('ingredients');

    const outcomes = [];
    for (const { index, table } of indexes) {
      const keyless = async () => ({ ...(await ROWS[index].row()), seed_key: null });
      await insert(table, await keyless());
      outcomes.push({ index, second: await outcomeOf(insert(table, await keyless())) });
    }

    expect(outcomes).toEqual(indexes.map(({ index }) => ({ index, second: 'admitted' })));
  });
});

describe('every unique index on a soft-deleted table', () => {
  it('is partial, but for the named exceptions (rule 4)', async () => {
    const unpartial = await sql<{ index: string; table: string }[]>`
      select ic.relname as index, tc.relname as table
      from pg_index i
      join pg_class ic on ic.oid = i.indexrelid
      join pg_class tc on tc.oid = i.indrelid
      join pg_namespace n on n.oid = tc.relnamespace
      where n.nspname = 'public' and i.indisunique and not i.indisprimary
        and i.indpred is null
        and exists (
          select 1 from pg_attribute a
          where a.attrelid = tc.oid and a.attname = 'deleted_at' and not a.attisdropped
        )
      order by ic.relname
    `;

    // Non-empty by NOT_PARTIAL's own entries, so an empty scan fails too.
    expect(Object.fromEntries(unpartial.map(({ index, table }) => [index, table]))).toEqual(
      NOT_PARTIAL,
    );
  });
});
