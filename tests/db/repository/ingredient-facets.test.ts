import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

// How many compendium entries each facet value would list, read in one grouped query per kind. Each count is checked against the list's own count under the filter the value stands for, so the facets cannot drift from the arms that match.
// The ingredient tables are emptied per test, so every row a count could come from is one this file wrote.

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

/** The list filter a facet value stands for: `base` with the value as its kind's only selection, or, for a category under `all`, added to those already chosen. */
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

// The order of each kind's values, the same on the compendium's read and a coven's: names alphabetical in natural-language order (case set aside, an accented letter beside its plain one), a category under its group, a deity under its tradition,
// signs and bodies by curated position then unpositioned by name; never by count (claude-docs/design-decisions/m12.52-facet-sort-order.md). Each list's counts run against its alphabetical order, so a count order and a code-unit order would each read differently.
describe("the order of each kind's values (M12.52)", () => {
  /** Ids of the invented curated rows, by name. */
  const ids = new Map<string, string>();
  const idsOf = (...names: string[]) => names.map((name) => ids.get(name) as string);

  beforeAll(async () => {
    const stamps = { description: 'Invented', created_by: A.id, updated_by: A.id };
    const colours = { color_dark: '#8b5cf6', color_light: '#5b21b6' };
    const slug = (name: string) =>
      `m1252-${name.normalize('NFD').replace(/\W/g, '').toLowerCase()}`;
    const groups = await sql`
      insert into category_groups ${sql(
        ['Mossward', 'Éventail', 'alderkin'].map((name) => ({
          name,
          slug: slug(name),
          ...colours,
          ...stamps,
        })),
      )} returning id, name`;
    const groupId = new Map(groups.map((row) => [row.name as string, row.id as string]));
    const categoryRows = await sql`
      insert into categories ${sql(
        [
          ['Ashmark', 'Mossward'],
          ['émbermark', 'Mossward'],
          ['Corvmark', 'Mossward'],
          ['quillmark', 'Éventail'],
          ['Brackenmark', 'Éventail'],
          ['Zestmark', 'alderkin'],
        ].map(([name, group]) => ({
          name,
          slug: slug(name),
          group_id: groupId.get(group) as string,
          ...stamps,
        })),
      )} returning id, name`;
    const traditions = await sql`
      insert into deity_traditions ${sql(
        ['Quorran', 'Ébrani', 'aldish'].map((name) => ({ name, slug: slug(name), ...stamps })),
      )} returning id, name`;
    const traditionId = new Map(traditions.map((row) => [row.name as string, row.id as string]));
    const deityRows = await sql`
      insert into deities ${sql(
        [
          ['Dunmar', 'Quorran'],
          ['Céleth', 'Quorran'],
          ['bellith', 'Ébrani'],
          ['Bryndel', 'Ébrani'],
          ['Annoch', 'Ébrani'],
          ['Yorrow', 'aldish'],
        ].map(([name, tradition]) => ({
          name,
          slug: slug(name),
          tradition_id: traditionId.get(tradition) as string,
          ...stamps,
        })),
      )} returning id, name`;
    for (const row of [...categoryRows, ...deityRows])
      ids.set(row.name as string, row.id as string);
    // Curated with no position, as a curator's addition is: each sorts after
    // the positioned rows, among the other unpositioned ones by name.
    await sql`
      insert into zodiac_signs ${sql(
        ['Zuvsign', 'ébsign', 'Aardsign'].map((name) => ({ name, slug: slug(name), ...stamps })),
      )}`;
    await sql`
      insert into celestial_bodies ${sql(
        ['Zuvbody', 'éstrabody', 'Aldmoon'].map((name) => ({ name, slug: slug(name), ...stamps })),
      )}`;
  });

  const reads = [
    {
      read: "the compendium's",
      workspaceId: undefined,
      facets: (filter: IngredientFilter): Promise<IngredientFacets> => findCompendiumFacets(filter),
    },
    {
      read: "a coven's",
      workspaceId: WORKSPACE_W_ID,
      facets: async (filter: IngredientFilter): Promise<IngredientFacets> =>
        findWorkspaceIngredientFacets(
          await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] }),
          filter,
        ),
    },
  ];

  describe.each(reads)('on $read read', ({ workspaceId, facets }) => {
    /** Six entries, the first carrying every value and each later one fewer, so counts fall as names rise: zedform on all six, Alphaform on one; Ashmark on five, Zestmark on one; Dunmar on five, Yorrow on one; Pisces and Vesta on all six. */
    async function seedEntries(): Promise<void> {
      const forms = [
        'zedform',
        'Fimbleform',
        'Ecluseform',
        'Éclatform',
        'Eclatform',
        'Cetaform',
        'betaform',
        'Alphaform',
      ];
      const formsOn = [8, 6, 5, 3, 2, 1];
      const categoryNames = ['Ashmark', 'émbermark', 'quillmark', 'Brackenmark', 'Zestmark'];
      const deityNames = ['Dunmar', 'Céleth', 'bellith', 'Annoch', 'Yorrow'];
      const names = ['Alphawort', 'Betawort', 'Gammawort', 'Deltawort', 'Epsilonwort', 'Zetawort'];
      for (const [index, name] of names.entries()) {
        const kept = Math.max(names.length - 1 - index, 0);
        const entry = await add(name, {
          workspaceId: workspaceId ?? null,
          variants: forms.slice(0, formsOn[index]).map((form) => makeVariant({ form })),
          categories: categoryNames.slice(0, kept),
          zodiacSigns: ['Pisces'],
          celestialBodies: ['Vesta'],
        });
        for (const [position, deityId] of idsOf(...deityNames.slice(0, kept)).entries()) {
          await insertDeityLink(sql, entry, deityId, position, A.id);
        }
      }
    }

    // Both reads share one `orderBy` that takes no membership, so the order
    // is proved on the compendium's read alone. The coven's columns
    // come from its membership, so the signs-and-bodies case runs on both.
    if (workspaceId === undefined) {
      it('orders forms by name, case set aside and an accent beside its plain letter, whatever the counts', async () => {
        await seedEntries();

        const read = await facets({});

        expect(read.forms.map(({ value }) => value)).toEqual([
          'Alphaform',
          'betaform',
          'Cetaform',
          'Eclatform',
          'Éclatform',
          'Ecluseform',
          'Fimbleform',
          'zedform',
        ]);
        // Why a count order would have read otherwise: the counts fall as the names rise.
        expect(counts(read, 'forms')).toEqual({
          zedform: 6,
          Fimbleform: 5,
          Ecluseform: 4,
          Éclatform: 3,
          Eclatform: 3,
          Cetaform: 2,
          betaform: 1,
          Alphaform: 1,
        });
      });

      it('orders categories by group name, then by name, both alphabetical', async () => {
        await seedEntries();

        const read = await facets({});

        expect(read.categories.map(({ value }) => value)).toEqual(
          idsOf('Zestmark', 'Brackenmark', 'quillmark', 'Ashmark', 'émbermark'),
        );
        // Why a count order, or a flat name order, would have read otherwise.
        expect(read.categories.map(({ count }) => count)).toEqual([1, 2, 3, 5, 4]);
      });

      it('orders deities by tradition name, then by name, both alphabetical', async () => {
        await seedEntries();

        const read = await facets({});

        expect(read.deities.map(({ value }) => value)).toEqual(
          idsOf('Yorrow', 'Annoch', 'bellith', 'Céleth', 'Dunmar'),
        );
        expect(read.deities.map(({ count }) => count)).toEqual([1, 2, 3, 4, 5]);
      });

      it('keeps each list in the same order when a narrowing changes the counts', async () => {
        await seedEntries();
        const whole = await facets({});
        const narrowed = await facets({ categoryIds: idsOf('Brackenmark') });
        // Why the order could have moved: the narrowing changed the counts.
        expect(counts(narrowed, 'forms')).not.toEqual(counts(whole, 'forms'));

        for (const kind of ['forms', 'categories', 'deities'] as const) {
          const listed = new Set(narrowed[kind].map(({ value }) => value));
          expect({ kind, order: narrowed[kind].map(({ value }) => value) }).toEqual({
            kind,
            order: whole[kind].map(({ value }) => value).filter((value) => listed.has(value)),
          });
        }
      });

      it('lists a chosen form, deity or category counting nothing in its alphabetical place, not last', async () => {
        await seedEntries();

        const forms = await facets({ forms: ['Dovetailform'] });
        const deityRead = await facets({ deityIds: idsOf('Bryndel') });
        const categoryRead = await facets({ categoryIds: idsOf('Corvmark'), categoryMode: 'any' });

        expect(forms.forms.map(({ value, count }) => [value, count])).toEqual([
          ['Alphaform', 1],
          ['betaform', 1],
          ['Cetaform', 2],
          ['Dovetailform', 0],
          ['Eclatform', 3],
          ['Éclatform', 3],
          ['Ecluseform', 4],
          ['Fimbleform', 5],
          ['zedform', 6],
        ]);
        expect(deityRead.deities.map(({ value, count }) => [value, count])).toEqual([
          [ids.get('Yorrow'), 1],
          [ids.get('Annoch'), 2],
          [ids.get('bellith'), 3],
          [ids.get('Bryndel'), 0],
          [ids.get('Céleth'), 4],
          [ids.get('Dunmar'), 5],
        ]);
        expect(categoryRead.categories.map(({ value, count }) => [value, count])).toEqual([
          [ids.get('Zestmark'), 1],
          [ids.get('Brackenmark'), 2],
          [ids.get('quillmark'), 3],
          [ids.get('Ashmark'), 5],
          [ids.get('Corvmark'), 0],
          [ids.get('émbermark'), 4],
        ]);
      });
    }

    it('orders signs in calendar order and bodies in solar-system order, then the unpositioned by name', async () => {
      await seedEntries();

      const read = await facets({});

      expect(read.zodiacSigns.map(({ value }) => value)).toEqual([
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces',
        'Ophiuchus',
        'Aardsign',
        'ébsign',
        'Zuvsign',
      ]);
      expect(read.celestialBodies.map(({ value }) => value)).toEqual([
        'Sun',
        'Moon',
        'Mercury',
        'Venus',
        'Earth',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune',
        'Pluto',
        'Aldmoon',
        'Ceres',
        'Chiron',
        'éstrabody',
        'Juno',
        'Lilith',
        'North Node',
        'Pallas',
        'South Node',
        'Vesta',
        'Zuvbody',
      ]);
      // Why a count order would have read otherwise: Pisces and Vesta count six, the rest none.
      expect(counts(read, 'zodiacSigns')).toMatchObject({ Pisces: 6, Aries: 0 });
      expect(counts(read, 'celestialBodies')).toMatchObject({ Vesta: 6, Sun: 0 });
    });
  });
});

