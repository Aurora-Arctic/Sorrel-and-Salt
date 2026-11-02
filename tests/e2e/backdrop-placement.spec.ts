import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { insertSpell, localIngredient, seedCoven, withSql } from './stories/coven-ingredients';

// The sorrel and salt drawings sit in the same place on a spell's page and an ingredient's page as on the
// coven's Ingredients list: measured against the window, not read from a class.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Each drawing's box in window coordinates, at the top of a page made tall enough that the footer is out of view (the salt rises only with the footer). */
async function drawings(page: Page): Promise<Record<'sorrel' | 'salt', Box>> {
  return page.evaluate(async () => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    (document.querySelector('main') ?? document.body).append(spacer);
    window.scrollTo(0, 0);
    // Two frames let the scroll-driven animations settle.
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const box = (corner: string): Box => {
      const element = document.querySelector(`.backdrop--${corner}`);
      if (!element) throw new Error(`No ${corner} drawing`);
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    return { sorrel: box('sorrel'), salt: box('salt') };
  });
}

for (const width of [1280, 375]) {
  test(`the drawings sit as they do on the Ingredients list, on an ingredient's page and a spell's, at ${width} wide`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const coven = await seedCoven(page, 'Fixture Coven Backdrop', 'backdrop.test', {
      A: 'owner',
    });
    const { ingredientId, spellId } = await withSql(async (sql) => ({
      ingredientId: (await localIngredient(sql, coven.id, coven.users.A)).ingredientId,
      spellId: await insertSpell(
        sql,
        coven.id,
        'Fixture Spell',
        'workspace',
        coven.users.A,
        'complete',
      ),
    }));

    await page.goto(`/coven/${coven.slug}/ingredients`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const ordinary = await drawings(page);

    for (const address of [
      `/coven/${coven.slug}/ingredients/${ingredientId}`,
      `/coven/${coven.slug}/grimoire/${spellId}`,
    ]) {
      await page.goto(address);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect.soft(await drawings(page), address).toEqual(ordinary);
    }
  });
}
