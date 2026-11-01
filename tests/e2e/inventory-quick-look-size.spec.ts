import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  insertSpell,
  insertStep,
  insertStock,
  localIngredient,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The Quick Look eye on a line of the recipe page's In the Cupboard panel sits between the step eye (a 24px box,
// a 14px mark) and an entry's (32px, 26.7px): a 28px box round a mark of about 20px, and the line is no taller for it.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the eye in In the Cupboard is between the step eye and the entry eye, at desktop and phone width', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Eye', 'eye.test', { A: 'owner' });
  const spell = await withSql(async (sql) => {
    const held = await localIngredient(sql, coven.id, coven.users.A);
    await insertStock(
      sql,
      coven.id,
      held,
      { quantity: 500, unit: 'g', threshold: 100 },
      coven.users.A,
    );
    const id = await insertSpell(
      sql,
      coven.id,
      'Fixture Working',
      'workspace',
      coven.users.A,
      'complete',
    );
    await insertStep(sql, id, held, { quantity: 20, unit: 'g', position: 1 }, coven.users.A);
    return id;
  });
  await signInAgainAs(page, coven.users.A);
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/coven/${coven.slug}/grimoire/${spell}`);
    const line = page.locator('.spell-inventory .jar-line');
    const eye = line.getByRole('link', { name: /Quick Look/ });
    await expect(eye).toBeVisible();
    const box = await eye.boundingBox();
    const mark = await eye.locator('svg').boundingBox();
    expect(Math.abs(box!.width - 28)).toBeLessThanOrEqual(1);
    expect(Math.abs(box!.height - 28)).toBeLessThanOrEqual(1);
    expect(Math.abs(mark!.width - 20.3)).toBeLessThanOrEqual(1);
    // The eye wears the line's muted ink, as the words beside it do, and not the Edit pencil's accent green.
    const colourOf = (locator: Locator) => locator.evaluate((e) => getComputedStyle(e).color);
    const ink = await colourOf(eye);
    expect(ink).toBe(await colourOf(line.locator('.jar-line__words')));
    expect(ink).not.toBe(await colourOf(page.locator('.icon-tip__edit').first()));
    // The line is no taller than its jar and words need: the eye adds nothing to it.
    const lineBox = await line.boundingBox();
    const nameBox = await line.locator('.jar-line__words').boundingBox();
    expect(lineBox!.height).toBeLessThan(box!.height + nameBox!.height);
  }
});
