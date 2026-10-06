import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import {
  createCompendiumEntry,
  createWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { formChoicesOf } from '@/modules/vocabulary';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// MB.167: the curated form a member picked, recorded beside the form's text in
// `ingredients.form_id` (DESIGN.md §5, `ingredient_forms`), so Wax under
// _Animal_ and Wax under _Substance_ stay told apart after a save; and
// `formChoicesOf`, the batch behind `Ingredient.formChoice`. The ingredients
// are emptied per test; a form or group a test adds or retires is put back.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let substanceWax: string;
let animalWax: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  substanceWax = await formId('Wax', 'Substance');
  animalWax = await addForm('Wax', 'Animal');
});

afterEach(async () => {
  // The rows picking the test's form go first, or the key refuses its delete.
  await sql`truncate ingredients cascade`;
  await sql`delete from ingredient_forms where slug like 'test-%'`;
  for (const table of ['ingredient_forms', 'ingredient_form_groups']) {
    await sql`update ${sql(table)} set deleted_at = null, deleted_by = null where deleted_at is not null`;
  }
});

async function formId(name: string, group: string): Promise<string> {
  const [row] = await sql`
    select ingredient_forms.id from ingredient_forms
    join ingredient_form_groups on ingredient_form_groups.id = group_id
    where ingredient_forms.name = ${name} and ingredient_form_groups.name = ${group}`;
  return row.id as string;
}

/** A second live form sharing a seeded one's name, in another group. */
async function addForm(name: string, group: string): Promise<string> {
  const [row] = await sql`
    insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
    select ${name}, ${`test-${name.toLowerCase()}-${group.toLowerCase()}`},
      'Written by the test.', id, ${A.id}, ${A.id}
    from ingredient_form_groups where name = ${group}
    returning id`;
  return row.id as string;
}

async function retire(table: 'ingredient_forms' | 'ingredient_form_groups', id: string) {
  const rows = await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id} where id = ${id}
    returning id`;
  expect(rows).toHaveLength(1);
}

async function groupOf(form: string): Promise<string> {
  const [row] = await sql`select group_id from ingredient_forms where id = ${form}`;
  return row.group_id as string;
}

const input = (form: string | null, formIdValue?: string | null) => ({
  name: 'Testwort',
  nomenclature: 'none' as const,
  form,
  formId: formIdValue,
});

async function rowOf(id: string) {
  const [row] = await sql`select form, form_id from ingredients where id = ${id}`;
  return row;
}

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('a save carrying a picked form', () => {
  it('records the form picked beside its text, telling two same-named forms apart', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Wax', animalWax),
    );

    expect(await rowOf(created.id)).toEqual({ form: 'Wax', form_id: animalWax });
    expect(await formChoicesOf([animalWax])).toEqual([
      expect.objectContaining({ id: animalWax, name: 'Wax' }),
    ]);
  });

  it('writes the text in the picked row’s spelling', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('  wAX ', substanceWax),
    );

    expect(await rowOf(created.id)).toEqual({ form: 'Wax', form_id: substanceWax });
    expect(created.slug).toBe('testwort-wax');
  });

  it('refuses text that is not the picked form’s name, beside the text', async () => {
    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Root', substanceWax)),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['form'] })]);
  });

  // Typed text is never resolved into a pick (MB.165).
  it('links nothing for typed text, curated or not', async () => {
    const curated = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Wax'));
    const uncurated = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...input('rhizome'),
      name: 'Testbane',
    });

    expect(await rowOf(curated.id)).toEqual({ form: 'Wax', form_id: null });
    expect(await rowOf(uncurated.id)).toEqual({ form: 'rhizome', form_id: null });
  });

  it('lets an admin pick a compendium entry’s form the same way', async () => {
    const created = await createCompendiumEntry(asUser(E), input('wax', animalWax));

    expect(await rowOf(created.id)).toEqual({ form: 'Wax', form_id: animalWax });
  });
});

describe('a form pick that names no curated form', () => {
  it.each([
    ['names no form', async () => '00000000-0000-4000-8000-00000000dead'],
    ['names a retired form', async () => (await retire('ingredient_forms', animalWax), animalWax)],
    [
      'names a form of a retired group',
      async () => (await retire('ingredient_form_groups', await groupOf(animalWax)), animalWax),
    ],
  ])(
    'is a field error pathed to it when it %s, never the foreign key’s 23503',
    async (_case, id) => {
      const form = await id();

      const issues = await refusal(
        createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Wax', form)),
      );

      expect(issues).toEqual([expect.objectContaining({ path: ['formId'] })]);
      const [{ n }] = await sql`select count(*)::int as n from ingredients`;
      expect(n).toBe(0);
    },
  );
});

// A pick is the column's alone, so a save without one clears it and keeps the
// text, which is the value and the identity (MB.165).
describe('a picked form since retired', () => {
  let id: string;

  beforeEach(async () => {
    id = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        nomenclature: 'none',
        form: 'Wax',
        formId: animalWax,
      }),
      A.id,
    );
    // Precondition: the pick reads as a pick while its form is curated.
    expect(await formChoicesOf([animalWax])).toEqual([expect.objectContaining({ id: animalWax })]);
  });

  it.each([
    ['the form', () => retire('ingredient_forms', animalWax)],
    ['its group', async () => retire('ingredient_form_groups', await groupOf(animalWax))],
  ])('reads as no pick once %s is retired, the text untouched', async (_case, retiring) => {
    await retiring();

    expect(await formChoicesOf([animalWax])).toEqual([null]);
    expect(await rowOf(id)).toEqual({ form: 'Wax', form_id: animalWax });
  });

  it('is cleared by a save sending back the text it reads as, the text kept', async () => {
    await retire('ingredient_forms', animalWax);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Wax'));

    expect(await rowOf(id)).toEqual({ form: 'Wax', form_id: null });
  });

  it('is refused when sent again by id, as any pick of a retired form is', async () => {
    await retire('ingredient_forms', animalWax);

    const issues = await refusal(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Wax', animalWax)),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['formId'] })]);
    expect(await rowOf(id)).toEqual({ form: 'Wax', form_id: animalWax });
  });
});
