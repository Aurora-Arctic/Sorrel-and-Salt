import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as sassCompiler from 'sass';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  SASS_TOKEN_BY_GROUP_NAME,
  seedCategories,
} from './categories';
import { slugify } from '../../lib/slugify';

// M4.3 — the eight groups and every category DESIGN.md §6 lists.
//
// Like index.test.ts (M1.21) this applies the whole migration set into the
// worker's clone rather than stubbing two tables: `categories.group_id` is a
// real foreign key and every row carries audit ids that point at `users`, so
// "the groups land before the categories" is only a claim if both tables are
// the real ones.
//
// Three things are asserted against their *sources* rather than against a copy
// of them, because a copy is exactly what would rot:
//
//   - the vocabulary, parsed out of DESIGN.md §6's own table below
//   - the colours, resolved by compiling M0.7's `category-group-color()`
//   - the contrast floor, recomputed here from the seeded hex
//
// The middle one is the point of the task: MB.35 moved the chip colour out of
// Sass and into data, and the resolution happens once, here. A test that
// hardcoded the sixteen hexes would pass just as happily after someone retuned
// the map and forgot the seed.

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));
const DESIGN_DOC = fileURLToPath(new URL('../../../claude-docs/DESIGN.md', import.meta.url));
const SCSS_DIR = fileURLToPath(new URL('../../scss', import.meta.url));
const VARIABLES_SCSS = `${SCSS_DIR}/_variables.scss`;

// The two page grounds from M0.6, which §6's colours are tuned against — the
// `vs page` column _variables.scss publishes. Not imported from anywhere
// because there is nowhere to import Sass values from; they are asserted
// against the stylesheet below instead, so a repalette fails here.
const GROUNDS = { dark: '#14120e', light: '#efe9da' } as const;

function migrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .flatMap((name) =>
      readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8')
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean),
    );
}

// --- DESIGN.md §6, parsed ---------------------------------------------------

interface DesignGroup {
  name: string;
  slug: string;
  categories: string[];
}

