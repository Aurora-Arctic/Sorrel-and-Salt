import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { PgTable } from 'drizzle-orm/pg-core';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FLAT, TWO_TIER } from '@/db/vocabularies';
import { categoryGroups } from '@/modules/vocabulary/schema/categories';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from './types';

// The eight curated vocabularies, driven off the registry the repository and
// the seed read, so a ninth is covered by the line that adds it. What every
// vocabulary shares runs once per table; foreign keys, NOT NULL and the
// partial unique indexes are the drift test's and the sweeps'
// (claude-docs/testing/db-harness.md, "The db test harness").

const AUTHOR = FIXTURE_USERS.A.id;
const SHARED = ['id', 'name', 'slug', 'description', 'seed_key'];

// One hex per theme on a category group: the chip colour is the group's pair (MB.35).
const COLOURS = { color_dark: '#c9a66b', color_light: '#7a5a1f' };

const nameOf = (table: PgTable) => getTableConfig(table).name;

const PAIRS = Object.values(TWO_TIER).map((pair) => ({
  items: nameOf(pair.items),
  groups: nameOf(pair.groups),
  groupColumn: pair.column.name,
  groupExtra: pair.groups === categoryGroups ? COLOURS : {},
}));

/** Every vocabulary table, with what it carries beside the shared columns. */
const TABLES = [
  ...PAIRS.flatMap(({ items, groups, groupColumn, groupExtra }) => [
    { table: groups, own: Object.keys(groupExtra), parent: undefined },
    { table: items, own: [groupColumn], parent: { groups, groupColumn, groupExtra } },
  ]),
  ...Object.values(FLAT).map((table) => ({ table: nameOf(table), own: [], parent: undefined })),
];

const DRIZZLE = Object.fromEntries(
  [
    ...Object.values(TWO_TIER).flatMap((pair) => [pair.items, pair.groups]),
    ...Object.values(FLAT),
  ].map((table) => [nameOf(table), table]),
);

/** The vocabularies the member's autofill searches by trigram. */
const SEARCHED = ['ingredient_forms', 'deities', 'planets', 'zodiac_signs'];

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

/** A short token no seeded row and no other call holds. */
const token = () => crypto.randomUUID().slice(0, 8);

// Invented names throughout (M1.25), each carrying a fresh token.
function vocabularyRow(overrides: Row = {}): Row {
  const t = token();
  return {
    name: `Testara ${t}`,
    slug: `testara-${t}`,
    description: 'A row kept only by fixtures.',
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

async function insert(table: string, row: Row): Promise<string> {
  const [inserted] = await sql`insert into ${sql(table)} ${sql(row)} returning id`;
  return inserted.id as string;
}

/** A row of `table`, filed under a fresh group when the table is two-tier. */
async function rowOf(entry: (typeof TABLES)[number], overrides: Row = {}): Promise<Row> {
  if (!entry.parent) {
    return vocabularyRow({ ...(entry.table === 'category_groups' ? COLOURS : {}), ...overrides });
  }
  const { groups, groupColumn, groupExtra } = entry.parent;
  const group = await insert(groups, vocabularyRow(groupExtra));
  return vocabularyRow({ [groupColumn]: group, ...overrides });
}

describe.each(TABLES)('$table', (entry) => {
  it('has DESIGN.md §5 columns and nothing else', () => {
    const { byName } = tableFacts(DRIZZLE[entry.table]);

    expect(Object.keys(byName).sort()).toEqual([...SHARED, ...entry.own, ...AUDIT_COLUMNS].sort());
  });

  // NOT NULL alone accepts '' and '   ', and a curated value exists to explain itself.
  it('refuses a blank description, where the same row with one is admitted', async () => {
    await insert(entry.table, await rowOf(entry));

    for (const blank of ['', '   ']) {
      const error = await failureOf(
        insert(entry.table, await rowOf(entry, { description: blank })),
      );

      // 23514 is check_violation, named: the refusal is this CHECK's.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(`${entry.table}_description_not_blank`);
    }
  });
});

describe.each(PAIRS)('$items under $groups', ({ items, groups, groupColumn, groupExtra }) => {
  // Global rather than per group: a chip filter and the seed's idempotency key
  // both read the slug alone.
  it('refuses a slug another group’s item already holds', async () => {
    const first = await insert(groups, vocabularyRow(groupExtra));
    const second = await insert(groups, vocabularyRow(groupExtra));
    const held = vocabularyRow({ [groupColumn]: first });
    await insert(items, held);

    const error = await failureOf(
      insert(items, vocabularyRow({ [groupColumn]: second, slug: held.slug })),
    );

    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe(`${items}_slug_unique`);
  });

  // The deliberate gap: uniqueness is on the slug alone, so two live items may
  // share a display name — "Wax", animal and substance; one god honoured under
  // two traditions — and the autofill shows the group beside each. A `name`
  // index would supersede that; say so rather than deleting this test.
  it('admits two live items sharing a display name under two groups', async () => {
    const name = `Fixturia ${token()}`;
    const first = await insert(groups, vocabularyRow(groupExtra));
    const second = await insert(groups, vocabularyRow(groupExtra));

    await insert(items, vocabularyRow({ [groupColumn]: first, name }));
    await insert(items, vocabularyRow({ [groupColumn]: second, name }));

    const rows = await sql`
      select ${sql(groupColumn)} as group_id from ${sql(items)}
      where name = ${name} and deleted_at is null
    `;
    expect(rows.map((row) => row.group_id).sort()).toEqual([first, second].sort());
  });
});

describe.each(SEARCHED)('%s', (table) => {
  // Matched by `%` and `<%` through the index, a name and a description alike
  // (claude-docs/db/member-autofill.md, "The member's autofill").
  it('indexes name and description for trigram matching in one gin index', async () => {
    const index = await catalogue.indexRow(table, `${table}_trgm`);

    expect(index?.unique).toBe(false);
    expect(index?.predicate).toBeNull();
    expect(index?.definition).toContain('USING gin (name gin_trgm_ops, description gin_trgm_ops)');
  });
});
