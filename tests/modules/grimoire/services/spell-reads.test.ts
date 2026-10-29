import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  assignedCategoriesOf,
  countGrimoire,
  countGrimoireCategories,
  countGrimoireFacets,
  derivedCategoriesOf,
  listGrimoire,
  readSpell,
  stepsOfSpells,
} from '@/modules/grimoire';
import type { SpellKey, SpellVisibility } from '@/modules/grimoire';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertVariant } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// The grimoire's reads for the API: the paged list, one spell, and the
// batches the spell's fields load through — its steps, its assigned
// categories and the categories its ingredients carry. Every row a result
// could come from is one this file wrote, through the raw client.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const PAGE = { limit: 26, inverted: false };
// Newest first: each fixture spell is written after the last.
const NEWEST = { order: 'CREATED_DESC' } as const;

/** A spell in `workspaceId`, written by `author`, as setup rather than through the service. */
function seed(
  author: typeof A,
  visibility: SpellVisibility = 'workspace',
  extra: Parameters<typeof makeSpell>[0] = {},
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> {
  return insertSpell(sql, makeSpell({ workspaceId, visibility, ...extra }), author.id);
}

/** A coven ingredient of W, with no formal name, filed under `categories`. */
function ingredient(
  name: string,
  categories: string[] = [],
  variantCategories: string[] = [],
): Promise<string> {
  return insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name,
      nomenclature: 'none',
      categories,
      variants: [makeVariant({ categories: variantCategories })],
    }),
    A.id,
  );
}

const key = (id: string, workspaceId: string = WORKSPACE_W_ID): SpellKey => ({ id, workspaceId });
const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);
const names = (answer: unknown) => (answer as { name: string }[]).map((row) => row.name);

