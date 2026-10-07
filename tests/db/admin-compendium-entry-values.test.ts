import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { entryValues } from '@/app/admin/compendium/entry-values';
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
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertReference } from '../support/db/insert-reference';
import { makeIngredient } from '../support/fixtures';
import type { CompendiumWrite } from './types';

// src/app/admin/compendium/entry-values.ts: the values `/admin/compendium`'s
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
let hecate: { id: string; tradition: string };
let healing: string;
let mockwort: string;
let book: string;

beforeAll(async () => {
  const formId = await curatedFormId(sql, 'Herb');
  const [form] = await sql`
    select ingredient_form_groups.name from ingredient_forms
    join ingredient_form_groups on ingredient_form_groups.id = ingredient_forms.group_id
    where ingredient_forms.id = ${formId}`;
  herb = { id: formId, group: form.name as string };

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
  book = await insertReference(sql, {}, E.id);
});

/** Testwort with every relation an entry can hold, each curated value as the admin picks it. */
const everything = (): CompendiumWrite => ({
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  form: 'Herb',
  formId: herb.id,
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
  const [folkNames, substitutes, deities, references, categories] = await Promise.all([
    sql`
      select name from ingredient_folk_names
      where ingredient_id = ${id} and deleted_at is null order by name`,
    sql`
      select substitute_id, name from ingredient_substitutes
      where ingredient_id = ${id} and deleted_at is null order by name`,
    sql`
      select deity_id, name from ingredient_deities
      where ingredient_id = ${id} and deleted_at is null order by name`,
    sql`
      select reference_id, locator from reference_links
      where ingredient_id = ${id} and deleted_at is null order by reference_id`,
    sql`select category_id from ingredient_categories where ingredient_id = ${id}`,
  ]);
  return { folkNames, substitutes, deities, references, categories };
}

/** The input the form sends for an edit, as IngredientForm's mutation builds it. */
function editInput(values: Parameters<typeof toInput>[0]): CompendiumWrite {
  const input = toInput(values);
  // The update takes every field present, a pick of no form as `""` (MB.159).
  return { ...input, formId: input.formId ?? '' } as CompendiumWrite;
}

describe('entryValues', () => {
  let created: IngredientRow;

  beforeAll(async () => {
    created = await createCompendiumEntry(admin, everything());
  });

  it('reads every value and link of the entry as the form shows it', async () => {
    const values = await entryValues(created);

    expect(values).toMatchObject({
      name: 'Testwort',
      nomenclature: 'botanical',
      canonicalName: 'Fixtura testalis',
      form: 'Herb',
      formLink: { id: herb.id, name: 'Herb', group: herb.group },
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
          link: { id: book, isGlobal: true },
          locator: 'p. 12',
        },
      ],
      categoryIds: [healing],
    });
    expect(values.folkNames).toHaveLength(2);
    expect(values.substitutes).toHaveLength(2);
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
      form: '',
      formLink: null,
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
