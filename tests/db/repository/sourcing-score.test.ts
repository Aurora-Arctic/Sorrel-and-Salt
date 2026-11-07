import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { listCompendium, readSourcingScore } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../support/as-user';
import { findCompendiumPage } from '@/db/repository';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import {
  type CitationFields,
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../support/db/insert-reference';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../support/fixtures';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const entry = (name: string, overrides: Partial<IngredientFixture> = {}) =>
  insertIngredient(
    sql,
    makeIngredient({
      workspaceId: null,
      name,
      ...(overrides.nomenclature
        ? {}
        : { canonicalName: `Fixtura ${name.split(' ')[1]!.toLowerCase()}` }),
      ...overrides,
    }),
    A.id,
  );

const work = (fields: Record<string, unknown> = {}) => insertReference(sql, fields, A.id);

const cite = (
  id: string,
  reference: string,
  locator: string | null,
  citation: CitationFields = {},
) => insertReferenceLink(sql, id, reference, A.id, locator, citation);

async function formsOf(id: string): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from ingredient_variants where ingredient_id = ${id} order by form, id`;
  return rows.map((row) => row.id);
}

async function seedEntries(): Promise<void> {
  await entry('Testwort Bare');

  // A web page, unaudited and unlocated, nomenclature unknown, a safety note unsourced: 10 + 8 + 0 - 10 - 15 - 5.
  const unknown = await entry('Testwort Unknown', {
    nomenclature: 'unknown',
    safetyNotes: 'Not to be eaten.',
  });
  await cite(
    unknown,
    await work({
      kind: 'web_page',
      container: 'Wikipedia',
      title: 'Testwort',
      url: 'https://en.wikipedia.org/wiki/Testwort',
      accessed: '2026-01-01',
    }),
    null,
    {
      name_basis: 'unaudited',
    },
  );

  // Reviewed, four sources (sources capped), a scholarly best, name backed 2 of 4, three print citations unlocated,
  // a form's safety note sourced, four bare forms of five (capped) and a removed bare form that counts for nothing.
  const scholarly = await entry('Testwort Scholarly', {
    variants: ['Leaf', 'Root', 'Seed', 'Bark', 'Flower'].map((form) =>
      makeVariant({ form, safetyNotes: form === 'Leaf' ? 'Irritant.' : null }),
    ),
  });
  await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${E.id} where id = ${scholarly}`;
  const [leaf] = await formsOf(scholarly);
  await cite(
    scholarly,
    await work({
      kind: 'article',
      title: 'Testwort Studies',
      container: 'Journal of Fixtures',
      scholarly: true,
    }),
    'p. 4',
    {
      name_basis: 'stated',
    },
  );
  await cite(scholarly, await work({ title: 'Testwort Herbal' }), null, { name_basis: 'resolved' });
  await cite(
    scholarly,
    await work({ kind: 'chapter', title: 'On Testwort', container: 'Herbals' }),
    null,
    {
      name_basis: 'unresolved',
    },
  );
  await insertVariantReferenceLink(
    sql,
    leaf!,
    await work({ kind: 'entry', title: 'Testwort', container: 'Lexicon' }),
    A.id,
    null,
    {
      supports: ['form', 'safetyNotes'],
    },
  );
  const removed = await sql<{ id: string }[]>`
    insert into ingredient_variants (ingredient_id, form, created_by, updated_by, deleted_at, deleted_by)
    values (${scholarly}, 'Resin', ${A.id}, ${A.id}, now(), ${A.id}) returning id`;
  expect(removed).toHaveLength(1);

  // Six print citations with no locator: sources and locators both past their caps; the name backed 1 of 6.
  const crowded = await entry('Testwort Crowded', { variants: [] });
  for (const [index, basis] of (
    ['stated', null, null, 'unaudited', null, null] as const
  ).entries()) {
    await cite(crowded, await work({ title: `Testwort Book ${index}` }), null, {
      name_basis: basis,
    });
  }

  await entry('Testwort Nameless', { nomenclature: 'none', canonicalName: null, variants: [] });

  // Its one form cites the only source, located, the name backed 1 of 2 (7.5, rounded up); the entry's own second citation
  // is of the same work, so one source.
  const halves = await entry('Testwort Halves', { variants: [makeVariant({ form: 'Oil' })] });
  const book = await work({ title: 'Testwort Oils' });
  const [oil] = await formsOf(halves);
  await insertVariantReferenceLink(sql, oil!, book, A.id, 'p. 9', { name_basis: 'stated' });
  await cite(halves, book, 'p. 10', { name_basis: null });

  // What the score never reads: a removed link, a removed work and a coven's own source.
  const ignored = await entry('Testwort Ignored', { variants: [] });
  const gone = await cite(ignored, await work({ title: 'Testwort Gone' }), null, {
    name_basis: 'stated',
  });
  await sql`update reference_links set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
  const goneWork = await work({ title: 'Testwort Pulped' });
  await cite(ignored, goneWork, null, { name_basis: 'stated' });
  await sql`update "references" set deleted_at = now(), deleted_by = ${A.id} where id = ${goneWork}`;
  await cite(
    ignored,
    await work({ title: 'Testwort Coven Notes', workspace_id: WORKSPACE_W_ID }),
    null,
    {
      name_basis: 'stated',
    },
  );

  const hidden = await entry('Testwort Hidden');
  await sql`update ingredients set shown = false where id = ${hidden}`;
}

const PAGE = { limit: 100, inverted: false };

describe('the compendium list sorted by sourcing score', () => {
  it("sorts on the pure function's scores, lowest first, then name, then id", async () => {
    await seedEntries();
    const listed = await listCompendium(
      { sort: 'sourcing_score', listing: 'all' },
      PAGE,
      asUser(E),
    );
    expect(listed).toHaveLength(8);

    const scored = await Promise.all(
      listed.map(async ({ node }) => ({
        id: node.id,
        name: node.name,
        score: (await readSourcingScore(asUser(E), node.id)).score,
      })),
    );
    const expected = [...scored].sort(
      (left, right) =>
        left.score - right.score ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );
    expect(scored).toEqual(expected);
    // The cursor carries the value the SQL sorted on: the same score, entry by entry, not merely the same order.
    expect(listed.map(({ cursor }) => Number(cursor.key[0]))).toEqual(
      scored.map((row) => row.score),
    );
    // Spread wide, with two ties the name breaks (Bare and Hidden at -5, Crowded and Halves at 36), so the order says something.
    expect(scored.map((row) => row.score)).toEqual([-12, -5, -5, 0, 15, 36, 36, 69]);
  });

  it('pages through the sort with its cursor, losing and repeating nothing', async () => {
    await seedEntries();
    const whole = await listCompendium({ sort: 'sourcing_score', listing: 'all' }, PAGE, asUser(E));
    const walked: string[] = [];
    let after = undefined as (typeof whole)[number]['cursor'] | undefined;
    for (;;) {
      const page = await listCompendium(
        { sort: 'sourcing_score', listing: 'all' },
        { limit: 3, inverted: false, after },
        asUser(E),
      );
      walked.push(...page.slice(0, 2).map(({ node }) => node.id));
      if (page.length < 3) break;
      after = page[1]!.cursor;
    }
    expect(walked).toEqual(whole.map(({ node }) => node.id));
  });

  it('is refused to anyone who does not curate, signed out included', async () => {
    await expect(
      listCompendium({ sort: 'sourcing_score' }, PAGE, asUser(B)),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(listCompendium({ sort: 'sourcing_score' }, PAGE, null)).rejects.toBeInstanceOf(
      Forbidden,
    );
    // The same read without the sort is open to both, so the sort is what is refused.
    await expect(listCompendium({}, PAGE, asUser(B))).resolves.toBeDefined();
    await expect(listCompendium({}, PAGE, null)).resolves.toBeDefined();
  });
});

type ListFilter = Parameters<typeof listCompendium>[0];

async function walkBothWays(
  filter: ListFilter,
): Promise<{ forwards: string[]; backwards: string[] }> {
  const forwards: string[] = [];
  let after = undefined as Awaited<ReturnType<typeof listCompendium>>[number]['cursor'] | undefined;
  for (;;) {
    const page = await listCompendium(filter, { limit: 2, inverted: false, after }, asUser(E));
    forwards.push(...page.map(({ node }) => node.id));
    if (page.length < 2) break;
    after = page[1]!.cursor;
  }
  // An inverted read comes back nearest the bound first, as `resolvePage` receives it before reversing.
  const backwards: string[] = [];
  let before = undefined as typeof after;
  for (;;) {
    const page = await listCompendium(filter, { limit: 2, inverted: true, before }, asUser(E));
    backwards.unshift(...page.map(({ node }) => node.id).reverse());
    if (page.length < 2) break;
    before = page[1]!.cursor;
  }
  return { forwards, backwards };
}

describe('the compendium list in either direction', () => {
  it('reverses the sourcing order exactly with order desc, highest score first', async () => {
    await seedEntries();
    const lowest = await listCompendium(
      { sort: 'sourcing_score', listing: 'all' },
      PAGE,
      asUser(E),
    );
    const highest = await listCompendium(
      { sort: 'sourcing_score', order: 'desc', listing: 'all' },
      PAGE,
      asUser(E),
    );
    expect(highest).toHaveLength(8);
    expect(highest.map(({ node }) => node.id)).toEqual(lowest.map(({ node }) => node.id).reverse());
    expect(Number(highest[0]!.cursor.key[0])).toBe(69);
  });

  it('sorts by name A to Z with sort name, and Z to A with order desc', async () => {
    await seedEntries();
    const names = (rows: Awaited<ReturnType<typeof listCompendium>>) =>
      rows.map(({ node }) => node.name);
    const az = names(await listCompendium({ sort: 'name', listing: 'all' }, PAGE, asUser(E)));
    expect(az).toHaveLength(8);
    expect(az).toEqual([...az].sort((left, right) => left.localeCompare(right)));
    const za = names(
      await listCompendium({ sort: 'name', order: 'desc', listing: 'all' }, PAGE, asUser(E)),
    );
    expect(za).toEqual([...az].reverse());
  });

  it('orders a search by name, not best match, when sorted by name', async () => {
    await seedEntries();
    // "Testwort Halves" is the best match for "halves", and every entry matches "testwort".
    const best = await listCompendium(
      { query: 'Testwort Halves', listing: 'all' },
      PAGE,
      asUser(E),
    );
    expect(best[0]!.node.name).toBe('Testwort Halves');
    const byName = await listCompendium(
      { query: 'Testwort Halves', sort: 'name', listing: 'all' },
      PAGE,
      asUser(E),
    );
    expect(byName.map(({ node }) => node.id).sort()).toEqual(
      best.map(({ node }) => node.id).sort(),
    );
    const names = byName.map(({ node }) => node.name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
    expect(names[0]).not.toBe('Testwort Halves');
  });

  it('leaves the default order alone under order desc with no sort', async () => {
    await seedEntries();
    const plain = await listCompendium({ listing: 'all' }, PAGE, asUser(E));
    const asked = await listCompendium({ order: 'desc', listing: 'all' }, PAGE, asUser(E));
    expect(asked.map(({ node }) => node.id)).toEqual(plain.map(({ node }) => node.id));
  });

  it.each([
    ['sourcing score, lowest first', { sort: 'sourcing_score' }],
    ['sourcing score, highest first', { sort: 'sourcing_score', order: 'desc' }],
    ['name, A to Z', { sort: 'name' }],
    ['name, Z to A', { sort: 'name', order: 'desc' }],
  ] as const)(
    'pages the %s order across page boundaries both ways, repeating and skipping nothing',
    async (_label, order) => {
      await seedEntries();
      const filter: ListFilter = { ...order, listing: 'all' };
      const whole = (await listCompendium(filter, PAGE, asUser(E))).map(({ node }) => node.id);
      expect(whole).toHaveLength(8);
      const { forwards, backwards } = await walkBothWays(filter);
      expect(forwards).toEqual(whole);
      expect(backwards).toEqual(whole);
    },
  );

  it('refuses the highest-first sourcing order to anyone who does not curate, and lets anyone sort by name', async () => {
    await expect(
      listCompendium({ sort: 'sourcing_score', order: 'desc' }, PAGE, asUser(B)),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      listCompendium({ sort: 'sourcing_score', order: 'desc' }, PAGE, null),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      listCompendium({ sort: 'name', order: 'desc' }, PAGE, asUser(B)),
    ).resolves.toBeDefined();
    await expect(
      listCompendium({ sort: 'name', order: 'desc' }, PAGE, null),
    ).resolves.toBeDefined();
  });
});

describe('the sourcing score carried on each listed entry', () => {
  it("carries the pure function's score on each row of a curator's page, read in the list's own query", async () => {
    await seedEntries();
    const listed = await listCompendium(
      { withSourcingScore: true, listing: 'all' },
      PAGE,
      asUser(E),
    );
    expect(listed).toHaveLength(8);
    for (const { node, sourcingScore } of listed) {
      expect(sourcingScore).toBe((await readSourcingScore(asUser(E), node.id)).score);
    }
  });

  it('carries no score unless asked for', async () => {
    await seedEntries();
    const listed = await listCompendium({ listing: 'all' }, PAGE, asUser(E));
    expect(listed).toHaveLength(8);
    for (const entry of listed) expect(entry).not.toHaveProperty('sourcingScore');
  });

  it('refuses the score to a member, a viewer, an outsider and a signed-out read, which the repository would otherwise answer', async () => {
    await seedEntries();
    // Without the service's guard the same filter answers every row with a score: the guard is what stands between.
    const unguarded = await findCompendiumPage({ withSourcingScore: true }, PAGE);
    expect(unguarded.length).toBeGreaterThan(0);
    for (const { sourcingScore } of unguarded) expect(sourcingScore).toEqual(expect.any(Number));

    for (const viewer of [asUser(B), asUser(C), asUser(D), null]) {
      await expect(
        listCompendium({ withSourcingScore: true }, PAGE, viewer),
      ).rejects.toBeInstanceOf(Forbidden);
      // The same read without the score is open to each, so the score is what is refused.
      await expect(listCompendium({}, PAGE, viewer)).resolves.toHaveLength(unguarded.length);
    }
  });
});
