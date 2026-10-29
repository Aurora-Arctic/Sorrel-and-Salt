import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';
import { insertSpell, insertStep, localIngredient, seedCoven, withSql } from './coven-ingredients';
import { makeVariant } from '../../support/fixtures/ingredient';

// Spell Preview, the spell full screen with nothing else on it (story 85).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test(
  'a member or viewer opens a spell full screen with only its title, ingredients and steps',
  { tag: '@story-85' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Five', 'story-85.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const spellId = await withSql(async (sql) => {
      const held = await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Previewwort',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Root' })],
      });
      const id = await insertSpell(
        sql,
        coven.id,
        'Fixture Working',
        'workspace',
        coven.users.A,
        'complete',
      );
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, coven.users.A);
      return id;
    });
    const recipePath = `/coven/${coven.slug}/grimoire/${spellId}`;

    for (const user of [coven.users.B, coven.users.C]) {
      await signInAgainAs(page, user);
      await page.goto(recipePath);
      const preview = page.getByRole('button', { name: 'Preview', exact: true });
      // Scrolled a little first, so the return to the same place is a fact and not the top.
      await page.evaluate(() => {
        document.body.style.minHeight = '3000px';
        window.scrollTo(0, 120);
      });
      const before = await page.evaluate(() => window.scrollY);
      expect(before).toBeGreaterThan(0);
      await preview.click();
      const pane = page.getByRole('dialog', { name: 'Fixture Working' });
      await expect(pane).toBeVisible();
      await expect(pane.getByRole('listitem')).toHaveCount(1);
      await expect(pane.getByRole('listitem')).toContainText('Fixture Previewwort');
      await expect(pane.getByRole('listitem')).toContainText('2 g');
      // Nothing but Close to press, and nothing to follow away.
      await expect(pane.getByRole('button')).toHaveCount(1);
      await expect(pane.getByRole('link')).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
      await page.keyboard.press('Escape');
      await expect(pane).toHaveCount(0);
      await expect(preview).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      // Close does the same.
      await preview.click();
      await page
        .getByRole('dialog', { name: 'Fixture Working' })
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(preview).toBeFocused();
    }
  },
);

test('a non-member gets a 404 for the spell', { tag: '@story-85' }, async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Eighty-Five B', 'story-85b.test', {
    A: 'owner',
    B: 'member',
  });
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
  );
  const recipePath = `/coven/${coven.slug}/grimoire/${spellId}`;
  // The precondition: the same address opens for a member, so the 404 below is the guard's.
  await signInAgainAs(page, coven.users.B);
  expect((await page.goto(recipePath))?.status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible();
  await signInAs(page, 'd@story-85b.test');
  expect((await page.goto(recipePath))?.status()).toBe(404);
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toHaveCount(0);
});
