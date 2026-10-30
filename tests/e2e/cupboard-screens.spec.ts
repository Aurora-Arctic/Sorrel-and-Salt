import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { ADD, HELD } from '../support/cupboard-wording';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The three cupboard screens on a compendium entry seen from a coven: the plus beside the pencil (Add),
// Annotate, and Remove from the three dots. One walk: the owner adds the entry, annotates its label, hands
// the label back to the Compendium, and removes the entry.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member adds a compendium entry to the cupboard, annotates it, hands the label back and removes it', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Screens', 'coven-screens.test', {
    C: 'viewer',
    A: 'owner',
  });
  const admin = await browser.newPage({ baseURL });
  let ingredientId: string;
  try {
    const { userId } = await signInAs(admin, 'admin@coven-screens.test', ['discord'], 'admin');
    ingredientId = await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Screens Wort',
          canonicalName: 'Fixtura capsa',
          nomenclature: 'botanical',
          description: 'The compendium’s fixture herb.',
        }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
  const entryPage = `/coven/${coven.slug}/ingredients/${ingredientId}`;
  const heading = (name: string) => page.getByRole('heading', { level: 1, name });
  // A choice among the entry's icons (Annotate) or in the three dots (Make It Ours, Remove, the
  // bin only where Remove is the one choice left), each named for
  // the entry as it is called now.
  const choose = async (name: string, entry = 'Fixture Screens Wort') => {
    const main = page.getByRole('main');
    if (name === 'Annotate')
      await main.getByRole('link', { name: `Annotate ${entry}`, exact: true }).click();
    else {
      await main.getByRole('button', { name: `More for ${entry}`, exact: true }).click();
      await page.getByRole('menu').getByRole('menuitem', { name, exact: true }).click();
    }
  };

  // Add is the card's plus beside the pencil, as on the public page.
  const plus = () =>
    page.getByRole('main').getByRole('button', {
      name: `${ADD}: Fixture Screens Wort`,
      exact: true,
    });

  // Why the buttons could show: the owner holds ingredient:create, update and
  // delete, and the coven does not hold the entry yet.
  await page.goto(entryPage);
  await expect(heading('Fixture Screens Wort')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Annotate Fixture Screens Wort' })).toHaveCount(0);

  // A refusal is a callout under the button, which floats: the heading does
  // not move. The write is answered in its place, so nothing is added.
  const before = await heading('Fixture Screens Wort').boundingBox();
  await page.route('**/api/graphql', (route) =>
    route.request().postData()?.includes('AddCupboardEntry')
      ? route.fulfill({
          json: { data: null, errors: [{ message: 'This entry could not be added.' }] },
        })
      : route.continue(),
  );
  await plus().click();
  const refusal = page.getByRole('alert').filter({ hasText: 'This entry could not be added.' });
  await expect(refusal).toBeVisible();
  await expect(page.getByRole('button', { name: `Show the error for ${ADD}` })).toBeVisible();
  expect(await heading('Fixture Screens Wort').boundingBox()).toEqual(before);
  await refusal.getByRole('button', { name: 'Dismiss' }).click();
  await expect(refusal).toHaveCount(0);
  await expect(plus()).toBeFocused();
  await page.unrouteAll();

  await plus().click();
  await expect(page.getByRole('status').filter({ hasText: /^Compendium$/ })).toBeVisible();
  await expect(plus()).toHaveCount(0);
  // The one coven that may add holds it now: the card's check in the plus's place.
  await expect(
    page.getByRole('main').getByRole('button', { name: `${HELD}: Fixture Screens Wort` }),
  ).toBeVisible();
  // The failed try's badge went with the button it belonged to.
  await expect(page.getByRole('button', { name: /^Show the error for / })).toHaveCount(0);

  await choose('Annotate');
  // The dialog is the address's: a reload would open it again.
  await expect(page).toHaveURL(/\?annotate$/);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Label' }).fill('Fixture Our Screenwort');
  await dialog.getByRole('button', { name: 'Save Annotation' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/ingredients\/[^?]+$/);
  await expect(heading('Fixture Our Screenwort')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annotated' })).toBeVisible();
  // Annotated wins over Compendium.
  await expect(page.getByRole('status').filter({ hasText: /^Compendium$/ })).toHaveCount(0);

  // The form opens on the coven's label; handing it back restores the compendium's.
  await choose('Annotate', 'Fixture Our Screenwort');
  await dialog.getByRole('button', { name: 'Restore Original: Label' }).click();
  await dialog.getByRole('button', { name: 'Save Annotation' }).click();
  await expect(dialog).toBeHidden();
  await expect(heading('Fixture Screens Wort')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annotated' })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /^Compendium$/ })).toBeVisible();

  // At a phone's width, the narrowest a section signs off at.
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoAccessibilityViolations(page);
  await choose('Annotate');
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  // Closed with nothing changed, the dialog gives the focus back to the Annotate icon where
  // the press began.
  await expect(page.getByRole('link', { name: 'Annotate Fixture Screens Wort' })).toBeFocused();

  await choose('Remove');
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(plus()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^Compendium$/ })).toBeVisible();
  // The confirmation stays until the re-read drops the entry, then closes onto
  // the page's heading: Remove went with the entry, and the button left offers
  // something else.
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
  await assertNoAccessibilityViolations(page);
});
