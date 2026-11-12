import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import {
  compendiumVariant,
  insertSpell,
  insertStep,
  seedCoven,
  withSql,
} from '../stories/coven-ingredients';
import { PURPOSE_WIDTHS } from '../breakpoints';
import { ingredientSlug } from '@/lib/slugify';

// Writes the help articles' screenshots into public/help/screens/, from the seeded compendium and a coven made here,
// in the light theme as <name>.png and the dark as <name>.dark.png, at one desktop width. Run by `npm run help:screenshots`
// (claude-docs/components/help-pages.md, "Screenshots"); the pictures are committed, and an article shows one with
// `![alt](/help/screens/<name>.png "caption")`, the dark one found beside it.

const SCREENS = join(process.cwd(), 'public', 'help', 'screens');
/** The standard seed's site curator, fixture F. */
const CURATOR = '00000000-0000-0000-0000-000000000008';

test.use({
  viewport: { width: PURPOSE_WIDTHS.helpScreenshot, height: 768 },
  colorScheme: 'light',
  deviceScaleFactor: 1,
});

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/**
 * Waits for the page's fonts, its images and any running fade, so no picture is taken in a fallback face or mid-change. A looping
 * animation never finishes, so only those with an end are awaited.
 */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.evaluate(() =>
    Promise.all([
      document.fonts.ready,
      ...Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
      ...document
        .getAnimations()
        .filter((run) => Number.isFinite(run.effect?.getComputedTiming().endTime))
        .map((run) => run.finished),
    ]).then(() => undefined),
  );
}

/**
 * Takes the picture in the light theme, then again in the dark. The theme follows the system's preference, as no
 * choice is stored, so the same frame is taken twice and the pair are the same size.
 */
async function bothThemes(
  page: Page,
  name: string,
  take: (path: string) => Promise<unknown>,
): Promise<void> {
  await take(join(SCREENS, `${name}.png`));
  await page.emulateMedia({ colorScheme: 'dark' });
  await settled(page);
  await take(join(SCREENS, `${name}.dark.png`));
}

test('the compendium entry page, read signed out', async ({ page }) => {
  const slug = await withSql(async (sql) => {
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    // No seeded entry is curator reviewed, and the picture shows a reviewed one rather than Needs Review: the seeded
    // curator (F) reviews it here, on a fixed day.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${CURATOR}, true)`;
      await tx`
        update ingredients set curator_reviewed_at = '2026-11-01T12:00:00Z', curator_reviewed_by = ${CURATOR}
        where id = ${rosemary.ingredientId}`;
    });
    const [entry] = await sql<{ canonical_name: string | null }[]>`
      select canonical_name from ingredients where id = ${rosemary.ingredientId}`;
    return ingredientSlug('Rosemary', entry.canonical_name);
  });

  // Tall enough that the whole entry is in frame; the picture ends with the page's main.
  await page.setViewportSize({ width: PURPOSE_WIDTHS.helpScreenshot, height: 2400 });
  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Rosemary' })).toBeVisible();
  await expect(page.getByText('Needs Review')).toHaveCount(0);
  await settled(page);
  const main = await page.locator('main').first().boundingBox();
  if (!main) throw new Error('the entry page drew no main');

  const clip = {
    x: 0,
    y: 0,
    width: PURPOSE_WIDTHS.helpScreenshot,
    height: Math.ceil(main.y + main.height),
  };

  await bothThemes(page, 'compendium-entry', (path) => page.screenshot({ path, clip }));
});

test('the spell builder, open on a draft', async ({ page }) => {
  const coven = await seedCoven(page, 'Hearthside Coven', 'help-screenshots.test', { A: 'owner' });
  const title = 'Hearth Protection Jar';
  const spellId = await withSql(async (sql) => {
    const steward = coven.users.A;
    const id = await insertSpell(sql, coven.id, title, 'workspace', steward, 'draft');
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${steward}, true)`;
      await tx`update users set name = 'Rowan Hale' where id = ${steward}`;
      await tx`
        update spells set intent = 'To keep the hearth calm and the house warded.',
          jar_description = 'A small cork-stoppered jar', seal_wax_color = 'Green'
        where id = ${id}`;
    });
    const steps = [
      { held: await compendiumVariant(sql, 'Rosemary', 'Herb'), quantity: 2, unit: 'g' as const },
      {
        held: await compendiumVariant(sql, 'Bay Laurel', 'Leaf'),
        quantity: 3,
        unit: 'piece' as const,
      },
      {
        held: await compendiumVariant(sql, 'Selenite', 'Crystal'),
        quantity: 1,
        unit: 'piece' as const,
      },
    ];
    for (const [position, step] of steps.entries()) {
      await insertStep(
        sql,
        id,
        step.held,
        { quantity: step.quantity, unit: step.unit, position },
        steward,
      );
    }
    return id;
  });

  // Tall enough that the builder, every section open, needs no scrolling.
  await page.setViewportSize({ width: PURPOSE_WIDTHS.helpScreenshot, height: 2400 });
  await page.goto(`/coven/${coven.slug}/grimoire/drafts?edit=${spellId}`);
  const builder = page.getByRole('dialog', { name: `Edit Spell, ${title}` });
  await expect(builder).toBeVisible();
  await builder.getByRole('button', { name: 'Open All' }).click();
  // The three steps are what the picture shows, so they are drawn before it is taken.
  await expect(builder.getByRole('list', { name: 'Steps' }).getByRole('listitem')).toHaveCount(3);
  await expect(builder.getByRole('textbox', { name: 'Intent' })).toHaveValue(
    'To keep the hearth calm and the house warded.',
  );
  await settled(page);
  // No focus ring in the picture: the reader has pressed nothing.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await bothThemes(page, 'spell-builder', (path) => builder.screenshot({ path }));
});
