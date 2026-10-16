import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// M5.5: the admin's compendium form's presentation — IngredientForm on
// the compendium, which carries the form's first axe scans in a browser,
// the Combobox's among them (claude-docs/components/ingredient-form.md,
// "Testing").
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

// MB.261: a keyboard user turns the No Refs switch with Enter, as a click
// does, and Space still does. No story walks it, so this is the gate.
test('Enter turns the No Refs switch and applies the filter, as Space does', async ({ page }) => {
  await signInAs(page, 'keyboard-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  // Hydrated first: before it, Enter submits the form natively with the switch off.
  await page.waitForLoadState('networkidle');

  const noRefs = page.getByRole('switch', { name: 'No Refs' });
  await noRefs.focus();
  await expect(noRefs).not.toBeChecked();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/withoutReferences=1/);
  await expect(noRefs).toBeChecked();

  await page.waitForLoadState('networkidle');
  await noRefs.focus();
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/withoutReferences/);
  await expect(noRefs).not.toBeChecked();

  await page.waitForLoadState('networkidle');
  await noRefs.focus();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/withoutReferences=1/);
  await assertNoAccessibilityViolations(page);
});

// M11.22: the read takes a list of forms, and the Form box sends its one
// choice as a list of one, so the box still narrows the list by its form.
test('the Form box keeps only the entries holding the form chosen', async ({ page }) => {
  await signInAs(page, 'form-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  // Hydrated first: before it, the box is a native select rather than a type-ahead.
  await page.waitForLoadState('networkidle');
  const editOf = (formalName: string) =>
    page.getByRole('link', { name: `Edit Cat's Claw, ${formalName}` });
  // Why the filter could have kept it: the thorn Cat's Claw is listed beside the bark ones.
  await expect(editOf('Senegalia greggii')).toBeVisible();
  await expect(editOf('Uncaria tomentosa')).toBeVisible();

  await page.getByRole('combobox', { name: 'Form' }).fill('bark');
  await page.getByRole('option', { name: /^Bark/ }).click();

  await expect(page).toHaveURL(/[?&]form=Bark(&|$)/);
  await expect(editOf('Uncaria tomentosa')).toBeVisible();
  await expect(editOf('Uncaria guianensis')).toBeVisible();
  await expect(editOf('Senegalia greggii')).toHaveCount(0);
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

// M11.21: the toxic toggles, the ingredient's and each form's, which no story
// walks: each starts off, saving stores it, and reopening reads it back, the
// two apart. The ingredient's is turned by keyboard, a form's by a press.
test('the toxic toggles start off, save, and read back on reopening, each its own', async ({
  page,
}) => {
  await signInAs(page, 'toxic-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium?new');
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await adding.getByRole('textbox', { name: 'Name', exact: true }).fill('Aaa Toxicwort');
  await adding.getByRole('combobox', { name: 'Classification' }).click();
  await adding
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None' })
    .click();
  for (const form of ['Herb', 'Oil']) {
    const box = adding.getByRole('combobox', { name: 'New Form' });
    await box.click();
    await box.fill(form);
    await adding
      .getByRole('listbox', { name: 'New Form suggestions' })
      .getByRole('option', { name: new RegExp(`^${form} \\(`) })
      .click();
    // Each new form opens with its toggle off, closing the one added before it.
    const card = adding.getByRole('group', { name: form, exact: true });
    await expect(card.getByRole('switch', { name: 'Toxic', exact: true })).not.toBeChecked();
  }

  // The ingredient's starts off too.
  const toggles = adding.getByRole('switch', { name: 'Toxic', exact: true });
  await expect(toggles.first()).not.toBeChecked();

  // The ingredient's, reached from its Safety Notes by Tab, past its hint's
  // info tip, and turned by Space. Its sections come before Variants, so its
  // toggle is the first.
  await adding.getByRole('textbox', { name: 'Safety Notes' }).first().focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(toggles.first()).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggles.first()).toBeChecked();
  const oil = adding.getByRole('group', { name: 'Oil', exact: true });
  await oil.getByRole('switch', { name: 'Toxic', exact: true }).click();
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();

  // Read back from the server: the ingredient's on, Herb's off, Oil's on.
  const editing = page.getByRole('dialog', { name: 'Edit Ingredient, Aaa Toxicwort', exact: true });
  await expect(editing).toBeVisible();
  await page.reload();
  await editing.getByRole('button', { name: 'Open All' }).click();
  // The forms' cards are shut, so the one toggle shown is the ingredient's.
  const ingredientToggle = editing.getByRole('switch', { name: 'Toxic', exact: true });
  await expect(ingredientToggle).toHaveCount(1);
  await expect(ingredientToggle).toBeChecked();
  for (const [form, toxic] of [
    ['Herb', false],
    ['Oil', true],
  ] as const) {
    await editing.getByRole('button', { name: `Edit ${form}` }).click();
    const card = editing.getByRole('group', { name: form, exact: true });
    // Open All may have opened its sections already; open Details & Care if not.
    const details = card.getByRole('button', { name: 'Details & Care', exact: true });
    if ((await details.getAttribute('aria-expanded')) !== 'true') await details.click();
    const toggle = card.getByRole('switch', { name: 'Toxic', exact: true });
    if (toxic) await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  }
  await assertNoAccessibilityViolations(page);
});

// M8.10: the Name box is IngredientSearch's type-ahead. Its matching is the
// repository's and its states are the component test's; these walk it in a
// browser, where the dropdown, the modal it opens and the form before
// JavaScript are real (claude-docs/components/ingredient-search.md).
const CATS_CLAW = /^Cat's Claw \(Uncaria/;

test('a name typed shows matching rows, and a pick opens its modal over the list as it was shown', async ({
  page,
}) => {
  await signInAs(page, 'search-pick-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium?nomenclature=botanical');
  // Hydrated first: before it, the box is a plain text field with no dropdown.
  await page.waitForLoadState('networkidle');

  const name = page.getByRole('combobox', { name: 'Name' });
  await name.fill('cats claw');
  const rows = page.getByRole('option', { name: CATS_CLAW });
  await expect(rows.first()).toBeVisible();
  // Why the URL below could have carried the typed text: it was not applied while typing.
  await expect(page).not.toHaveURL(/query=/);

  await rows.first().click();

  const dialog = page.getByRole('dialog', { name: /^Edit Ingredient, Cat's Claw/ });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/[?&]nomenclature=botanical(&|$)/);
  await expect(page).toHaveURL(/[?&]edit=cat/);
  await expect(page).not.toHaveURL(/query=/);
});

test('Enter in the Name box applies the name, keeping Classification and No Refs', async ({
  page,
}) => {
  await signInAs(page, 'search-enter-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  await page.waitForLoadState('networkidle');

  await page.getByRole('combobox', { name: 'Classification' }).click();
  await page
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'Botanical' })
    .click();
  await expect(page).toHaveURL(/nomenclature=botanical/);
  await page.waitForLoadState('networkidle');
  await page.getByRole('switch', { name: 'No Refs' }).click();
  await expect(page).toHaveURL(/withoutReferences=1/);
  await page.waitForLoadState('networkidle');

  const edit = (formalName: string) =>
    page.getByRole('link', { name: `Edit Cat's Claw, ${formalName}` });
  // Why the narrowing below proves the name applied: the thorn one is listed first.
  await expect(edit('Senegalia greggii')).toBeVisible();

  const name = page.getByRole('combobox', { name: 'Name' });
  await name.fill('uncaria');
  await expect(page.getByRole('option').first()).toBeVisible();
  // The dropdown is open; Enter applies the typed text, not the highlighted row.
  await name.press('Enter');

  await expect(page).toHaveURL(/query=uncaria/);
  await expect(page).toHaveURL(/nomenclature=botanical/);
  await expect(page).toHaveURL(/withoutReferences=1/);
  await expect(edit('Uncaria tomentosa')).toBeVisible();
  await expect(edit('Senegalia greggii')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the filter form works with JavaScript off: a name and the Search button send query', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await signInAs(page, 'search-nojs-admin@admin-compendium.test', ['discord'], 'admin');
    await page.goto('/admin/compendium');

    const edit = (formalName: string) =>
      page.getByRole('link', { name: `Edit Cat's Claw, ${formalName}` });
    await expect(edit('Senegalia greggii')).toBeVisible();

    await page.getByRole('combobox', { name: 'Name' }).fill('uncaria');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/query=uncaria/);
    await expect(edit('Uncaria tomentosa')).toBeVisible();
    await expect(edit('Senegalia greggii')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('the open Name dropdown has no accessibility violations', async ({ page }) => {
  await signInAs(page, 'search-axe-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  await page.waitForLoadState('networkidle');

  await page.getByRole('combobox', { name: 'Name' }).fill('cats claw');
  await expect(page.getByRole('option', { name: CATS_CLAW }).first()).toBeVisible();

  await assertNoAccessibilityViolations(page);
});
