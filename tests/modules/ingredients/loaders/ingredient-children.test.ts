import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  type IngredientKey,
  type VariantKey,
  categoriesByIngredient,
  categoriesByVariant,
  folkNamesByIngredient,
  referencesByIngredient,
  referencesByVariant,
  substitutesByIngredient,
  substitutesByVariant,
  variantsByIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { liveFolkNames } from '../../../support/db/folk-names';
import {
  insertIngredient,
  insertSubstituteLink,
  insertVariant,
} from '../../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../../support/db/insert-reference';
import { makeIngredient } from '../../../support/fixtures';
import type { Written } from './types';

// The query count, observed at the repository: every read the path reaches is
// wrapped so the test counts calls without changing what they answer. A role
// lookup is `assertMembership`'s one query; the rest are the reads themselves.
const repository = vi.hoisted(() => ({
  findManyOfIngredients: vi.fn(),
  findManyOfVariants: vi.fn(),
  findManyByIds: vi.fn(),
  findSubstitutesIncludingSoftDeleted: vi.fn(),
  findReferencesOf: vi.fn(),
  findWorkspaceRole: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

const countOf = () =>
  Object.fromEntries(
    Object.entries(repository).map(([name, spy]) => [name, spy.mock.calls.length]),
  );

let sql: ReturnType<typeof postgres>;

// Three of §6's seeded categories, picked by name so the expectation reads;
// the ids are what the loader answers with.
const CATEGORY_NAMES = ['Banishing', 'Protection', 'Cleansing'];
let categoryIds: Map<string, string>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  const rows = await sql`
    select id, name from categories where name in ${sql(CATEGORY_NAMES)} and deleted_at is null
  `;
  categoryIds = new Map(rows.map((row) => [row.name as string, row.id as string]));
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  Object.values(repository).forEach((spy) => spy.mockClear());
});

async function addIngredient(
  name: string,
  workspaceId: string | null,
  folkNames: string[],
  categories: string[],
): Promise<Written> {
  const id = await insertIngredient(
    sql,
    // Its folk names typed as its substitutes too: a third child read the same way.
    makeIngredient({
      name,
      workspaceId,
      nomenclature: 'none',
      folkNames,
      substitutes: folkNames,
      categories,
    }),
    A.id,
  );
  return {
    ref: { id, workspaceId },
    // What each loader answers: sorted by name, whatever order they were written in.
    folkNames: [...folkNames].sort(),
    categories: [...categories].sort(),
  };
}

/** Fifty ingredients, the first half in the compendium and the second in W, each with its own folk names and a different subset of the categories, so a slot answered with a neighbour's children shows as a mismatch. */
// Written concurrently, each in its own transaction over the client's pool:
// fifty one after another were most of this file's run time, and no case
// reads the order they were written in.
async function addFifty(): Promise<Written[]> {
  return Promise.all(
    Array.from({ length: 50 }, (_, i) => {
      const n = String(i).padStart(2, '0');
      return addIngredient(
        `Fixturewort ${n}`,
        i < 25 ? null : WORKSPACE_W_ID,
        [`Testbane ${n}`, `Mock Root ${n}`],
        CATEGORY_NAMES.filter((_, c) => (i >> c) & 1),
      );
    }),
  );
}

const loadersFor = (session: Session | null) =>
  buildLoaders(
    {
      categoriesByIngredient,
      folkNamesByIngredient,
      substitutesByIngredient,
      variantsByIngredient,
      referencesByIngredient,
      categoriesByVariant,
      substitutesByVariant,
      referencesByVariant,
    },
    session,
  );

type Loaders = ReturnType<typeof loadersFor>;

/** The second form each ingredient a test gave one has, by the ingredient's id. */
const variantOf = new Map<string, string>();

/** The key of the second form of `ref`'s ingredient, claiming `ref`'s tier: how a variant's loaders are asked, so a key that lies about its ingredient's tier lies about the variant's too. */
const variantKey = (ref: IngredientKey): VariantKey => ({
  id: variantOf.get(ref.id) ?? '',
  ingredientId: ref.id,
  workspaceId: ref.workspaceId,
});

/** Gives `ref`'s ingredient a second form, Fixture Gum, which adds the category Protection, the typed substitute Testbane and a compendium book. */
async function addVariant({ ref }: Written): Promise<void> {
  const id = await insertVariant(
    sql,
    ref.id,
    { form: 'Fixture Gum', categories: ['Protection'], substitutes: ['Testbane'] },
    A.id,
  );
  const book = await insertReference(sql, { title: 'Fixture Gums' }, E.id);
  await insertVariantReferenceLink(sql, id, book, A.id);
  variantOf.set(ref.id, id);
}

const categoryNames = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.categoriesByIngredient.load(ref)).map((category) => category.name);

