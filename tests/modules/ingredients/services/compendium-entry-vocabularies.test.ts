import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import {
  createWorkspaceIngredient,
  createCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { A, B, E, asUser } from '../../../support/as-user';
import { curatedDeityId, curatedFormId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference } from '../../../support/db/insert-reference';
import { liveFormsOf, variantChildrenOf, variantRowsOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  type VariantInput,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../../../support/fixtures';
import { useCompendiumEntryInput } from '../../../support/db/compendium-entry-input';

// Story 17's service, its vocabulary half: what a compendium entry's curated
// lists and forms are held to (claude-docs/db/compendium-writes.md). Split from
// compendium-entries.test.ts, which holds the writes. The table is emptied per
// test, so every row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const entry = useCompendiumEntryInput(() => sql);

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (overrides: Overrides<IngredientFixture> = {}) =>
  insertIngredient(sql, makeIngredient(overrides), A.id);

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

const admin = asUser(E);

// MB.162, moved onto the links by MB.167: a compendium entry's form and
// deities each pick a curated row, and its celestial bodies and signs name one, where a
// coven's ingredients keep free text (claude-docs/db/compendium-writes.md).
// Retired vocabulary rows are put back after each test, since the clone is
// shared by the file and the seed retires nothing.
describe('the curated vocabularies a compendium entry is held to', () => {
  afterEach(async () => {
    for (const table of [
      'ingredient_forms',
      'ingredient_form_groups',
      'celestial_bodies',
      'zodiac_signs',
      'deities',
      'deity_traditions',
    ]) {
      await sql`update ${sql(table)} set deleted_at = null, deleted_by = null where deleted_at is not null`;
    }
  });

  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  async function retire(table: string, name: string) {
    const rows = await sql`
      update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id}
      where name = ${name} returning id`;
    // Why the value could have saved: it names a curated row, retired here.
    expect(rows).toHaveLength(1);
  }

  /** Saves `input` on a coven's ingredient: the precondition that only the tier refuses it. */
  async function savesInACoven(input: Parameters<typeof createCompendiumEntry>[1]) {
    const saved = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...input,
      name: 'Testwort, kept',
    });
    expect(saved.workspaceId).toBe(WORKSPACE_W_ID);
    return saved;
  }

  const compendiumCount = async () => {
    const [row] = await sql`select count(*)::int as n from ingredients where workspace_id is null`;
    return row.n as number;
  };

  const liveDeities = async (ingredientId: string) =>
    sql`
      select deity_id, name from ingredient_deities
      where ingredient_id = ${ingredientId} and deleted_at is null order by position`;

  // A curated value before the stranger in each list, so the refusal is
  // placed at the entry rather than the field.
  const UNCURATED: [string, Overrides<IngredientFixture>, (string | number)[], string][] = [
    [
      'celestialBodies',
      { celestialBodies: ['Venus', 'Testbody'] },
      ['celestialBodies', 1],
      'Testbody',
    ],
  ];

  it.each(UNCURATED)(
    'refuses an uncurated %s on create, beside it, that a coven saves',
    async (_field, overrides, path, value) => {
      await savesInACoven(entry(overrides));

      const issues = await issuesOf(createCompendiumEntry(admin, entry(overrides)));

      expect(issues).toEqual([{ path, message: expect.stringContaining(`"${value}"`) }]);
      expect(await compendiumCount()).toBe(0);
    },
  );

  // MB.167: a form and a deity are held to a pick, not a spelling — a curated
  // name typed rather than picked is refused, as an uncurated one is.
  const UNPICKED: [string, Overrides<IngredientFixture>, (string | number)[]][] = [
    [
      'a typed form, curated or not',
      { variants: [makeVariant({ form: 'Herb', formId: null })] },
      ['variants', 0, 'form'],
    ],
    ['a typed deity, curated or not', { deities: ['Thor'] }, ['deities', 0]],
  ];

  it.each(UNPICKED)(
    'refuses %s on create and on update, beside it, that a coven saves',
    async (_case, overrides, path) => {
      await savesInACoven(entry(overrides));
      const id = await seed({ name: 'Testwort' });

      expect(await issuesOf(createCompendiumEntry(admin, entry(overrides)))).toEqual([
        { path, message: expect.any(String) },
      ]);
      expect(
        await issuesOf(
          updateCompendiumEntry(admin, id, entry({ name: 'Testwort, relabelled', ...overrides })),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(await compendiumCount()).toBe(1);
      expect((await rowOf(id)).name).toBe('Testwort');
    },
  );

  // A two-tier row is curated only while its group or tradition is live too.
  const RETIRED: [string, string, string, Overrides<IngredientFixture>, (string | number)[]][] = [
    [
      'a retired celestial body',
      'celestial_bodies',
      'Mars',
      { celestialBodies: ['Venus', 'Mars'] },
      ['celestialBodies', 1],
    ],
  ];

  it.each(RETIRED)(
    'refuses %s on create and on update, that a coven saves',
    async (_case, table, retired, overrides, path) => {
      const id = await seed({ name: 'Testwort' });
      // Why the write could have saved: the value is curated until retired.
      await expect(
        updateCompendiumEntry(admin, id, entry({ name: 'Testwort', ...overrides })),
      ).resolves.toBeDefined();

      await retire(table, retired);
      await savesInACoven(entry(overrides));

      expect(
        await issuesOf(
          createCompendiumEntry(
            admin,
            entry({ name: 'Testbloom', canonicalName: 'Fixtura floris', ...overrides }),
          ),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(
        await issuesOf(updateCompendiumEntry(admin, id, entry({ name: 'Testwort', ...overrides }))),
      ).toEqual([{ path, message: expect.any(String) }]);
    },
  );

  // A pick of a retired row is refused on either tier (MB.167); what the
  // compendium adds is that a pick it already holds is refused too, where a
  // coven's is kept, so no compendium entry goes on holding an uncurated one.
  const RETIRED_PICKS: [string, string, string, (string | number)[]][] = [
    ['a form of a retired group', 'ingredient_form_groups', 'Botanical', ['variants', 0, 'formId']],
    ['a retired deity', 'deities', 'Thor', ['deities', 0]],
    ['a deity of a retired tradition', 'deity_traditions', 'Norse', ['deities', 0]],
  ];

  it.each(RETIRED_PICKS)(
    'refuses %s, picked anew or already held',
    async (_case, table, retired, path) => {
      const picks = {
        ...entry({ name: 'Testwort', variants: [makeVariant({ form: 'Leaf' })] }),
        deities: [{ deityId: await curatedDeityId(sql, 'Thor') }],
      };
      const id = await seed({ name: 'Testwort' });
      // Why the write could have saved: both are curated until retired.
      await expect(updateCompendiumEntry(admin, id, picks)).resolves.toBeDefined();

      await retire(table, retired);

      expect(
        await issuesOf(
          createCompendiumEntry(admin, {
            ...picks,
            name: 'Testbloom',
            canonicalName: 'Fixtura floris',
          }),
        ),
      ).toEqual([{ path, message: expect.any(String) }]);
      expect(await issuesOf(updateCompendiumEntry(admin, id, picks))).toEqual([
        { path, message: expect.any(String) },
      ]);
    },
  );

  it('places a list refusal at the entry the input sent, blanks counted', async () => {
    const issues = await issuesOf(
      createCompendiumEntry(admin, entry({ celestialBodies: ['', 'Venus', ' ', 'Testbody'] })),
    );

    expect(issues).toEqual([{ path: ['celestialBodies', 3], message: expect.any(String) }]);
  });

  it('refuses every unpicked or uncurated value at once, each beside its own field', async () => {
    const issues = await issuesOf(
      createCompendiumEntry(
        admin,
        entry({
          variants: [makeVariant({ form: 'Testform' })],
          celestialBodies: ['Testbody'],
          deities: ['Testgod', 'Thor'],
        }),
      ),
    );

    expect(issues.map((issue) => issue.path)).toEqual([
      ['celestialBodies', 0],
      ['deities', 0],
      ['deities', 1],
      ['variants', 0, 'form'],
    ]);
  });

  it("stores a value matching a curated row but for case and spacing in the row's spelling", async () => {
    const created = await createCompendiumEntry(admin, {
      ...entry({
        variants: [makeVariant({ form: '  hERB ' })],
        celestialBodies: [' venus', 'MOON '],
        zodiacSigns: ['taurus'],
      }),
      deities: [{ deityId: await curatedDeityId(sql, 'Thor') }],
    });

    expect(await rowOf(created.id)).toMatchObject({
      celestial_bodies: ['Venus', 'Moon'],
      zodiac_signs: ['Taurus'],
    });
    expect(await variantRowsOf(sql, created.id)).toMatchObject([
      { form: 'Herb', form_id: await curatedFormId(sql, 'Herb') },
    ]);
    expect(await liveDeities(created.id)).toEqual([
      { deity_id: await curatedDeityId(sql, 'Thor'), name: 'Thor' },
    ]);
  });

  it("stores the row's spelling on update too, and keeps the coven's own as typed", async () => {
    const id = await seed({ name: 'Testwort' });
    const local = await savesInACoven(
      entry({
        variants: [makeVariant({ form: 'hERB', formId: null })],
        celestialBodies: ['venus'],
      }),
    );

    await updateCompendiumEntry(
      admin,
      id,
      entry({ variants: [makeVariant({ form: 'hERB' })], celestialBodies: ['venus'] }),
    );

    expect(await rowOf(id)).toMatchObject({ celestial_bodies: ['Venus'] });
    expect(await liveFormsOf(sql, id)).toEqual(['Herb']);
    expect(await rowOf(local.id)).toMatchObject({ celestial_bodies: ['venus'] });
    expect(await variantRowsOf(sql, local.id)).toMatchObject([{ form: 'hERB', form_id: null }]);
  });
});

// MB.219: a compendium entry's forms are written inside its own save, each a
// curated pick with its own curated celestial bodies and signs (DESIGN.md §5, "The
// compendium is held to the vocabularies"). The write's mechanics — matching
// and unchanged rows — are the coven's file's, on the one shared path.
describe('its forms', () => {
  let herb: string;
  let oil: string;
  let leaf: string;
  let protection: string;
  beforeEach(async () => {
    [herb, oil, leaf] = await Promise.all(
      ['Herb', 'Oil', 'Leaf'].map((f) => curatedFormId(sql, f)),
    );
    const [row] =
      await sql`select id from categories where name = 'Protection' and deleted_at is null`;
    protection = row.id as string;
  });

  /** One whole form as the admin's input sends it: picked Herb, `overrides` over blanks. */
  const formOf = (overrides: Partial<VariantInput>) =>
    variantInput(makeVariant({ form: 'Herb' }), { formId: herb, ...overrides });

  const withForms = (...variants: Partial<VariantInput>[]) => ({
    ...entry(),
    variants: variants.map(formOf),
  });

  it('creates two picked forms with the entry, each with its own categories, substitutes and references', async () => {
    const testroot = await seed({ name: 'Testroot', canonicalName: null, nomenclature: 'none' });
    const [rootHerb] = await variantRowsOf(sql, testroot);
    const source = await insertReference(sql, {}, A.id);

    const created = await createCompendiumEntry(
      admin,
      withForms(
        { form: 'herb', categoryIds: [protection], celestialBodies: ['venus'] },
        {
          form: 'Oil',
          formId: oil,
          safetyNotes: 'Dilute.',
          substitutes: [{ ingredientId: testroot, substituteVariantId: rootHerb.id }],
          references: [{ referenceId: source }],
        },
      ),
    );

    const [herbRow, oilRow] = await variantRowsOf(sql, created.id);
    // Each in its curated row's spelling, the celestial body's too.
    expect([herbRow, oilRow]).toMatchObject([
      { form: 'Herb', form_id: herb, celestial_bodies: ['Venus'] },
      { form: 'Oil', form_id: oil, safety_notes: 'Dilute.' },
    ]);
    expect((await variantChildrenOf(sql, herbRow.id)).categories).toMatchObject([
      { category_id: protection },
    ]);
    expect(await variantChildrenOf(sql, oilRow.id)).toMatchObject({
      substitutes: [{ substitute_id: testroot, substitute_variant_id: rootHerb.id }],
      references: [{ reference_id: source, ingredient_id: null }],
    });
  });

  // MB.115, the owner's call: a form stands in for a form, so a form's link
  // names one of what it links.
  it("refuses a form's link naming no form of what it links, at create and update, on that form, writing nothing", async () => {
    const testroot = await seed({ name: 'Testroot', canonicalName: null, nomenclature: 'none' });
    const [rootHerb] = await variantRowsOf(sql, testroot);
    const linking = (substituteVariantId?: string) =>
      withForms({ substitutes: [{ ingredientId: testroot, substituteVariantId }] });
    const path = ['variants', 0, 'substitutes', 0, 'substituteVariantId'];
    // Why each could have saved: the same link, its form named, does.
    const created = await createCompendiumEntry(admin, linking(rootHerb.id));
    const [herbRow] = await variantRowsOf(sql, created.id);
    const [{ n: count }] = await sql`select count(*)::int as n from ingredients`;

    const create = createCompendiumEntry(admin, { ...linking(), name: 'Testwort, formless' });
    await expect(create).rejects.toThrow(ValidationError);
    await expect(create).rejects.toMatchObject({ issues: [{ path }] });
    const update = updateCompendiumEntry(admin, created.id, {
      ...linking(),
      variants: [{ ...linking().variants[0], id: herbRow.id }],
    });
    await expect(update).rejects.toThrow(ValidationError);
    await expect(update).rejects.toMatchObject({ issues: [{ path }] });

    expect(await sql`select count(*)::int as n from ingredients`).toEqual([{ n: count }]);
    expect((await variantChildrenOf(sql, herbRow.id)).substitutes).toMatchObject([
      { substitute_id: testroot, substitute_variant_id: rootHerb.id },
    ]);
  });

  it('keeps a form by its id across a repick, drops the one left out and adds the new', async () => {
    const created = await createCompendiumEntry(
      admin,
      withForms({ form: 'Herb' }, { form: 'Oil', formId: oil }),
    );
    const [herbRow, oilRow] = await variantRowsOf(sql, created.id);

    await updateCompendiumEntry(
      admin,
      created.id,
      withForms(
        { id: herbRow.id, form: 'Leaf', formId: leaf },
        { form: 'Root', formId: await curatedFormId(sql, 'Root') },
      ),
    );

    const after = await variantRowsOf(sql, created.id);
    expect(after.find((row) => row.id === herbRow.id)).toMatchObject({
      form: 'Leaf',
      form_id: leaf,
      deleted_at: null,
    });
    expect(after.find((row) => row.id === oilRow.id)).toMatchObject({ deleted_by: E.id });
    expect(await liveFormsOf(sql, created.id)).toEqual(['Leaf', 'Root']);
  });

  it.each([
    [
      'an uncurated celestial body',
      { celestialBodies: ['Venus', 'Testbody'] },
      ['celestialBodies', 1],
    ],
  ])('refuses %s on a form, beside it, that a coven saves', async (_case, fields, path) => {
    const input = withForms({ form: 'Herb' }, { form: 'Oil', formId: oil, ...fields });
    await savesInACoven(input);

    const attempt = createCompendiumEntry(admin, input);

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({ issues: [{ path: ['variants', 1, ...path] }] });
    expect(await countIngredients()).toBe(1);
  });

  /** Saves `input` on a coven's ingredient: the precondition that only the tier refuses it. */
  async function savesInACoven(input: Parameters<typeof createWorkspaceIngredient>[2]) {
    const saved = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input);
    expect(saved.workspaceId).toBe(WORKSPACE_W_ID);
  }
});
