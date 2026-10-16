import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// M5.5: the admin's compendium form's presentation — IngredientForm on
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

test('the page behind an open modal does not scroll', async ({ page, isMobile }) => {
  // A wheel is what this test turns; mobile WebKit has none to turn.
  test.skip(isMobile, 'Mouse wheel is not supported in mobile WebKit');
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

// The compendium form's presentation in the app, which no story checks: the
// add, edit and delete themselves are story 18's
// (tests/e2e/stories/07-admin.spec.ts).
test('the compendium form lines its controls up and keeps its pickers inside the dialog', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-compendium.test', ['discord'], 'admin');

  const response = await page.goto('/admin/compendium?new');
  expect(response?.status()).toBe(200);
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(adding).toBeVisible();

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
    adding.getByRole('combobox', { name: 'New Form' }),
    adding.getByRole('combobox', { name: 'Folk Name' }),
    adding.getByRole('combobox', { name: 'Reference' }),
    adding.getByRole('button', { name: 'Add Folk Name' }),
  ]) {
    expect(await heightOf(box)).toBeCloseTo(field, 0);
  }

  // Escape on a picker's open list closes the list alone, not the dialog
  // (MB.115). Before anything is typed, so a leaked Escape would close it
  // rather than ask to discard.
  const classification = adding.getByRole('combobox', { name: 'Classification' });
  const choices = adding.getByRole('listbox', { name: 'Classification choices' });
  await classification.click();
  await expect(choices.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(choices.getByRole('option')).toHaveCount(0);
  await expect(classification).toHaveAttribute('aria-expanded', 'false');
  await expect(adding).toBeVisible();

  // A lookup open inside the dialog: the suggestions float in its top layer.
  await adding.getByRole('combobox', { name: 'Celestial Body' }).click();
  await adding.getByRole('combobox', { name: 'Celestial Body' }).fill('M');
  await expect(adding.getByRole('listbox', { name: 'Celestial Body suggestions' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// MB.258: opening Edit Source scrolled the dialog itself, which `overflow:
// hidden` let a script do, so its header left the top and blank space showed
// beneath the body; and the panel had no close at its top.
test('the edit source panel leaves the dialog in place and closes from its top by keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAs(page, 'source-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium?new');
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(adding).toBeVisible();

  // A source to edit: a new one, written through the panel.
  await adding.getByRole('combobox', { name: 'Reference' }).click();
  await page.getByRole('option', { name: 'New Reference…' }).click();
  const creating = adding.getByRole('group', { name: 'New Reference' });
  await creating.getByRole('combobox', { name: 'Kind' }).click();
  await page
    .getByRole('listbox', { name: 'Kind choices' })
    .getByRole('option', { name: 'Book', exact: true })
    .click();
  await creating.getByRole('textbox', { name: /^Title/ }).fill('Mockleaf Herbal');
  await creating.getByRole('textbox', { name: /^Published/ }).fill('1901');
  await creating.getByRole('button', { name: 'Save Reference' }).click();
  await expect(creating).toHaveCount(0);

  const pencil = adding.getByRole('button', { name: 'Edit Mockleaf Herbal', exact: true });
  await expect(pencil).toBeVisible();
  if ((await pencil.getAttribute('aria-expanded')) !== 'true') await pencil.click();
  await adding.getByRole('button', { name: 'Edit Source Mockleaf Herbal' }).click();
  const editing = adding.getByRole('group', { name: 'Edit Source' });
  const kind = editing.getByRole('combobox', { name: 'Kind' });
  await expect(kind).toBeFocused();

  // The precondition: the body scrolled to bring the panel up, which is
  // what scrolled the dialog with it.
  const body = adding.locator('.modal-dialog__body');
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  // The dialog itself holds still, its own Close in view at its top.
  expect(await adding.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(adding.getByRole('button', { name: 'Close', exact: true })).toBeInViewport();
  await assertNoAccessibilityViolations(page);

  // The panel's × is the one stop before Kind, and Enter on it closes the
  // panel, saving nothing, the focus back on the row's Edit Source.
  await editing.getByRole('textbox', { name: /^Title/ }).fill('Fixtureleaf Herbal');
  await kind.focus();
  await page.keyboard.press('Shift+Tab');
  const close = editing.getByRole('button', { name: 'Close Edit Source' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(editing).toHaveCount(0);
  await expect(adding.getByRole('button', { name: 'Edit Source Mockleaf Herbal' })).toBeFocused();
});