describe('findCompendiumFacets', () => {
  let protection: string;
  let cleansing: string;
  let hecate: string;
  let apollo: string;

  /** Four compendium entries spread over every kind, and a coven entry that matches them all and must count for none. */
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

  it('orders a dynamic kind by value, whatever the counts (M12.52)', async () => {
    await seedEntries();

    const facets = await findCompendiumFacets({});

    expect(facets.forms.map(({ value }) => value)).toEqual(['Bark', 'Resin', 'Root', 'Testform']);
  });

  it('lists every live sign and body, every element and both toxic settings, zeros included', async () => {
    await add('Alphawort', { zodiacSigns: ['Leo'] });
    const signs = await sql`select name from zodiac_signs where deleted_at is null`;
    const bodies = await sql`
      select name from celestial_bodies where deleted_at is null`;

    const facets = await findCompendiumFacets({});

    // The order is another block's subject; here only the membership.
    expect(facets.zodiacSigns.map(({ value }) => value).sort()).toEqual(
      signs.map((row) => row.name as string).sort(),
    );
    expect([...facets.celestialBodies].sort((a, b) => (a.value < b.value ? -1 : 1))).toEqual(
      bodies
        .map((row) => ({ value: row.name as string, count: 0 }))
        .sort((a, b) => (a.value < b.value ? -1 : 1)),
    );
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

    it('sends at most nine reads for the compendium and eleven for a coven, with a search or without', async () => {
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
      // value would send far more than nine. The ninth is the Reviewed counts
      // , read apart because their filter leaves out its own setting.
      expect(compendium[0].length).toBeGreaterThan(0);
      for (const reads of compendium) expect(reads.length).toBeLessThanOrEqual(9);
      for (const reads of coven) expect(reads.length).toBeLessThanOrEqual(11);
    });

    it('sends no Reviewed counts read unless asked for them (M14.8)', async () => {
      await seedEntries();
      const filter: IngredientFilter = { zodiacSigns: ['leo'] };

      const asked = await readsOf(() => findCompendiumFacets(filter, true));
      const notAsked = await readsOf(() => findCompendiumFacets(filter, false));

      // Why it could have failed: asked, the counts come back and cost a read.
      expect((await findCompendiumFacets(filter, true)).reviewed).not.toBeNull();
      expect(notAsked.length).toBe(asked.length - 1);
      expect((await findCompendiumFacets(filter, false)).reviewed).toBeNull();
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

    it('counts each switch under the other, as the list reads them with both on', async () => {
      const citedNoForm = await add('Alphawort', { variants: [] });
      await cite(citedNoForm);
      await add('Betawort', { variants: [] });
      const citedFormed = await add('Gammawort', { variants: [makeVariant({ form: 'Resin' })] });
      await cite(citedFormed);
      await add('Deltawort', { variants: [makeVariant({ form: 'Resin' })] });
      const { totalCount } = await findCompendiumCount(
        { withoutReferences: true, withoutForms: true },
        undefined,
      );
      // Why it could have counted otherwise: two entries lack a form and two
      // cite nothing, but only one is both.
      expect(totalCount).toBe(1);

      for (const switches of [{ withoutReferences: true }, { withoutForms: true }]) {
        const facets = await findCompendiumFacets(switches);
        expect({
          withoutReferences: facets.withoutReferences,
          withoutForms: facets.withoutForms,
        }).toEqual({
          withoutReferences: switches.withoutForms ? 1 : 2,
          withoutForms: switches.withoutReferences ? 1 : 2,
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

  describe('the No Form count', () => {
    it('counts the entries with no live form as the list reads them, the switch on or off', async () => {
      await add('Alphawort', { variants: [], zodiacSigns: ['Leo'] });
      await add('Betawort', { variants: [], zodiacSigns: ['Leo'] });
      await add('Gammawort', { variants: [makeVariant({ form: 'Resin' })], zodiacSigns: ['Leo'] });
      await add('Deltawort', { variants: [], zodiacSigns: ['Aries'] });
      const base: IngredientFilter = { zodiacSigns: ['leo'] };
      const { totalCount } = await findCompendiumCount({ ...base, withoutForms: true }, undefined);
      // Why it could have counted otherwise: three entries lack a form, two fit the rest.
      expect(totalCount).toBe(2);

      for (const withoutForms of [undefined, false, true]) {
        const facets = await findCompendiumFacets({ ...base, withoutForms });
        expect({ withoutForms, count: facets.withoutForms }).toEqual({
          withoutForms,
          count: totalCount,
        });
      }
    });

    it('counts an entry whose only form is soft-deleted as having none', async () => {
      const entry = await add('Alphawort', { variants: [makeVariant({ form: 'Resin' })] });
      // Why it could have been left out: while the form is live, it is.
      expect((await findCompendiumFacets({})).withoutForms).toBe(0);

      await sql`
        update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
        where ingredient_id = ${entry}`;

      expect((await findCompendiumFacets({})).withoutForms).toBe(1);
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
