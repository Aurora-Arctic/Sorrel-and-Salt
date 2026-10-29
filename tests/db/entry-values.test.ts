import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { entryValues } from '@/app/entry-values';
import { toInput } from '@/components/IngredientForm/values';
import { citationText } from '@/lib/citation';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import {
  type IngredientRow,
  createCompendiumEntry,
  createWorkspaceIngredient,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { assertMembership } from '@/modules/coven';
import { A, B, D, E, asUser } from '../support/as-user';
import { curatedDeityId, curatedFormId } from '../support/db/curated-ids';
import { useTestDatabase } from '../support/db/database';
import { liveFolkNames } from '../support/db/folk-names';
import { insertIngredient, insertVariant } from '../support/db/insert-ingredient';
import { insertReference } from '../support/db/insert-reference';
import { makeIngredient } from '../support/fixtures';
import type { CompendiumWrite } from './types';

// src/app/entry-values.ts: the values an edit modal opens with, for the admin's compendium entry or a coven's own.
// They must hold every value and link of the entry, so saving the form untouched changes nothing.

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
  // A form of the substitute, which a substitute may name.
  mockoil = await insertVariant(sql, mockwort, { form: 'Mockoil' }, A.id);
  book = await insertReference(sql, {}, E.id);
});

/** Testwort with every relation an entry can hold, each curated value as the admin picks it, and a form holding every relation a form can. */
const everything = (): CompendiumWrite => ({
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  description: 'An invented herb.',
  folkNames: ['Test Root', 'Fixture Leaf'],
  elements: ['spirit', 'air'],
  celestialBodies: ['Venus', 'Moon'],
  zodiacSigns: ['Taurus'],
  colors: ['Green', 'Pink'],
  deities: [{ deityId: hecate.id }],
  substitutes: [{ ingredientId: mockwort }, { name: 'Testbloom' }],
  safetyNotes: 'Not for eating.',
  toxic: true,
  references: [{ referenceId: book, locator: 'p. 12' }],
  categoryIds: [healing],
  variants: [
    {
      form: 'Herb',
      formId: herb.id,
      description: 'The dried herb.',
      safetyNotes: 'Not for burning.',
      toxic: true,
      elements: ['earth'],
      celestialBodies: ['Saturn'],
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
      toxic: false,
      elements: [],
      celestialBodies: [],
      zodiacSigns: [],
      colors: [],
      categoryIds: [],
      substitutes: [],
      references: [],
    },
  ],
});

async function rowOf(id: string) {
  // `updated_at` is the trigger's and moves on any write, a no-op included.
  // `curator_reviewed_at` moves on a curator's save, untouched or not (tests/modules/ingredients/services/compendium-review.test.ts).
  const [{ updated_at: _updated, curator_reviewed_at: _reviewed, ...row }] =
    await sql`select * from ingredients where id = ${id}`;
  return row;
}

/** What the entry links, live, read past the services, so a link the values dropped shows as one the save took away. */
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
      select id, form, form_id, description, safety_notes, elements, celestial_bodies, zodiac_signs, colors
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
    const values = await entryValues(created, null);
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
          toxic: true,
          elements: ['earth'],
          celestialBodies: [{ value: 'Saturn' }],
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
          // Its own flag, off, beside the entry's on: never read from the entry.
          toxic: false,
          elements: [],
          celestialBodies: [],
          zodiacSigns: [],
          colors: [],
          categoryIds: [],
          substitutes: [],
          references: [],
        },
      ],
      description: 'An invented herb.',
      toxic: true,
      folkNames: expect.arrayContaining([
        { value: 'Test Root', id: expect.any(String) },
        { value: 'Fixture Leaf', id: expect.any(String) },
      ]),
      elements: ['spirit', 'air'],
      celestialBodies: [{ value: 'Venus' }, { value: 'Moon' }],
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
    // Each carries the id of its live row, which promoting it names.
    const live = await liveFolkNames(sql, created.id);
    expect(values.folkNames).toEqual(
      expect.arrayContaining(live.map(({ id, name }) => ({ value: name, id }))),
    );
    expect(values.substitutes).toHaveLength(2);
    expect(values.variants[0]?.substitutes).toHaveLength(2);
  });

  it('opens an edit that, saved untouched, leaves the entry as it was', async () => {
    const before = await entryValues(created, null);
    const row = await rowOf(created.id);
    const children = await childrenOf(created.id);
    // Why "unchanged" could have been something else: the entry holds every relation.
    expect(Object.values(children).every((rows) => rows.length > 0)).toBe(true);

    const saved = await updateCompendiumEntry(admin, created.id, editInput(before));

    expect(await rowOf(saved.id)).toEqual(row);
    expect(await childrenOf(saved.id)).toEqual(children);
    expect(await entryValues(saved, null)).toEqual(before);
  });

  it('reads an entry holding nothing but its identity as the empty lists and blanks', async () => {
    const bare = await createCompendiumEntry(admin, {
      name: 'Testbare',
      nomenclature: 'none',
      canonicalName: null,
    });

    const values = await entryValues(bare, null);

    expect(values).toMatchObject({
      name: 'Testbare',
      nomenclature: 'none',
      canonicalName: '',
      variants: [],
      folkNames: [],
      elements: [],
      celestialBodies: [],
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

describe("entryValues, for a coven's own entry", () => {
  let own: IngredientRow;

  beforeAll(async () => {
    // The coven's own Testwort, written as a member writes it, with a folk
    // name, a category, a curated form and a substitute linking the compendium.
    own = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...everything(),
      name: 'Testwort',
      deities: [],
    });
  });

  it("reads its values for a member, under the coven's proof", async () => {
    const values = await entryValues(own, asUser(B));

    expect(own.workspaceId).toBe(WORKSPACE_W_ID);
    expect(values).toMatchObject({
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      folkNames: expect.arrayContaining([{ value: 'Test Root', id: expect.any(String) }]),
      categoryIds: [healing],
      variants: expect.arrayContaining([
        expect.objectContaining({
          form: 'Herb',
          formLink: expect.objectContaining({ id: herb.id }),
        }),
      ]),
    });
  });

  it('opens an edit that, saved untouched through the coven, leaves the entry as it was', async () => {
    const before = await entryValues(own, asUser(B));
    const row = await rowOf(own.id);
    const children = await childrenOf(own.id);

    const saved = await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      own.id,
      editInput(before),
    );

    expect(await rowOf(saved.id)).toEqual(row);
    expect(await childrenOf(saved.id)).toEqual(children);
    expect(await entryValues(saved, asUser(B))).toEqual(before);
  });

  it("refuses another coven's member by direct id", async () => {
    // Why it could have succeeded: the row is live, D is an owner (of X), and
    // B's same read answers.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] }),
    ).resolves.toBeDefined();
    expect((await rowOf(own.id)).deleted_at).toBeNull();
    await expect(entryValues(own, asUser(B))).resolves.toBeDefined();

    await expect(entryValues(own, asUser(D))).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a read with no session', async () => {
    await expect(entryValues(own, null)).rejects.toBeInstanceOf(Forbidden);
  });
});
