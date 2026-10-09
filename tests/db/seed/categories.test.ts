import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as sassCompiler from 'sass';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { CATEGORIES, seedCategories } from '@/db/seed/categories';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { toHsl } from '@/lib/group-colors';
import { slugify } from '@/lib/slugify';
import type { CategoryGroupRow, CategoryRow, DesignCategoryGroup } from './types';

// §6's eight groups and every category, asserted against their sources rather
// than copies: the vocabulary parsed from DESIGN.md §6's table, the rotation
// turned from `$sorrel` as the stylesheet compiles it, the contrast floor
// recomputed from the seeded hex. Against the clone, which holds the vocabulary
// as `standard` wrote it through the same function; a re-run over an admin's
// edit empties the tables first, and the shape every seed shares is
// index.test.ts's (MB.183) — claude-docs/db/category-seed.md, "The category seed".

const DESIGN_DOC = fromRoot('claude-docs/DESIGN.md');
const SCSS_DIR = fromRoot('src/scss');
const VARIABLES_SCSS = `${SCSS_DIR}/_variables.scss`;
// The two page grounds §6's colours are tuned against, asserted against the
// stylesheet below since there is nowhere to import a Sass value from.
const GROUNDS = { dark: '#14120e', light: '#efe9da' } as const;

// --- DESIGN.md §6, parsed ---------------------------------------------------

function designSection6(): DesignCategoryGroup[] {
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

// --- M0.7's rotation, resolved ---------------------------------------------

// The eight hues sit on the odd multiples of 22.5° off `$sorrel`, so none lands
// on the accent or secondary hue. The owner tuned each pair by hand, so a hue
// may drift off its step, but by no more than ROTATION_TOLERANCE. The widest
// drift is Love & Connection's dark colour, at 1.04°.
const ROTATION_STEP = 22.5;
const ROTATION_TOLERANCE = 2;
const ODD_STEPS = [1, 3, 5, 7, 9, 11, 13, 15];

function sorrelHue(): number {
  const css = sassCompiler.compileString(
    `@use 'sass:color';
     @use 'variables' as v;
     .probe { --hue: #{color.channel(v.$sorrel, 'hue', $space: hsl)}; }`,
    { loadPaths: [SCSS_DIR] },
  ).css;
  return parseFloat(css.match(/--hue: ([\d.]+)/)![1]);
}

const SORREL_HUE = sorrelHue();

/** How far a hex's hue sits from the odd step `step`, the short way round, in degrees. */
function offStep(hex: string, step: number): number {
  const gap = Math.abs(toHsl(hex)[0] - ((SORREL_HUE + step * ROTATION_STEP) % 360));
  return Math.min(gap, 360 - gap);
}

/** The odd step nearest a hex's hue. */
function nearestStep(hex: string): number {
  return ODD_STEPS.reduce((best, step) => (offStep(hex, step) < offStep(hex, best) ? step : best));
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

// --- database ---------------------------------------------------------------

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

describe('the colours keep M0.7’s rotation and clear the floor', () => {
  // Precondition: the hue really was compiled, or every step would measure off 0°.
  it('turns the rotation from the stylesheet’s own `$sorrel`', () => {
    expect(SORREL_HUE).toBeGreaterThan(90);
    expect(SORREL_HUE).toBeLessThan(100);
  });

  it('puts each of the eight groups on its own odd step', () => {
    expect(CATEGORY_GROUPS.map((g) => nearestStep(g.colorDark)).sort((a, b) => a - b)).toEqual(
      ODD_STEPS,
    );
  });

  it.each(CATEGORY_GROUPS.map((g) => g.name))('%s keeps both hexes on its step', (name) => {
    const group = CATEGORY_GROUPS.find((g) => g.name === name)!;
    const step = nearestStep(group.colorDark);

    expect(offStep(group.colorDark, step)).toBeLessThanOrEqual(ROTATION_TOLERANCE);
    expect(offStep(group.colorLight, step)).toBeLessThanOrEqual(ROTATION_TOLERANCE);
  });

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
    expect((await allGroups()).filter((g) => g.description.trim() === '')).toEqual([]);
    expect((await allCategories()).filter((c) => c.description.trim() === '')).toEqual([]);
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