function designSection6(): DesignGroup[] {
  const doc = readFileSync(DESIGN_DOC, 'utf8');
  const section = doc.slice(doc.indexOf('## 6. Category seed'));
  const rows = section
    .slice(0, section.indexOf('\n\n', section.indexOf('| Group')))
    .split('\n')
    .filter((line) => line.startsWith('|'));

  return rows
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells[1] !== 'Group' && !cells[1].startsWith('---'))
    .map((cells) => ({
      name: cells[1],
      slug: cells[2].replace(/`/g, ''),
      categories: cells[3]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    }));
}

const DESIGN_GROUPS = designSection6();
const DESIGN_CATEGORY_COUNT = DESIGN_GROUPS.reduce((n, g) => n + g.categories.length, 0);

// The seed derives every slug from its own name with src/lib/slugify.ts. What
// this file checks is the other half: that the name it derived from is §6's,
// and that §6's own Slug column says the same thing. So the expected slug here
// comes from §6's *table text*, through the shared rule — the module is never
// asked what it thinks the slug is.
function designSlug(designName: string): string {
  return slugify(designName);
}

// --- M0.7, resolved ---------------------------------------------------------

function resolveSassTokenColors(): Record<string, { dark: string; light: string }> {
  const css = sassCompiler.compileString(
    `@use 'sass:map';
     @use 'variables' as v;
     .probe {
       @each $slug, $spec in v.$category-groups {
         --#{$slug}-dark: #{v.category-group-color($slug, dark)};
         --#{$slug}-light: #{v.category-group-color($slug, light)};
       }
     }`,
    { style: 'expanded', loadPaths: [SCSS_DIR] },
  ).css;

  const resolved: Record<string, { dark: string; light: string }> = {};
  for (const line of css.split('\n')) {
    const match = line.match(
      /--([a-z-]+)-(dark|light): (?:rgb\(([\d.]+)%, ([\d.]+)%, ([\d.]+)%\)|(#[0-9a-f]{6}))/,
    );
    if (!match) continue;
    const [, key, theme, r, g, b, hex] = match;
    const value = hex ?? toHex([Number(r), Number(g), Number(b)]);
    resolved[key] = { ...(resolved[key] ?? { dark: '', light: '' }), [theme]: value };
  }
  return resolved;
}

function toHex(percentages: number[]): string {
  return `#${percentages
    .map((p) => Math.round((p / 100) * 255))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

// WCAG 2.1 relative luminance and contrast ratio, recomputed from the stored
// hex rather than trusted from M0.7's published table.
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const SASS_TOKEN_COLORS = resolveSassTokenColors();

// --- database ---------------------------------------------------------------

interface GroupRow {
  id: string;
  name: string;
  slug: string;
  color_dark: string;
  color_light: string;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  group_id: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;
let preexistingTables: string[] = [];
let preexistingTypes: string[] = [];

async function tableNames(): Promise<string[]> {
  const rows = await sql`select tablename from pg_tables where schemaname = 'public'`;
  return rows.map((row) => row.tablename as string);
}

async function enumTypeNames(): Promise<string[]> {
  const rows = await sql`
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  `;
  return rows.map((row) => row.typname as string);
}

async function allGroups(): Promise<GroupRow[]> {
  return sql<GroupRow[]>`select * from category_groups order by slug`;
}

async function allCategories(): Promise<CategoryRow[]> {
  return sql<CategoryRow[]>`select * from categories order by slug`;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  preexistingTables = await tableNames();
  preexistingTypes = await enumTypeNames();

  for (const statement of migrationStatements()) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from categories`;
  await sql`delete from category_groups`;
  await sql`delete from users`;
});

afterAll(async () => {
  for (const table of (await tableNames()).filter((name) => !preexistingTables.includes(name))) {
    await sql.unsafe(`drop table if exists "${table}" cascade`);
  }
  for (const type of (await enumTypeNames()).filter((name) => !preexistingTypes.includes(name))) {
    await sql.unsafe(`drop type if exists "${type}" cascade`);
  }
  await sql.unsafe('drop function if exists set_updated_at() cascade');
  await sql.end();
});

describe('the seed data matches DESIGN.md §6', () => {
  it('covers §6’s eight groups, in §6’s order', () => {
    // Case-insensitively, because the seeded name is what a chip section
    // header renders and those are Title Case, where §6 writes its table in
    // prose. Everything else about the name has to match §6 exactly — the
    // wording, the ampersand, the order.
    expect(CATEGORY_GROUPS.map((g) => g.name.toLowerCase())).toEqual(
      DESIGN_GROUPS.map((g) => g.name.toLowerCase()),
    );
  });

  // Two claims, deliberately separate. The first is that the slug follows the
  // project's rule; the second is that §6's Slug column agrees. Asserting only
  // the second would pass on a doc someone edited to match a wrong slug.
  it('slugs every group by the shared rule, and §6’s Slug column says so too', () => {
    expect(CATEGORY_GROUPS.map((g) => slugify(g.name))).toEqual(
      DESIGN_GROUPS.map((g) => designSlug(g.name)),
    );
    expect(DESIGN_GROUPS.map((g) => g.slug)).toEqual(DESIGN_GROUPS.map((g) => designSlug(g.name)));
  });

  it('covers every category §6 lists, under the group §6 lists it in', () => {
    const expected = DESIGN_GROUPS.flatMap((group) =>
      group.categories.map((name) => ({
        slug: designSlug(name),
        group: group.name.toLowerCase(),
      })),
    );

    expect(
      CATEGORIES.map((c) => ({ slug: slugify(c.name), group: c.group.toLowerCase() })),
    ).toEqual(expected);
  });

  it('names each category as §6 writes it, differing only in case', () => {
    const designNames = DESIGN_GROUPS.flatMap((group) => group.categories);

    expect(CATEGORIES.map((c) => c.name.toLowerCase())).toEqual(designNames);
  });

  // The count is a claim §6's prose makes in words and its table makes in
  // rows; pinning it here means a category added to the table without being
  // seeded fails rather than passes quietly.
  it('seeds as many categories as §6 enumerates', () => {
    expect(CATEGORIES).toHaveLength(DESIGN_CATEGORY_COUNT);
    expect(CATEGORY_GROUPS).toHaveLength(8);
  });
});

describe('the colours carry M0.7’s tuning across into data', () => {
  it('maps each §6 group onto exactly one M0.7 token, and each token onto one group', () => {
    expect(Object.keys(SASS_TOKEN_BY_GROUP_NAME).sort()).toEqual(
      CATEGORY_GROUPS.map((g) => g.name).sort(),
    );
    expect(Object.values(SASS_TOKEN_BY_GROUP_NAME).sort()).toEqual(
      Object.keys(SASS_TOKEN_COLORS).sort(),
    );
  });

  it.each(CATEGORY_GROUPS.map((g) => g.name))(
    '%s carries both hexes resolved from its M0.7 token',
    (name) => {
      const group = CATEGORY_GROUPS.find((g) => g.name === name)!;
      const token = SASS_TOKEN_COLORS[SASS_TOKEN_BY_GROUP_NAME[name]];

      expect(group.colorDark).toBe(token.dark);
      expect(group.colorLight).toBe(token.light);
    },
  );

  it.each(CATEGORY_GROUPS.map((g) => g.name))('%s clears 4.5:1 on both grounds', (name) => {
    const group = CATEGORY_GROUPS.find((g) => g.name === name)!;

    expect(contrastRatio(group.colorDark, GROUNDS.dark)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(group.colorLight, GROUNDS.light)).toBeGreaterThanOrEqual(4.5);
  });

  // The grounds above are the one pair of literals in this file that nothing
  // else pins. If M0.6 repalettes, every ratio above is measured against the
  // wrong thing and still passes — so measure the literals too.
  it('measures against the grounds _variables.scss actually defines', () => {
    const scss = readFileSync(VARIABLES_SCSS, 'utf8');

    expect(scss).toMatch(new RegExp(`\\$soot: ${GROUNDS.dark};`));
    expect(scss).toMatch(new RegExp(`\\$parchment: ${GROUNDS.light};`));
  });
});

describe('every row carries a description', () => {
  it('gives each group a non-empty one', () => {
    expect(CATEGORY_GROUPS.filter((g) => g.description.trim() === '')).toEqual([]);
  });

  it('gives each category a non-empty one', () => {
    expect(CATEGORIES.filter((c) => c.description.trim() === '')).toEqual([]);
  });

  it('writes them through to the database', async () => {
    await seedCategories(db);

    expect((await allGroups()).filter((g) => g.description.trim() === '')).toEqual([]);
    expect((await allCategories()).filter((c) => c.description.trim() === '')).toEqual([]);
  });
});

describe('seedCategories(db)', () => {
  // The precondition behind every count below: a fresh clone really starts at
  // zero, so the rows that follow are this seed's and not a leftover.
  it('starts from two empty tables', async () => {
    expect(await countOf('category_groups')).toBe(0);
    expect(await countOf('categories')).toBe(0);

    await seedCategories(db);

    expect(await countOf('category_groups')).toBe(8);
    expect(await countOf('categories')).toBe(DESIGN_CATEGORY_COUNT);
  });

  it('writes the groups before the categories, each category pointing at its own group', async () => {
    await seedCategories(db);

    const groupSlugById = new Map((await allGroups()).map((g) => [g.id, g.slug]));
    const seeded = (await allCategories()).map((c) => ({
      slug: c.slug,
      group: groupSlugById.get(c.group_id),
    }));

    expect(seeded).toEqual(
      [...CATEGORIES]
        .map((c) => ({ slug: slugify(c.name), group: slugify(c.group) }))
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    );
  });

  it('stamps every row as the bootstrap user, with no tombstone', async () => {
    await seedCategories(db);

    for (const row of [...(await allGroups()), ...(await allCategories())]) {
      expect(row.created_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.updated_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.deleted_at, row.slug).toBeNull();
    }
  });

  it('is idempotent: re-running adds nothing and moves nothing', async () => {
    await seedCategories(db);
    const groups = await allGroups();
    const categories = await allCategories();

    await expect(seedCategories(db)).resolves.toBeUndefined();

    expect(await allGroups()).toEqual(groups);
    expect(await allCategories()).toEqual(categories);
  });

  // MB.35's whole point is that a group's colour is an admin's to change. A
  // seed that re-asserted its own pair on every run would silently undo them
  // on the next deploy.
  it('does not overwrite a colour pair an admin has since changed', async () => {
    await seedCategories(db);
    await sql`
      update category_groups set color_dark = '#123456', color_light = '#654321'
      where slug = 'protection-and-defense'
    `;

    await seedCategories(db);

    const [protection] = (await allGroups()).filter((g) => g.slug === 'protection-and-defense');
    expect(protection.color_dark).toBe('#123456');
    expect(protection.color_light).toBe('#654321');
  });

  it('does not resurrect a category an admin has since deleted', async () => {
    await seedCategories(db);
    await sql`
      update categories set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where slug = 'gambling'
    `;

    await seedCategories(db);

    const gambling = (await allCategories()).filter((c) => c.slug === 'gambling');
    expect(gambling).toHaveLength(1);
    expect(gambling[0].deleted_at).not.toBeNull();
  });

  it('publishes the bootstrap user as app.current_user_id, as withAudit would', async () => {
    await sql`create table seed_categories_probe (slug text, acting_user text)`;
    await sql.unsafe(`
      create function seed_categories_probe() returns trigger language plpgsql as $$
      begin
        insert into seed_categories_probe (slug, acting_user)
        values (new.slug, current_setting('app.current_user_id', true));
        return new;
      end
      $$
    `);
    await sql.unsafe(`
      create trigger seed_categories_probe after insert on category_groups
      for each row execute function seed_categories_probe()
    `);

    await seedCategories(db);

    const rows = await sql<{ acting_user: string | null }[]>`
      select acting_user from seed_categories_probe
    `;
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});
