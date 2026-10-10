import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// M5.5: the admin's compendium, its list narrowed to the two curation to-do
// lists, and the wide modal the address opens over it — IngredientForm on
// the compendium, which carries the form's first axe scans in a browser,
// the Combobox's among them (claude-docs/components/ingredient-form.md,
// "Testing").
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The dialog stands inside the viewport with at least 1rem of the page showing on every side. */
async function expectMarginAround(page: Page, dialog: Locator) {
  const { width, height } = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  for (const gap of [box.y, height - box.y - box.height, box.x, width - box.x - box.width]) {
    expect(gap).toBeGreaterThanOrEqual(16);
  }
}

test('the page behind an open modal does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await signInAs(page, 'scroll-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  // The precondition: the list is taller than the window, so the page can scroll.
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.getByRole('link', { name: 'Add Ingredient' }).click();
  await page.getByRole('dialog', { name: 'Add Ingredient' }).waitFor();
  // Over the backdrop, beside the dialog: the wheel reaches the page if anything.
  await page.mouse.move(8, 300);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);

  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // Closed, the page scrolls again: the lock is the dialog's alone.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  // A click on the backdrop closes it too, as Escape does, the owner's call.
  await page.getByRole('link', { name: 'Add Ingredient' }).click();
  await page.getByRole('dialog', { name: 'Add Ingredient' }).waitFor();
  await page.mouse.click(8, 300);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/compendium$/);
});

test('the compendium form keeps a margin of the page in view on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInAs(page, 'phone-admin@admin-compendium.test', ['discord'], 'admin');

  await page.goto('/admin/compendium?new');

  await expectMarginAround(page, page.getByRole('dialog', { name: 'Add Ingredient' }));
});

test('a signed-in non-admin is refused at /admin/compendium with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-compendium.test');

  const response = await page.goto('/admin/compendium?new');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an admin adds, edits and deletes a compendium entry in the modal over the list', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-compendium.test', ['discord'], 'admin');

  const response = await page.goto('/admin/compendium');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Compendium — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Compendium' })).toBeVisible();
  await assertNoAccessibilityViolations(page);

  await page.getByRole('link', { name: 'Add Ingredient' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(adding).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/compendium\?new$/);
  await assertNoAccessibilityViolations(page);

  // The modal keeps a margin of the page in view on every side, the owner's
  // call: the long form scrolls inside it rather than running off the screen.
  await expectMarginAround(page, adding);

  // Every one-line control stands at one height, $control-height: a text
  // field, a select, a list's box and the Add beside it. Measured in the app,
  // whose `body .input` the workshop's frame scope does not reproduce.
  const heightOf = (box: Locator) =>
    box.evaluate((element) => {
      const control = element.closest('.combobox__control') ?? element;
      return control.getBoundingClientRect().height;
    });
  const field = await heightOf(adding.getByRole('textbox', { name: 'Name', exact: true }));
  for (const box of [
    adding.getByRole('combobox', { name: 'Classification' }),
    adding.getByRole('combobox', { name: 'Form' }),
    adding.getByRole('combobox', { name: 'Folk Name' }),
    adding.getByRole('combobox', { name: 'Reference' }),
    adding.getByRole('button', { name: 'Add Folk Name' }),
  ]) {
    expect(await heightOf(box)).toBeCloseTo(field, 0);
  }

  // A lookup open inside the dialog: the suggestions float in its top layer.
  await adding.getByRole('combobox', { name: 'Planet' }).click();
  await adding.getByRole('combobox', { name: 'Planet' }).fill('M');
  await expect(adding.getByRole('listbox', { name: 'Planet suggestions' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
  // Left in the box, the text would hold the save: a planet here is a pick.
  await adding.getByRole('combobox', { name: 'Planet' }).fill('');

  await adding.getByRole('textbox', { name: 'Name', exact: true }).fill('Aaa Testwort');
  await adding.getByRole('combobox', { name: 'Classification' }).click();
  await adding
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None' })
    .click();
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();

  // Save Ingredient opens what it saved, at its address.
  const editing = page.getByRole('dialog', { name: 'Edit Ingredient' });
  await expect(editing).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/compendium\?edit=aaa-testwort$/);
  await expect(editing.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Aaa Testwort',
  );
  await expect(editing.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();

  await editing.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await editing.getByRole('button', { name: 'Save Ingredient' }).click();
  await expect(editing.getByText('Saved Aaa Testwort.')).toBeVisible();
  await expect(editing.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();
  await assertNoAccessibilityViolations(page);

  await editing.getByRole('button', { name: 'Delete Ingredient' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/compendium$/);
  await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
});

// The curation to-do lists: the entries still classified Unknown, and those
// citing no source. A filtered page is an address, and its links keep it.
test('an admin narrows the compendium to its to-do lists', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  const search = page.getByRole('search');
  const filter = search.getByRole('button', { name: 'Filter' });
  await expect(filter).toBeDisabled();

  await search.getByRole('combobox', { name: 'Classification' }).selectOption({ label: 'Unknown' });
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/compendium\?nomenclature=unknown$/);
  await expect(filter).toBeDisabled();

  await search.getByRole('checkbox', { name: 'Without References' }).check();
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/compendium\?nomenclature=unknown&withoutReferences=1$/);
  await expect(page.getByRole('link', { name: 'Add Ingredient' })).toHaveAttribute(
    'href',
    '/admin/compendium?nomenclature=unknown&withoutReferences=1&new',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such entry');
  await filter.click();
  await expect(page.getByText('No compendium entry matches.')).toBeVisible();
});
