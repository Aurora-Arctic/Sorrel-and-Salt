import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { PgTable } from 'drizzle-orm/pg-core';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FLAT, TWO_TIER } from '@/db/vocabularies';
import { categoryGroups } from '@/modules/vocabulary/schema/categories';
import { formGroupIcon, ingredientFormGroups } from '@/modules/vocabulary/schema/ingredient-forms';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from './types';

const AUTHOR = FIXTURE_USERS.A.id;
const SHARED = ['id', 'name', 'slug', 'description', 'seed_key'];

const COLOURS = { color_dark: '#c9a66b', color_light: '#7a5a1f' };

const nameOf = (table: PgTable) => getTableConfig(table).name;

const GROUP_EXTRAS = new Map<PgTable, { own: string[]; values: Row }>([
  [categoryGroups, { own: Object.keys(COLOURS), values: COLOURS }],
  [ingredientFormGroups, { own: ['icon'], values: {} }],
]);

const PAIRS = Object.values(TWO_TIER).map((pair) => ({
  items: nameOf(pair.items),
  groups: nameOf(pair.groups),
  groupColumn: pair.column.name,
  groupOwn: GROUP_EXTRAS.get(pair.groups)?.own ?? [],
  groupExtra: GROUP_EXTRAS.get(pair.groups)?.values ?? {},
}));

const TABLES = [
  ...PAIRS.flatMap(({ items, groups, groupColumn, groupOwn, groupExtra }) => [
    { table: groups, own: groupOwn, parent: undefined },
    { table: items, own: [groupColumn], parent: { groups, groupColumn, groupExtra } },
  ]),
  // The flat vocabularies, celestial bodies and zodiac signs, each carry a curated position.
  ...Object.values(FLAT).map((table) => ({
    table: nameOf(table),
    own: ['position'],
    parent: undefined,
  })),
];

const DRIZZLE = Object.fromEntries(
  [
    ...Object.values(TWO_TIER).flatMap((pair) => [pair.items, pair.groups]),
    ...Object.values(FLAT),
  ].map((table) => [nameOf(table), table]),
);

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const token = () => crypto.randomUUID().slice(0, 8);

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

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(`${entry.table}_description_not_blank`);
    }
  });
});

describe.each(PAIRS)('$items under $groups', ({ items, groups, groupColumn, groupExtra }) => {
  // Deliberate gap: uniqueness is on the slug alone, so two live items may share a display name ("Wax" animal and substance; one god under two traditions), and the autofill shows the group beside each.
  // A `name` index would supersede this; say so rather than deleting the test.
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

// A closed list, so an enum, and nullable: NULL is the generic icon, not a missing answer.
describe('ingredient_form_groups.icon', () => {
  it('holds exactly the six icons, as the code declares them', async () => {
    const [range] = await sql`select enum_range(null::form_group_icon)::text[] as icons`;

    expect(range.icons).toEqual(['botanical', 'animal', 'mineral', 'substance', 'fluid', 'curio']);
    expect(formGroupIcon.enumValues).toEqual(range.icons);
  });
});