describe('listGrimoire', () => {
  it('pages the shared spells and the reader’s own private ones, newest first', async () => {
    const older = await seed(B, 'workspace', { title: 'Older Working' });
    const hidden = await seed(B, 'private', { title: 'Private Working' });
    const newer = await seed(A, 'workspace', { title: 'Newer Working' });
    // Why the private spell's absence is the rule's: its author lists it.
    expect(
      ids((await listGrimoire(asUser(B), WORKSPACE_W_ID, PAGE, NEWEST)).map((e) => e.node)),
    ).toEqual([newer, hidden, older]);

    for (const reader of [A, C]) {
      const page = await listGrimoire(asUser(reader), WORKSPACE_W_ID, PAGE, NEWEST);
      expect(ids(page.map((entry) => entry.node))).toEqual([newer, older]);
    }
  });

  it('refuses a non-member', async () => {
    await seed(B);
    // Why this could have succeeded: D lists their own coven's grimoire.
    const own = await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    expect(
      ids((await listGrimoire(asUser(D), WORKSPACE_X_ID, PAGE, NEWEST)).map((entry) => entry.node)),
    ).toEqual([own]);

    await expect(listGrimoire(asUser(D), WORKSPACE_W_ID, PAGE, NEWEST)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

describe('countGrimoire', () => {
  it('counts the spells each reader lists, a private one for its author alone', async () => {
    await seed(B, 'workspace', { title: 'Shared Working' });
    await seed(B, 'private', { title: 'Private Working' });
    // Why the private spell's absence from A's count is the rule's: B counts it.
    await expect(
      countGrimoire(asUser(B), WORKSPACE_W_ID, NEWEST, undefined),
    ).resolves.toMatchObject({ totalCount: 2 });

    await expect(
      countGrimoire(asUser(A), WORKSPACE_W_ID, NEWEST, undefined),
    ).resolves.toMatchObject({ totalCount: 1 });
  });

  it('refuses a non-member', async () => {
    await seed(B);
    // Why this could have succeeded: D counts their own coven's grimoire.
    await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    await expect(
      countGrimoire(asUser(D), WORKSPACE_X_ID, NEWEST, undefined),
    ).resolves.toMatchObject({ totalCount: 1 });

    await expect(
      countGrimoire(asUser(D), WORKSPACE_W_ID, NEWEST, undefined),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});

describe('countGrimoireCategories', () => {
  it('counts the spells in each category, a private one for its author alone, and drops a one-character search', async () => {
    await seed(B, 'workspace', { title: 'Shared Working', categories: ['Protection'] });
    await seed(B, 'private', { title: 'Private Working', categories: ['Protection'] });
    const counted = async (user: typeof A, query: string | undefined = undefined) =>
      (await countGrimoireCategories(asUser(user), WORKSPACE_W_ID, { ...NEWEST, query })).map(
        ({ count }) => count,
      );
    // Why the private spell's absence from A's count is the rule's: B counts it.
    await expect(counted(B)).resolves.toEqual([2]);

    await expect(counted(A)).resolves.toEqual([1]);
    // One character matches no title here, so a count of one is the search set aside.
    await expect(counted(A, 'z')).resolves.toEqual([1]);
  });

  it('refuses a non-member', async () => {
    await seed(B, 'workspace', { categories: ['Protection'] });
    // Why this could have succeeded: D counts their own coven's grimoire.
    await seed(D, 'workspace', { categories: ['Protection'] }, WORKSPACE_X_ID);
    await expect(countGrimoireCategories(asUser(D), WORKSPACE_X_ID, NEWEST)).resolves.toEqual([
      expect.objectContaining({ count: 1 }),
    ]);

    await expect(countGrimoireCategories(asUser(D), WORKSPACE_W_ID, NEWEST)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

describe('countGrimoireFacets', () => {
  it('counts each facet’s values, a private spell for its author alone', async () => {
    await seed(B, 'workspace', { moonPhase: 'Full Moon', dayOfWeek: 'Friday' });
    await seed(B, 'private', { moonPhase: 'New Moon', dayOfWeek: 'Monday' });
    // Why A's lack of the private values is the rule's: B is offered them.
    await expect(countGrimoireFacets(asUser(B), WORKSPACE_W_ID, NEWEST)).resolves.toMatchObject({
      moonPhases: expect.arrayContaining([{ value: 'New Moon', count: 1 }]),
      makers: [{ value: B.id, count: 2 }],
    });

    await expect(countGrimoireFacets(asUser(A), WORKSPACE_W_ID, NEWEST)).resolves.toEqual({
      moonPhases: [{ value: 'Full Moon', count: 1 }],
      daysOfWeek: [{ value: 'Friday', count: 1 }],
      visibilities: [{ value: 'workspace', count: 1 }],
      makers: [{ value: B.id, count: 1 }],
    });
  });

  it('refuses a non-member, and offers nothing of another coven', async () => {
    await seed(B, 'workspace', { moonPhase: 'Full Moon' });
    // Why this could have succeeded: D reads their own coven's facets.
    await seed(D, 'workspace', { moonPhase: 'Blood Moon' }, WORKSPACE_X_ID);
    await expect(countGrimoireFacets(asUser(D), WORKSPACE_X_ID, NEWEST)).resolves.toMatchObject({
      moonPhases: [{ value: 'Blood Moon', count: 1 }],
    });

    await expect(countGrimoireFacets(asUser(D), WORKSPACE_W_ID, NEWEST)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(countGrimoireFacets(asUser(A), WORKSPACE_W_ID, NEWEST)).resolves.toMatchObject({
      moonPhases: [{ value: 'Full Moon', count: 1 }],
    });
  });
});

describe('readSpell', () => {
  it('reads a shared spell, and answers NotFound to anyone but the author of a private one', async () => {
    const shared = await seed(B, 'workspace', { title: 'Shared Working' });
    const hidden = await seed(B, 'private');
    // Why this could have succeeded: the private spell is there for its author.
    await expect(readSpell(asUser(B), WORKSPACE_W_ID, hidden)).resolves.toMatchObject({
      id: hidden,
    });

    await expect(readSpell(asUser(C), WORKSPACE_W_ID, shared)).resolves.toMatchObject({
      id: shared,
      title: 'Shared Working',
    });
    for (const reader of [A, C]) {
      await expect(readSpell(asUser(reader), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(
        NotFound,
      );
    }
  });

  it('refuses D by direct id, naming W or naming X', async () => {
    const shared = await seed(B);
    // Why this could have succeeded: D reads their own coven's spell.
    const own = await seed(D, 'workspace', {}, WORKSPACE_X_ID);
    await expect(readSpell(asUser(D), WORKSPACE_X_ID, own)).resolves.toMatchObject({ id: own });

    await expect(readSpell(asUser(D), WORKSPACE_W_ID, shared)).rejects.toBeInstanceOf(Forbidden);
    await expect(readSpell(asUser(D), WORKSPACE_X_ID, shared)).rejects.toBeInstanceOf(NotFound);
  });
});

describe('stepsOfSpells', () => {
  it('answers every live step in position order, instructions and one-off rows included', async () => {
    const root = await ingredient('Testroot');
    const spell = await seed(B, 'workspace', {
      steps: [
        { body: 'Stir three times.' },
        { ingredientId: root, quantity: '2', unit: 'tsp' },
        { name: 'River Water' },
        { body: 'Gone.' },
      ],
    });
    // The fixture places each step at its index; reverse the first three, and
    // retire the last, so the order read is the column's and not the insert's.
    await sql`
      update spell_steps set position = 10 - position
      where spell_id = ${spell}`;
    await sql`update spell_steps set deleted_at = now() where body = 'Gone.'`;

    const [steps] = await stepsOfSpells(asUser(C), [key(spell)]);

    expect(steps).not.toBeInstanceOf(Forbidden);
    const recipe = steps as Exclude<typeof steps, Forbidden>;
    expect(recipe.map((step) => [step.name, step.ingredient?.name ?? null, step.body])).toEqual([
      ['River Water', null, null],
      [null, 'Testroot', null],
      [null, null, 'Stir three times.'],
    ]);
    expect(recipe[1].variant).toMatchObject({
      ingredientId: root,
      form: 'Testform',
      workspaceId: WORKSPACE_W_ID,
    });
    expect(recipe[0].variant).toBeNull();
  });

  it('keeps a linked ingredient deleted since, marked deleted', async () => {
    const root = await ingredient('Testroot');
    const spell = await seed(B, 'workspace', { steps: [{ ingredientId: root }] });
    await sql`update ingredients set deleted_at = now() where id = ${root}`;

    const [steps] = await stepsOfSpells(asUser(C), [key(spell)]);

    expect(steps).toMatchObject([
      { ingredient: { id: root, deleted: true }, variant: { ingredientId: root } },
    ]);
  });

  it('keeps a form deleted since on its own, marked deleted', async () => {
    const root = await ingredient('Testroot');
    const spell = await seed(B, 'workspace', { steps: [{ ingredientId: root }] });
    // Precondition: the step lays a form, live and unmarked.
    const [before] = await stepsOfSpells(asUser(C), [key(spell)]);
    expect(before).toMatchObject([{ variant: { ingredientId: root, deleted: false } }]);
    await sql`update ingredient_variants set deleted_at = now() where ingredient_id = ${root}`;

    const [steps] = await stepsOfSpells(asUser(C), [key(spell)]);

    expect(steps).toMatchObject([
      {
        ingredient: { id: root, deleted: false },
        variant: { id: (before as { variantId: string }[])[0].variantId, deleted: true },
      },
    ]);
  });

  it('answers a batch, a refused coven’s slot Forbidden and a hidden spell’s empty', async () => {
    const first = await seed(B, 'workspace', { steps: [{ body: 'First.' }] });
    const second = await seed(A, 'workspace', { steps: [{ body: 'Second.' }] });
    const hidden = await seed(B, 'private', { steps: [{ body: 'Hidden.' }] });
    const foreign = await seed(D, 'workspace', { steps: [{ body: 'Foreign.' }] }, WORKSPACE_X_ID);
    // Why each refusal could have succeeded: B reads its own private spell's
    // steps, and D reads X's.
    expect(await stepsOfSpells(asUser(B), [key(hidden)])).toMatchObject([[{ body: 'Hidden.' }]]);
    expect(await stepsOfSpells(asUser(D), [key(foreign, WORKSPACE_X_ID)])).toMatchObject([
      [{ body: 'Foreign.' }],
    ]);

    const answers = await stepsOfSpells(asUser(A), [
      key(first),
      key(foreign, WORKSPACE_X_ID),
      key(hidden),
      key(second),
      // X's spell named under W: the coven is A's, the spell is not in it.
      key(foreign),
    ]);

    expect(answers[0]).toMatchObject([{ body: 'First.' }]);
    expect(answers[1]).toBeInstanceOf(Forbidden);
    expect(answers[2]).toEqual([]);
    expect(answers[3]).toMatchObject([{ body: 'Second.' }]);
    expect(answers[4]).toEqual([]);
  });
});

describe('derivedCategoriesOf', () => {
  it('unions each linked step’s ingredient pairs and its own form’s, never another form’s', async () => {
    const root = await ingredient('Testroot', ['Protection'], ['Warding']);
    const spell = await seed(B, 'workspace', {
      steps: [{ ingredientId: root }, { name: 'River Water' }, { body: 'Stir.' }],
      categories: ['Release'],
    });
    // A second form of the same ingredient, which the step does not lay.
    await insertVariant(
      sql,
      root,
      makeVariant({ form: 'Other Testform', categories: ['Banishing'] }),
      A.id,
    );

    const [derived] = await derivedCategoriesOf(asUser(C), [key(spell)]);

    // The assigned category is the other list's, and stays out of this one.
    expect(names(derived)).toEqual(['Protection', 'Warding']);
  });

  it('still counts the categories of a linked ingredient deleted since', async () => {
    const live = await ingredient('Testroot', ['Protection']);
    const gone = await ingredient('Testbark', ['Cleansing'], ['Binding']);
    const spell = await seed(B, 'workspace', {
      steps: [{ ingredientId: live }, { ingredientId: gone }],
    });
    await sql`update ingredients set deleted_at = now() where id = ${gone}`;

    const [derived] = await derivedCategoriesOf(asUser(C), [key(spell)]);

    expect(names(derived)).toEqual(['Binding', 'Cleansing', 'Protection']);
  });

  it('still counts the categories of a form deleted since on its own', async () => {
    const root = await ingredient('Testroot', ['Protection'], ['Warding']);
    const spell = await seed(B, 'workspace', { steps: [{ ingredientId: root }] });
    await sql`update ingredient_variants set deleted_at = now() where ingredient_id = ${root}`;

    const [derived] = await derivedCategoriesOf(asUser(C), [key(spell)]);

    expect(names(derived)).toEqual(['Protection', 'Warding']);
  });

  it('answers a refused coven Forbidden and a hidden spell nothing', async () => {
    const root = await ingredient('Testroot', ['Protection']);
    const hidden = await seed(B, 'private', { steps: [{ ingredientId: root }] });
    // Why this could have succeeded: the private spell's author reads its categories.
    expect(names((await derivedCategoriesOf(asUser(B), [key(hidden)]))[0])).toEqual(['Protection']);

    expect(await derivedCategoriesOf(asUser(A), [key(hidden)])).toEqual([[]]);
    const [refused] = await derivedCategoriesOf(asUser(D), [key(hidden)]);
    expect(refused).toBeInstanceOf(Forbidden);
  });
});

describe('assignedCategoriesOf', () => {
  it('answers the categories the author assigned, by name, and refuses a non-member', async () => {
    const root = await ingredient('Testroot', ['Cleansing']);
    const spell = await seed(B, 'workspace', {
      categories: ['Warding', 'Protection'],
      steps: [{ ingredientId: root }],
    });
    const hidden = await seed(B, 'private', { categories: ['Release'] });
    // Why the hidden spell's empty answer is the rule's: its author reads it.
    expect(names((await assignedCategoriesOf(asUser(B), [key(hidden)]))[0])).toEqual(['Release']);

    const answers = await assignedCategoriesOf(asUser(C), [key(spell), key(hidden)]);
    expect(names(answers[0])).toEqual(['Protection', 'Warding']);
    expect(answers[1]).toEqual([]);

    const [refused] = await assignedCategoriesOf(asUser(D), [key(spell)]);
    expect(refused).toBeInstanceOf(Forbidden);
  });
});
