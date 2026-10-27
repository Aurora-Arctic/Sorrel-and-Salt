import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { localIngredient, seedCoven, withSql } from './stories/coven-ingredients';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// A compendium entry in a coven's cupboard (M12.16): the coven's page shows
// the coven's label and changes with the marks, and the public page of the
// same entry shows neither, and a coven's own entry with no formal name passes
// the scan with its list of the compendium entries it might be (M12.22).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member sees a held compendium entry with the coven’s label and marks, the public page shows neither, and an own entry of the name lists it as similar', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Cupboard', 'coven-cupboard.test', {
    A: 'owner',
    B: 'member',
  });
  const admin = await browser.newPage({ baseURL });
  let ingredientId: string;
  try {
    const { userId } = await signInAs(admin, 'admin@coven-cupboard.test', ['discord'], 'admin');
    ingredientId = await withSql(async (sql) => {
      const id = await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Reference Wort',
          canonicalName: 'Fixtura cista',
          nomenclature: 'botanical',
          description: 'The compendium’s fixture herb.',
        }),
        userId,
      );
      await insertCupboardEntry(
        sql,
        {
          workspaceId: coven.id,
          ingredientId: id,
          label: 'Fixture Our Hedgewort',
          description: 'What our coven makes of it.',
        },
        coven.users.B,
      );
      return id;
    });
  } finally {
    await admin.close();
  }
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`select slug from ingredients where id = ${ingredientId}`,
  );

  // Why the page could have shown the compendium's values: the entry is live
  // and public, and the coven holds a row naming it.
  await page.goto(`/coven/${coven.slug}/ingredients/${ingredientId}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Our Hedgewort' }),
  ).toBeVisible();
  // The compendium's own name is no longer a 'Called ... in the Compendium' line (13d8bff3);
  // it is the link in the In the Compendium list, named with its formal name.
  await expect(
    page
      .getByRole('list', { name: /^In the Compendium/ })
      .getByRole('link', { name: /^Fixture Reference Wort/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annotated' })).toBeVisible();
  // Annotated wins over Compendium (the owner's call, 2026-10-20).
  await expect(page.getByRole('status').filter({ hasText: /^Compendium$/ })).toHaveCount(0);
  await expect(page.getByText('Local', { exact: true })).toHaveCount(0);
  // At a phone's width, the narrowest a section signs off at.
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoAccessibilityViolations(page);

  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Reference Wort' }),
  ).toBeVisible();
  // Every page holds an empty status region for click feedback (M12.31); it is
  // the coven's marks, a status with words in it, that the public page lacks. The review mark
  // (M14.8) is the compendium's own, shown to everyone, so it is not one of them.
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: /Review/ }),
  ).toHaveCount(0);
  await expect(page.getByText('Fixture Our Hedgewort')).toHaveCount(0);

  // The coven's own entry of the same name, with no formal name, lists the compendium's as
  // Similar (M12.22): the scan of that page state. What the list holds, and that it offers
  // nothing to convert the entry (M12.42), are the entry page's and IngredientEntry's tests'.
  const own = await withSql((sql) =>
    localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Reference Wort',
      nomenclature: 'none',
    }),
  );
  await page.goto(`/coven/${coven.slug}/ingredients/${own.ingredientId}`);
  await expect(page.getByRole('heading', { name: 'Similar in the Compendium' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});