const folkNames = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.folkNamesByIngredient.load(ref)).map(({ name }) => name);

const substituteNames = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.substitutesByIngredient.load(ref)).map((substitute) => substitute.name);

/** The forms each ingredient comes in, as `Ingredient.variants` lists them. */
const variantForms = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.variantsByIngredient.load(ref)).map((variant) => variant.form);

/** The books the ingredient itself cites, as `Ingredient.references` lists them. */
const citations = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.referencesByIngredient.load(ref)).map(({ reference }) => reference.title);

/** What the second form of `ref`'s ingredient adds, through that form's own loaders. */
const variantCategoryNames = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.categoriesByVariant.load(variantKey(ref))).map((category) => category.name);

const variantSubstituteNames = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.substitutesByVariant.load(variantKey(ref))).map((substitute) => substitute.name);

const variantCitations = async (loaders: Loaders, ref: IngredientKey) =>
  (await loaders.referencesByVariant.load(variantKey(ref))).map(({ reference }) => reference.title);

describe('the categoriesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and two reads', async () => {
    const written = await addFifty();
    const { categoriesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers.map((categories) => categories.map((category) => category.name))).toEqual(
      written.map(({ categories }) => categories),
    );
    expect(countOf()).toEqual({
      findManyOfIngredients: 1,
      findManyOfVariants: 0,
      findManyByIds: 1,
      findSubstitutesIncludingSoftDeleted: 0,
      findReferencesOf: 0,
      findWorkspaceRole: 1,
    });
  });

  it('answers each key with its own categories, whatever order the keys arrive in', async () => {
    const written = await addFifty();
    const shuffled = [...written].reverse().filter((_, i) => i % 3 !== 1);
    const { categoriesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await loader.loadMany(shuffled.map(({ ref }) => ref));

    expect(answers).toEqual(
      shuffled.map(({ categories }) =>
        categories.map((name) => expect.objectContaining({ name, id: categoryIds.get(name) })),
      ),
    );
  });

  it('reads a signed-out compendium batch without a role lookup', async () => {
    const written = (await addFifty()).slice(0, 25);

    const answers = await loadersFor(null).categoriesByIngredient.loadMany(
      written.map(({ ref }) => ref),
    );

    expect(answers).toHaveLength(25);
    expect(countOf()).toEqual({
      findManyOfIngredients: 1,
      findManyOfVariants: 0,
      findManyByIds: 1,
      findSubstitutesIncludingSoftDeleted: 0,
      findReferencesOf: 0,
      findWorkspaceRole: 0,
    });
  });
});

describe('the folkNamesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and one read', async () => {
    const written = await addFifty();
    const { folkNamesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers.map((names) => names.map(({ name }) => name))).toEqual(
      written.map(({ folkNames: names }) => names),
    );
    expect(answers[0]).toEqual(await liveFolkNames(sql, written[0].ref.id));
    expect(countOf()).toEqual({
      findManyOfIngredients: 1,
      findManyOfVariants: 0,
      findManyByIds: 0,
      findSubstitutesIncludingSoftDeleted: 0,
      findReferencesOf: 0,
      findWorkspaceRole: 1,
    });
  });

  it('leaves out a soft-deleted folk name', async () => {
    const { ref } = await addIngredient('Fixturewort', null, ['Testbane', 'Mock Root'], []);
    await sql`
      update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id}
      where name = 'Testbane'
    `;

    expect(await folkNames(loadersFor(asUser(B)), ref)).toEqual(['Mock Root']);
    expect(await loadersFor(asUser(B)).folkNamesByIngredient.load(ref)).toEqual(
      await liveFolkNames(sql, ref.id),
    );
  });
});

