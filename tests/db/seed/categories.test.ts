import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { CATEGORIES, seedCategories } from '@/db/seed/categories';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { slugify } from '@/lib/slugify';
import type { CategoryGroupRow, CategoryRow } from './types';

// Every seeded group colour clears the contrast floor on its theme's page
// ground, read from the stylesheet that defines it; the seed wires each
// category to its group and leaves an admin's colours alone. The shape every
// seed shares is index.test.ts's (MB.183), and the vocabulary's content is the
// seed doc's to review — claude-docs/db/category-seed.md, "The category seed".

/** A page ground as `_variables.scss` defines it. */
function ground(variable: string): string {
  const scss = readFileSync(fromRoot('src/scss/_variables.scss'), 'utf8');
  const hex = new RegExp(`^\\$${variable}: (#[0-9a-f]{6});`, 'm').exec(scss)?.[1];
  if (!hex) throw new Error(`_variables.scss no longer defines $${variable} as a hex`);
  return hex;
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

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allGroups(): Promise<CategoryGroupRow[]> {
  return sql<CategoryGroupRow[]>`select * from category_groups order by slug`;
}

async function allCategories(): Promise<CategoryRow[]> {
  return sql<CategoryRow[]>`select * from categories order by slug`;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('the seeded group colours', () => {
  it('clear 4.5:1 on both page grounds, every group', () => {
    const grounds = { dark: ground('soot'), light: ground('parchment') };
    // Precondition: there are groups to measure.
    expect(CATEGORY_GROUPS.length).toBeGreaterThan(0);

    const below = CATEGORY_GROUPS.filter(
      (group) =>
        contrastRatio(group.colorDark, grounds.dark) < 4.5 ||
        contrastRatio(group.colorLight, grounds.light) < 4.5,
    );

    expect(below.map((group) => group.name)).toEqual([]);
  });
});

describe('seedCategories(db)', () => {
  it('writes the groups before the categories, each category pointing at its own group', async () => {
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

  describe('over a database an admin has edited', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
    });

    // A group's colour is the admin's to change (MB.35); a re-asserting seed would undo it.
    it('does not overwrite a colour pair an admin has since changed', async () => {
      // Precondition: the truncated clone really starts empty, so the row re-coloured is this run's.
      expect(await allGroups()).toEqual([]);
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
  });
});
