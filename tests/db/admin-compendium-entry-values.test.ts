import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { entryValues } from '@/app/(shell)/admin/compendium/entry-values';
import { toInput } from '@/components/IngredientForm/values';
import { citationText } from '@/lib/citation';
import {
  type IngredientRow,
  createCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { A, E, asUser } from '../support/as-user';
import { curatedDeityId, curatedFormId } from '../support/db/curated-ids';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient, insertVariant } from '../support/db/insert-ingredient';
import { insertReference } from '../support/db/insert-reference';
import { makeIngredient } from '../support/fixtures';
import type { CompendiumWrite } from './types';

// src/app/(shell)/admin/compendium/entry-values.ts: the values `/admin/compendium`'s
// edit modal opens with, read from the database. What they must hold is every
// value and link of the entry, so that saving the form untouched sends the
// entry back as it was: an edit that changes nothing changes nothing.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const admin = asUser(E);

/** The curated rows the entry picks, and what each is filed under, read from the seed. */
let herb: { id: string; group: string };
let oil: string;
let hecate: { id: string; tradition: string };
let healing: string;
let mockwort: string;
let mockoil: string;
let book: string;

beforeAll(async () => {
  const formId = await curatedFormId(sql, 'Herb');
  const [form] = await sql`
    select ingredient_form_groups.name from ingredient_forms
    join ingredient_form_groups on ingredient_form_groups.id = ingredient_forms.group_id
    where ingredient_forms.id = ${formId}`;
  herb = { id: formId, group: form.name as string };
  oil = await curatedFormId(sql, 'Oil');

  const deityId = await curatedDeityId(sql, 'Hecate');
  const [deity] = await sql`
    select deity_traditions.name from deities
    join deity_traditions on deity_traditions.id = deities.tradition_id
    where deities.id = ${deityId}`;
  hecate = { id: deityId, tradition: deity.name as string };

  const [category] = await sql`
    select id from categories where name = 'Healing' and deleted_at is null`;
  healing = category.id as string;

  // The substitute's entry and the source, seeded rather than written by the code under test.
  mockwort = await insertIngredient(
    sql,
    makeIngredient({ name: 'Mockwort', canonicalName: 'Fixtura mockalis' }),
    A.id,
  );
  // A form of the substitute, which a substitute may name (MB.215).
  mockoil = await insertVariant(sql, mockwort, { form: 'Mockoil' }, A.id);
  book = await insertReference(sql, {}, E.id);
});

/**
 * Testwort with every relation an entry can hold, each curated value as the
 * admin picks it, and a form holding every relation a form can.
 */
const everything = (): CompendiumWrite => ({
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  description: 'An invented herb.',
  folkNames: ['Test Root', 'Fixture Leaf'],
  elements: ['spirit', 'air'],
  planets: ['Venus', 'Moon'],
  zodiacSigns: ['Taurus'],
  colors: ['Green', 'Pink'],
  deities: [{ deityId: hecate.id }],
  substitutes: [{ ingredientId: mockwort }, { name: 'Testbloom' }],
  safetyNotes: 'Not for eating.',
  references: [{ referenceId: book, locator: 'p. 12' }],
  categoryIds: [healing],
  variants: [
    {
      form: 'Herb',
      formId: herb.id,
      description: 'The dried herb.',
      safetyNotes: 'Not for burning.',
      elements: ['earth'],
      planets: ['Saturn'],
      zodiacSigns: ['Virgo'],
      colors: ['Brown'],
      categoryIds: [healing],
      substitutes: [{ ingredientId: mockwort, substituteVariantId: mockoil }, { name: 'Testleaf' }],
      references: [{ referenceId: book, locator: 'p. 40' }],
    },
    // A form adding nothing but itself, read back as blanks and empty lists.
    {
      form: 'Oil',
      formId: oil,
      description: '',
      safetyNotes: '',
      elements: [],
      planets: [],
      zodiacSigns: [],
      colors: [],
      categoryIds: [],
      substitutes: [],
      references: [],
    },
  ],
});