describe('the substitutesByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and one read', async () => {
    const written = await addFifty();
    // Every other one links its neighbour, across the tiers W reads.
    for (let i = 1; i < written.length; i += 2) {
      await insertSubstituteLink(sql, written[i].ref.id, written[i - 1].ref.id, A.id);
    }
    const { substitutesByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers.map((substitutes) => substitutes.map((substitute) => substitute.name))).toEqual(
      written.map(({ folkNames: names }, i) =>
        i % 2 === 1 ? [...names, `Fixturewort ${String(i - 1).padStart(2, '0')}`].sort() : names,
      ),
    );
    expect(answers[1].find((substitute) => substitute.ingredient)?.ingredient?.id).toBe(
      written[0].ref.id,
    );
    expect(countOf()).toEqual({
      findManyOfIngredients: 0,
      findManyOfVariants: 0,
      findManyByIds: 0,
      findSubstitutesIncludingSoftDeleted: 1,
      findReferencesOf: 0,
      findWorkspaceRole: 1,
    });
  });
});

describe('the variantsByIngredient loader', () => {
  it('answers fifty ingredients across two tiers with one role lookup and one read', async () => {
    const written = await addFifty();
    // A second form on every other one, written after the fixture's own
    // `Testform` and sorting before it, so each answer shows the sort by form.
    for (let i = 1; i < written.length; i += 2) {
      await insertVariant(sql, written[i].ref.id, { form: 'Fixture Gum' }, A.id);
    }
    const { variantsByIngredient: loader } = loadersFor(asUser(B));

    const answers = await Promise.all(written.map(({ ref }) => loader.load(ref)));

    expect(answers.map((variants) => variants.map((variant) => variant.form))).toEqual(
      written.map((_, i) => (i % 2 === 1 ? ['Fixture Gum', 'Testform'] : ['Testform'])),
    );
    expect(countOf()).toEqual({
      findManyOfIngredients: 1,
      findManyOfVariants: 0,
      findManyByIds: 0,
      findSubstitutesIncludingSoftDeleted: 0,
      findReferencesOf: 0,
      findWorkspaceRole: 1,
    });
  });
});

describe("a variant's child loaders", () => {
  it('answer fifty variants across two tiers with one read each and one role lookup each', async () => {
    const written = await addFifty();
    for (const one of written) await addVariant(one);
    const loaders = loadersFor(asUser(B));

    const categories = await Promise.all(
      written.map(({ ref }) => variantCategoryNames(loaders, ref)),
    );
    const substitutes = await Promise.all(
      written.map(({ ref }) => variantSubstituteNames(loaders, ref)),
    );
    const citations = await Promise.all(written.map(({ ref }) => variantCitations(loaders, ref)));

    // Each form's own, never its ingredient's: the ingredients are filed
    // under other categories too, and type their folk names as substitutes.
    expect(categories).toEqual(written.map(() => ['Protection']));
    expect(substitutes).toEqual(written.map(() => ['Testbane']));
    expect(citations).toEqual(written.map(() => ['Fixture Gums']));
    expect(countOf()).toEqual({
      findManyOfIngredients: 0,
      findManyOfVariants: 1,
      findManyByIds: 1,
      findSubstitutesIncludingSoftDeleted: 1,
      findReferencesOf: 1,
      findWorkspaceRole: 3,
    });
  });
});

