import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as sassCompiler from 'sass';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  SASS_TOKEN_BY_GROUP_NAME,
  seedCategories,
} from '@/db/seed/categories';
import { slugify } from '@/lib/slugify';

// §6's eight groups and every category, asserted against their sources rather
// than copies: the vocabulary parsed from DESIGN.md §6's table, the colours
// resolved by compiling `category-group-color()`, the contrast floor recomputed
// from the seeded hex. Against the real tables, emptied first —
// claude-docs/db.md, "The category seed".

const DESIGN_DOC = fromRoot('claude-docs/DESIGN.md');
const SCSS_DIR = fromRoot('src/scss');
const VARIABLES_SCSS = `${SCSS_DIR}/_variables.scss`;
// The two page grounds §6's colours are tuned against, asserted against the
// stylesheet below since there is nowhere to import a Sass value from.
const GROUNDS = { dark: '#14120e', light: '#efe9da' } as const;

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

// The expected slug comes from §6's table text through the shared rule; the
// module is never asked what it thinks the slug is.
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

// WCAG 2.1 contrast, recomputed from the stored hex.
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

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

beforeEach(async () => {
  await truncateAllTables(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('the seed data matches DESIGN.md §6', () => {
  it('covers §6’s eight groups, in §6’s order', () => {
    // Case-insensitively: a seeded name is a rendered Title Case label, and §6 writes prose.
    expect(CATEGORY_GROUPS.map((g) => g.name.toLowerCase())).toEqual(
      DESIGN_GROUPS.map((g) => g.name.toLowerCase()),
    );
  });

  // Two claims: the slug follows the rule, and §6's Slug column agrees. The
  // second alone would pass on a doc edited to match a wrong slug.
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

  // A category added to §6's table and not seeded fails rather than passes quietly.
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

  // The grounds are the one pair of literals nothing else pins; after a
  // repalette every ratio above would measure against the wrong thing.
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
  // Precondition: the truncated clone really starts at zero.
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

  // A group's colour is the admin's to change (MB.35); a re-asserting seed would undo it.
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
