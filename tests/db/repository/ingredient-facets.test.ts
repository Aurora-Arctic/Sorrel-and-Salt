import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import {
  findCompendiumCount,
  findCompendiumFacets,
  findWorkspaceIngredientFacets,
  type IngredientFacets,
  type IngredientFilter,
} from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { A, B, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../support/db/insert-reference';
import { variantIdOf } from '../../support/db/read-variants';
import type { Logged } from '../../support/db/types';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../support/fixtures';
import type { Overrides } from '../../support/fixtures';

// M12.3: how many compendium entries each facet value would list, read in one
// grouped query per kind. Each count is checked against the list's own count
// read under the filter the value stands for, so the facets cannot drift from
// the arms that match. The ingredient tables are emptied per test, so every
// row a count could come from is one this file wrote.

const logged = vi.hoisted(() => [] as Logged[]);

vi.mock('@/db/connection', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  return {
    db: drizzle(connect(process.env.DATABASE_URL as string), {
      logger: { logQuery: (query, params) => logged.push({ query, params }) },
    }),
  };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** A compendium entry with no formal name unless stated. */
function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** A live vocabulary row's id, by name. */
async function idOf(table: 'categories' | 'deities', name: string): Promise<string> {
  const [row] = await sql`
    select id from ${sql(table)} where name = ${name} and deleted_at is null`;
  return row.id as string;
}

type Kind = keyof IngredientFacets;
const KINDS: Kind[] = [
  'forms',
  'deities',
  'categories',
  'zodiacSigns',
  'celestialBodies',
  'elements',
  'toxic',
];

/**
 * The list filter a facet value stands for: `base` with the value as its
 * kind's only selection, or, for a category under `all`, added to the ones
 * already chosen.
 */
function only(base: IngredientFilter, kind: Kind, value: string): IngredientFilter {
  switch (kind) {
    case 'forms':
      return { ...base, forms: [value] };
    case 'deities':
      return { ...base, deityIds: [value] };
    case 'categories':
      return base.categoryMode === 'any'
        ? { ...base, categoryIds: [value] }
        : { ...base, categoryIds: [...new Set([...(base.categoryIds ?? []), value])] };
    case 'zodiacSigns':
      return { ...base, zodiacSigns: [value] };
    case 'celestialBodies':
      return { ...base, celestialBodies: [value] };
    case 'elements':
      return { ...base, elements: [value as 'fire'] };
    case 'toxic':
      return { ...base, toxic: value as 'toxic' };
  }
}

/** `{ value: count }` for one kind, so a test names the counts it means. */
function counts(facets: IngredientFacets, kind: Kind): Record<string, number> {
  return Object.fromEntries(facets[kind].map(({ value, count }) => [value, count]));
}

describe('findCompendiumFacets', () => {
  let protection: string;
  let cleansing: string;
  let hecate: string;
  let apollo: string;

  /**
   * Four compendium entries spread over every kind, and a coven entry that
   * matches them all and must count for none of them.
   */
  async function seedEntries(): Promise<void> {
    protection = await idOf('categories', 'Protection');
    cleansing = await idOf('categories', 'Cleansing');
    hecate = await idOf('deities', 'Hecate');
    apollo = await idOf('deities', 'Apollo');

    const alpha = await add('Alphawort', {
      variants: [makeVariant({ form: 'Resin' }), makeVariant({ form: 'Root' })],
      categories: ['Protection'],
      zodiacSigns: ['Leo'],
      celestialBodies: ['Sun'],
      elements: ['fire'],
    });
    await insertDeityLink(sql, alpha, hecate, 0, A.id);
    const beta = await add('Betawort', {
      variants: [makeVariant({ form: 'resin' })],
      categories: ['Protection', 'Cleansing'],
      zodiacSigns: ['Leo', 'Aries'],
      celestialBodies: ['Mars'],
      elements: ['water'],
      toxic: true,
      folkNames: ['Moonfacet'],
    });
    await insertDeityLink(sql, beta, apollo, 0, A.id);
    const gamma = await add('Gammawort', {
      variants: [
        makeVariant({ form: 'Bark' }),
        makeVariant({ form: 'Root', toxic: true, elements: ['air'], categories: ['Cleansing'] }),
      ],
      zodiacSigns: [' aries '],
      celestialBodies: ['Sun'],
      folkNames: ['Moonfacet'],
    });
    await insertDeityLink(sql, gamma, hecate, 0, A.id);
    await insertDeityLink(sql, gamma, apollo, 1, A.id);
    await add('Deltawort');
    const coven = await add('Covenwort', {
      workspaceId: WORKSPACE_W_ID,
      variants: [makeVariant({ form: 'Resin', toxic: true, elements: ['fire'] })],
      categories: ['Protection', 'Cleansing'],
      zodiacSigns: ['Leo'],
      celestialBodies: ['Sun'],
    });
    await insertDeityLink(sql, coven, hecate, 0, A.id);
  }

  it('counts each value as the list reads it with that value chosen, under every other filter', async () => {
    await seedEntries();
    const bases: IngredientFilter[] = [
      {},
      { zodiacSigns: ['leo'] },
      { categoryIds: [protection] },
      { forms: ['root'], elements: ['fire', 'air'] },
      { query: 'moonfacet' },
      { categoryIds: [protection, cleansing], categoryMode: 'any' },
      { toxic: 'not_toxic' },
      { deityIds: [hecate], celestialBodies: ['sun'] },
    ];

    let checked = 0;
    let counted = 0;
    for (const base of bases) {
      const facets = await findCompendiumFacets(base);
      for (const kind of KINDS) {
        for (const { value, count } of facets[kind]) {
          const { totalCount } = await findCompendiumCount(only(base, kind, value), undefined);
          expect({ base, kind, value, count }).toEqual({ base, kind, value, count: totalCount });
          checked += 1;
          counted += count;
        }
      }
    }
    // Why the comparison could have failed: it ran over many values, and the
    // counts were not all zero.
    expect(checked).toBeGreaterThan(100);
    expect(counted).toBeGreaterThan(50);
  });

  it('counts the compendium alone, never a coven entry', async () => {
    await seedEntries();

    const facets = await findCompendiumFacets({});

    // The coven entry carries Resin, Protection, Leo, Sun, fire and Hecate,
    // and its toxic flag; none of them counts it.
    expect(counts(facets, 'forms')).toEqual({ Resin: 2, Root: 2, Bark: 1, Testform: 1 });
    expect(counts(facets, 'categories')).toEqual({ [protection]: 2, [cleansing]: 2 });
    expect(counts(facets, 'deities')).toEqual({ [hecate]: 2, [apollo]: 2 });
    expect(counts(facets, 'zodiacSigns')).toMatchObject({ Leo: 2, Aries: 2 });
    expect(counts(facets, 'celestialBodies')).toMatchObject({ Sun: 2, Mars: 1 });
    expect(counts(facets, 'elements')).toEqual({ earth: 0, air: 1, fire: 1, water: 1, spirit: 0 });
    expect(counts(facets, 'toxic')).toEqual({ toxic: 2, not_toxic: 2 });
  });

  it('leaves the other forms as they were when a form is chosen', async () => {
    await seedEntries();

    const unchosen = await findCompendiumFacets({});
    const chosen = await findCompendiumFacets({ forms: ['resin'] });

    expect(chosen.forms).toEqual(unchosen.forms);
    // Why it could have changed: the choice narrows every other kind.
    expect(chosen.toxic).not.toEqual(unchosen.toxic);
  });

  it('narrows the other categories under all, and leaves them under any', async () => {
    await seedEntries();

    const unchosen = await findCompendiumFacets({});
    const all = await findCompendiumFacets({ categoryIds: [protection] });
    const any = await findCompendiumFacets({ categoryIds: [protection], categoryMode: 'any' });

    expect(counts(all, 'categories')).toEqual({ [protection]: 2, [cleansing]: 1 });
    expect(all.categories).not.toEqual(unchosen.categories);
    expect(any.categories).toEqual(unchosen.categories);
  });

  it('orders a dynamic kind by count, most first, then by value', async () => {
    await seedEntries();

    const facets = await findCompendiumFacets({});

    expect(facets.forms.map(({ value }) => value)).toEqual(['Resin', 'Root', 'Bark', 'Testform']);
  });

  it('lists every live sign and body, by name, every element and both toxic settings, zeros included', async () => {
    await add('Alphawort', { zodiacSigns: ['Leo'] });
    const signs =
      await sql`select name from zodiac_signs where deleted_at is null order by name, id`;
    const bodies = await sql`
      select name from celestial_bodies where deleted_at is null order by name, id`;

    const facets = await findCompendiumFacets({});

    expect(facets.zodiacSigns.map(({ value }) => value)).toEqual(signs.map((row) => row.name));
    expect(facets.celestialBodies).toEqual(bodies.map((row) => ({ value: row.name, count: 0 })));
    expect(counts(facets, 'zodiacSigns')).toMatchObject({ Leo: 1, Aries: 0 });
    expect(facets.elements).toEqual(
      ['earth', 'air', 'fire', 'water', 'spirit'].map((value) => ({ value, count: 0 })),
    );
    expect(facets.toxic).toEqual([
      { value: 'toxic', count: 0 },
      { value: 'not_toxic', count: 1 },
    ]);
  });

  it('lists a chosen form, deity and category that match nothing, at zero', async () => {
    await add('Alphawort', { variants: [makeVariant({ form: 'Resin' })] });
    const selene = await idOf('deities', 'Selene');
    const love = await idOf('categories', 'Love');

    const facets = await findCompendiumFacets({
      forms: ['Nonesuchform'],
      deityIds: [selene],
      categoryIds: [love],
      categoryMode: 'any',
    });

    expect(facets.forms).toContainEqual({ value: 'Nonesuchform', count: 0 });
    expect(facets.deities).toEqual([{ value: selene, count: 0 }]);
    expect(facets.categories).toEqual([{ value: love, count: 0 }]);
  });

  it('spells a form as the curated row, else its most-used spelling, ties alphabetically', async () => {
    await add('Alphawort', {
      variants: [makeVariant({ form: 'RESIN' }), makeVariant({ form: 'Moonpetal' })],
    });
    await add('Betawort', {
      variants: [makeVariant({ form: ' resin ' }), makeVariant({ form: 'moonpetal' })],
    });
    await add('Gammawort', {
      variants: [makeVariant({ form: 'Moonpetal' }), makeVariant({ form: 'zedform' })],
    });
    await add('Deltawort', { variants: [makeVariant({ form: 'Zedform' })] });

    const facets = await findCompendiumFacets({ forms: ['MOONPETAL'] });

    expect(facets.forms).toEqual([
      { value: 'Moonpetal', count: 3 },
      { value: 'Resin', count: 2 },
      { value: 'Zedform', count: 2 },
    ]);
  });

  describe('its statements', () => {
    /** The statements `read` sends, `set_config` aside. */
    async function readsOf(read: () => Promise<unknown>): Promise<Logged[]> {
      logged.length = 0;
      await read();
      return logged.filter(({ query }) => !/set_config/.test(query));
    }

    it('sends at most eight reads for the compendium and ten for a coven, with a search or without', async () => {
      await seedEntries();
      const inW = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
      const browse: IngredientFilter = { zodiacSigns: ['leo'] };
      const search: IngredientFilter = { query: 'moonfacet', categoryIds: [protection] };

      const compendium = [
        await readsOf(() => findCompendiumFacets(browse)),
        await readsOf(() => findCompendiumFacets(search)),
      ];
      const coven = [
        await readsOf(() => findWorkspaceIngredientFacets(inW, browse)),
        await readsOf(() => findWorkspaceIngredientFacets(inW, search)),
      ];

      // Why the bound could have been missed: each kind is read, so a read per
      // value would send far more than eight.
      expect(compendium[0].length).toBeGreaterThan(0);
      for (const reads of compendium) expect(reads.length).toBeLessThanOrEqual(8);
      for (const reads of coven) expect(reads.length).toBeLessThanOrEqual(10);
    });
  });

  describe('the entries citing no reference', () => {
    /** Links a fresh compendium book from the entry, or from its form `form`. */
    async function cite(ingredientId: string, form?: string): Promise<string> {
      const book = await insertReference(sql, {}, A.id);
      if (form) {
        await insertVariantReferenceLink(
          sql,
          await variantIdOf(sql, ingredientId, form),
          book,
          A.id,
        );
      } else {
        await insertReferenceLink(sql, ingredientId, book, A.id);
      }
      return book;
    }

    it('counts them as the list reads them, under the rest of the filter, the switch on or off', async () => {
      const sourced = await add('Alphawort', {
        variants: [makeVariant({ form: 'Resin' })],
        zodiacSigns: ['Leo'],
      });
      await cite(sourced);
      const formSourced = await add('Betawort', {
        variants: [makeVariant({ form: 'Resin' })],
        zodiacSigns: ['Leo'],
      });
      await cite(formSourced, 'Resin');
      await add('Gammawort', { variants: [makeVariant({ form: 'Resin' })], zodiacSigns: ['Leo'] });
      await add('Deltawort', { variants: [makeVariant({ form: 'Leaf' })], zodiacSigns: ['Leo'] });
      await add('Epsilonwort', {
        variants: [makeVariant({ form: 'Resin' })],
        zodiacSigns: ['Aries'],
      });
      const base: IngredientFilter = { forms: ['resin'], zodiacSigns: ['leo'] };
      const { totalCount } = await findCompendiumCount(
        { ...base, withoutReferences: true },
        undefined,
      );
      // Why it could have counted otherwise: three entries fit the rest of the
      // filter, and of all five only two cite something.
      expect(totalCount).toBe(1);

      for (const withoutReferences of [undefined, false, true]) {
        const facets = await findCompendiumFacets({ ...base, withoutReferences });
        expect({ withoutReferences, count: facets.withoutReferences }).toEqual({
          withoutReferences,
          count: totalCount,
        });
      }
    });

    it('counts an entry whose only reference is soft-deleted as citing nothing', async () => {
      const entry = await add('Alphawort');
      const book = await cite(entry);
      // Why it could have been left out: while the reference is live, it is.
      expect((await findCompendiumFacets({})).withoutReferences).toBe(0);

      await sql`update "references" set deleted_at = now(), deleted_by = ${A.id} where id = ${book}`;

      expect((await findCompendiumFacets({})).withoutReferences).toBe(1);
    });
  });

  describe('counts nothing soft-deleted', () => {
    it('neither a deleted entry nor a retired form, nor what the form carries', async () => {
      const resinCarrier = await add('Alphawort', {
        variants: [makeVariant({ form: 'Resin' })],
        zodiacSigns: ['Leo'],
      });
      const retiring = await add('Betawort', {
        variants: [
          makeVariant({ form: 'Bark' }),
          makeVariant({ form: 'Root', toxic: true, elements: ['air'], categories: ['Cleansing'] }),
        ],
      });
      const cleansingId = await idOf('categories', 'Cleansing');
      // Why each could have counted: until the deletes, every one does.
      const before = await findCompendiumFacets({});
      expect(counts(before, 'forms')).toEqual({ Resin: 1, Bark: 1, Root: 1 });
      expect(counts(before, 'zodiacSigns')).toMatchObject({ Leo: 1 });
      expect(counts(before, 'categories')).toEqual({ [cleansingId]: 1 });
      expect(counts(before, 'elements')).toMatchObject({ air: 1 });
      expect(counts(before, 'toxic')).toEqual({ toxic: 1, not_toxic: 1 });

      await sql`
        update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${resinCarrier}`;
      await sql`
        update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
        where ingredient_id = ${retiring} and form = 'Root'`;

      const after = await findCompendiumFacets({});
      expect(counts(after, 'forms')).toEqual({ Bark: 1 });
      expect(counts(after, 'zodiacSigns')).toMatchObject({ Leo: 0 });
      expect(after.categories).toEqual([]);
      expect(counts(after, 'elements')).toMatchObject({ air: 0 });
      expect(counts(after, 'toxic')).toEqual({ toxic: 0, not_toxic: 1 });
    });

    it('neither a deleted deity link nor a deleted deity', async () => {
      const selene = await idOf('deities', 'Selene');
      const hecate = await idOf('deities', 'Hecate');
      const entry = await add('Alphawort');
      const link = await insertDeityLink(sql, entry, hecate, 0, A.id);
      await insertDeityLink(sql, entry, selene, 1, A.id);
      expect(counts(await findCompendiumFacets({}), 'deities')).toEqual({
        [hecate]: 1,
        [selene]: 1,
      });

      await sql`
        update ingredient_deities set deleted_at = now(), deleted_by = ${A.id} where id = ${link}`;
      await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${selene}`;

      expect((await findCompendiumFacets({})).deities).toEqual([]);
    });

    it('neither a deleted category nor a deleted sign or body', async () => {
      const love = await idOf('categories', 'Love');
      await add('Alphawort', {
        categories: ['Love'],
        zodiacSigns: ['Leo'],
        celestialBodies: ['Mars'],
      });
      const before = await findCompendiumFacets({});
      expect(counts(before, 'categories')).toEqual({ [love]: 1 });
      expect(counts(before, 'zodiacSigns')).toMatchObject({ Leo: 1 });
      expect(counts(before, 'celestialBodies')).toMatchObject({ Mars: 1 });

      await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where id = ${love}`;
      await sql`
        update zodiac_signs set deleted_at = now(), deleted_by = ${A.id} where name = 'Leo'`;
      await sql`
        update celestial_bodies set deleted_at = now(), deleted_by = ${A.id} where name = 'Mars'`;

      const after = await findCompendiumFacets({});
      expect(after.categories).toEqual([]);
      expect(after.zodiacSigns.map(({ value }) => value)).not.toContain('Leo');
      expect(after.celestialBodies.map(({ value }) => value)).not.toContain('Mars');
    });
  });
});