// The loaders share one check, `admit`, and each has a read of its own,
// so every case runs through each in one matrix: a check or a scope forgotten
// in one loader shows up as that loader's row differing from the others'.
describe('who the ingredient-children loaders answer', () => {
  const READS = {
    categoriesByIngredient: categoryNames,
    folkNamesByIngredient: folkNames,
    substitutesByIngredient: substituteNames,
    variantsByIngredient: variantForms,
    referencesByIngredient: citations,
    categoriesByVariant: variantCategoryNames,
    substitutesByVariant: variantSubstituteNames,
    referencesByVariant: variantCitations,
  };
  const CHILDREN = {
    categoriesByIngredient: ['Protection'],
    folkNamesByIngredient: ['Testbane'],
    substitutesByIngredient: ['Testbane'],
    // The fixture's own form, a variant, and the one added.
    variantsByIngredient: ['Fixture Gum', 'Testform'],
    referencesByIngredient: ['Fixture Herbal'],
    categoriesByVariant: ['Protection'],
    substitutesByVariant: ['Testbane'],
    referencesByVariant: ['Fixture Gums'],
  };
  type Loader = keyof typeof READS;
  const LOADERS = Object.keys(READS) as Loader[];

  let local: Written;
  let compendium: Written;

  beforeEach(async () => {
    local = await addIngredient('Fixturewort', WORKSPACE_W_ID, ['Testbane'], ['Protection']);
    compendium = await addIngredient('Mockleaf', null, ['Testbane'], ['Protection']);
    await addVariant(local);
    await addVariant(compendium);
    // A book the ingredient itself cites, beside the one its form cites.
    const herbal = await insertReference(sql, { title: 'Fixture Herbal' }, E.id);
    for (const { ref } of [local, compendium]) {
      await insertReferenceLink(sql, ref.id, herbal, A.id, 'p. 1');
    }
  });

  /** What one read answers, a refusal as `'Forbidden'` so the matrix compares. */
  const outcome = (read: (typeof READS)[Loader], session: Session | null, ref: IngredientKey) =>
    read(loadersFor(session), ref).then(
      (names) => names,
      (error: unknown) => (error instanceof Forbidden ? 'Forbidden' : error),
    );

  it('answers members and the compendium, and refuses or empties every other read', async () => {
    // The member's own read is the precondition for every refusal below: the
    // row exists and has children, read through this same key.
    const cases: [string, Session | null, IngredientKey, 'children' | 'Forbidden' | 'none'][] = [
      ['a member', asUser(B), local.ref, 'children'],
      ['a viewer', asUser(C), local.ref, 'children'],
      ['signed out, the compendium', null, compendium.ref, 'children'],
      ['another coven, the compendium', asUser(D), compendium.ref, 'children'],
      ['another coven, by direct id', asUser(D), local.ref, 'Forbidden'],
      ['a site admin, who reaches no coven', asUser(E), local.ref, 'Forbidden'],
      ['signed out', null, local.ref, 'Forbidden'],
      // The key names the tier, so a caller could lie about it: the check then
      // passes, and only the read's own scope stands between D and W's rows.
      ['a key claiming the compendium', asUser(D), { id: local.ref.id, workspaceId: null }, 'none'],
      [
        "a key claiming the caller's own coven",
        asUser(D),
        { id: local.ref.id, workspaceId: WORKSPACE_X_ID },
        'none',
      ],
    ];

    const answered: Record<string, unknown> = {};
    const expected: Record<string, unknown> = {};
    for (const loader of LOADERS) {
      for (const [who, session, ref, answer] of cases) {
        answered[`${loader}: ${who}`] = await outcome(READS[loader], session, ref);
        expected[`${loader}: ${who}`] =
          answer === 'children' ? CHILDREN[loader] : answer === 'none' ? [] : answer;
      }
    }

    expect(answered).toEqual(expected);
  });

  it('refuses one key without refusing the rest of its batch', async () => {
    for (const loader of LOADERS) {
      // One request's loaders, so the two keys are one batch.
      const loaders = loadersFor(asUser(D));
      const load = (ref: IngredientKey) => READS[loader](loaders, ref);

      const [refused, answered] = await Promise.allSettled([load(local.ref), load(compendium.ref)]);

      expect(refused, loader).toMatchObject({ status: 'rejected', reason: expect.any(Forbidden) });
      expect(answered, loader).toMatchObject({ status: 'fulfilled' });
    }
  });

  it('answers nothing for a soft-deleted ingredient', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local.ref.id}`;

    for (const loader of LOADERS) {
      expect(await READS[loader](loadersFor(asUser(B)), local.ref), loader).toEqual([]);
    }
  });
});