async function rowOf(id: string) {
  // `updated_at` is the trigger's, and moves on any write, a no-op included.
  const [{ updated_at: _updated, ...row }] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

/**
 * What the entry links, live, read past the services the values are read
 * through: so a link those values dropped would show here as one the save
 * took away, where comparing the values alone would miss it.
 */
async function childrenOf(id: string) {
  const [folkNames, substitutes, deities, references, categories, variants, variantReferences] =
    await Promise.all([
      sql`
      select name from ingredient_folk_names
      where ingredient_id = ${id} and deleted_at is null order by name`,
      sql`
      select substitute_id, name, variant_id is not null as for_form from ingredient_substitutes
      where ingredient_id = ${id} and deleted_at is null order by variant_id nulls first, name, substitute_id`,
      sql`
      select deity_id, name from ingredient_deities
      where ingredient_id = ${id} and deleted_at is null order by name`,
      sql`
      select reference_id, locator from reference_links
      where ingredient_id = ${id} and deleted_at is null order by reference_id`,
      sql`
      select category_id, variant_id from ingredient_categories
      where ingredient_id = ${id} order by variant_id nulls first`,
      // `updated_at` is the trigger's, as the row's is.
      sql`
      select id, form, form_id, description, safety_notes, elements, planets, zodiac_signs, colors
      from ingredient_variants where ingredient_id = ${id} and deleted_at is null`,
      sql`
      select reference_id, locator from reference_links
      join ingredient_variants on ingredient_variants.id = reference_links.ingredient_variant_id
      where ingredient_variants.ingredient_id = ${id} and reference_links.deleted_at is null`,
    ]);
  return {
    folkNames,
    substitutes,
    deities,
    references,
    categories,
    variants,
    variantReferences,
  };
}

/** The input the form sends for an edit, as IngredientForm's mutation builds it. */
function editInput(values: Parameters<typeof toInput>[0]): CompendiumWrite {
  return toInput(values) as CompendiumWrite;
}

describe('entryValues', () => {
  let created: IngredientRow;

  beforeAll(async () => {
    created = await createCompendiumEntry(admin, everything());
  });

  it('reads every value and link of the entry as the form shows it', async () => {
    const values = await entryValues(created);
    // insertReference's default book, as a row links it.
    const BOOK_LINK = {
      id: book,
      isGlobal: true,
      kind: 'book',
      title: 'A Herbal of Fixture Covens',
      authors: null,
      container: null,
    };

    expect(values).toMatchObject({
      name: 'Testwort',
      nomenclature: 'botanical',
      canonicalName: 'Fixtura testalis',
      variants: [
        {
          variantId: expect.any(String),
          form: 'Herb',
          formLink: { id: herb.id, name: 'Herb', group: herb.group },
          description: 'The dried herb.',
          safetyNotes: 'Not for burning.',
          elements: ['earth'],
          planets: [{ value: 'Saturn' }],
          zodiacSigns: [{ value: 'Virgo' }],
          colors: [{ value: 'Brown' }],
          categoryIds: [healing],
          substitutes: expect.arrayContaining([
            {
              value: 'Mockwort',
              // Its forms, which the second picker offers, and the one named.
              link: expect.objectContaining({
                id: mockwort,
                variants: expect.arrayContaining([{ id: mockoil, form: 'Mockoil', group: null }]),
              }),
              variantId: mockoil,
            },
            { value: 'Testleaf' },
          ]),
          references: [expect.objectContaining({ link: BOOK_LINK, locator: 'p. 40' })],
        },
        {
          variantId: expect.any(String),
          form: 'Oil',
          formLink: expect.objectContaining({ id: oil, name: 'Oil' }),
          description: '',
          safetyNotes: '',
          elements: [],
          planets: [],
          zodiacSigns: [],
          colors: [],
          categoryIds: [],
          substitutes: [],
          references: [],
        },
      ],
      description: 'An invented herb.',
      folkNames: expect.arrayContaining([{ value: 'Test Root' }, { value: 'Fixture Leaf' }]),
      elements: ['spirit', 'air'],
      planets: [{ value: 'Venus' }, { value: 'Moon' }],
      zodiacSigns: [{ value: 'Taurus' }],
      colors: [{ value: 'Green' }, { value: 'Pink' }],
      deities: [{ value: 'Hecate', link: { id: hecate.id, tradition: hecate.tradition } }],
      substitutes: expect.arrayContaining([
        {
          value: 'Mockwort',
          link: expect.objectContaining({
            id: mockwort,
            canonicalName: 'Fixtura mockalis',
            isGlobal: true,
          }),
        },
        { value: 'Testbloom' },
      ]),
      safetyNotes: 'Not for eating.',
      references: [
        {
          // insertReference's default book.
          value: citationText({
            kind: 'book',
            title: 'A Herbal of Fixture Covens',
            published: '1988',
          }),
          // With the fields its short form is made of.
          link: BOOK_LINK,
          locator: 'p. 12',
        },
      ],
      categoryIds: [healing],
    });
    expect(values.folkNames).toHaveLength(2);
    expect(values.substitutes).toHaveLength(2);
    expect(values.variants[0]?.substitutes).toHaveLength(2);
  });

  it('opens an edit that, saved untouched, leaves the entry as it was', async () => {
    const before = await entryValues(created);
    const row = await rowOf(created.id);
    const children = await childrenOf(created.id);
    // Why "unchanged" could have been something else: the entry holds every relation.
    expect(Object.values(children).every((rows) => rows.length > 0)).toBe(true);

    const saved = await updateCompendiumEntry(admin, created.id, editInput(before));

    expect(await rowOf(saved.id)).toEqual(row);
    expect(await childrenOf(saved.id)).toEqual(children);
    expect(await entryValues(saved)).toEqual(before);
  });

  it('reads an entry holding nothing but its identity as the empty lists and blanks', async () => {
    const bare = await createCompendiumEntry(admin, {
      name: 'Testbare',
      nomenclature: 'none',
      canonicalName: null,
    });

    const values = await entryValues(bare);

    expect(values).toMatchObject({
      name: 'Testbare',
      nomenclature: 'none',
      canonicalName: '',
      variants: [],
      folkNames: [],
      elements: [],
      planets: [],
      deities: [],
      substitutes: [],
      references: [],
      categoryIds: [],
    });
    const row = await rowOf(bare.id);
    await updateCompendiumEntry(admin, bare.id, editInput(values));
    expect(await rowOf(bare.id)).toEqual(row);
  });
});
