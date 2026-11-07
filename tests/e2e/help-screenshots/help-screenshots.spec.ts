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
import { ingredientSlug } from '@/lib/slugify';

// Writes the help articles' screenshots into public/help/screens/, from the seeded compendium and a coven made here,
// in the light theme at one desktop width. Run by `npm run help:screenshots` (claude-docs/components/help-pages.md,
// "Screenshots"); the pictures are committed, and an article shows one with `![alt](/help/screens/<name>.png "caption")`.

const SCREENS = join(process.cwd(), 'public', 'help', 'screens');

test.use({ viewport: { width: 1024, height: 768 }, colorScheme: 'light', deviceScaleFactor: 1 });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Waits for the page's fonts, so no picture is taken in a fallback face. */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test('the compendium entry page, read signed out', async ({ page }) => {
  const slug = await withSql(async (sql) => {
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    const [entry] = await sql<{ canonical_name: string | null }[]>`
      select canonical_name from ingredients where id = ${rosemary.ingredientId}`;
    return ingredientSlug('Rosemary', entry.canonical_name);
  });

  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Rosemary' })).toBeVisible();
  await settled(page);

  await page.screenshot({ path: join(SCREENS, 'compendium-entry.png') });
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
  await page.setViewportSize({ width: 1024, height: 2400 });
  await page.goto(`/coven/${coven.slug}/grimoire/drafts?edit=${spellId}`);
  const builder = page.getByRole('dialog', { name: `Edit Spell, ${title}` });
  await expect(builder).toBeVisible();
  await builder.getByRole('button', { name: 'Open All' }).click();
  await settled(page);
  // No focus ring in the picture: the reader has pressed nothing.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await builder.screenshot({ path: join(SCREENS, 'spell-builder.png') });
});
