import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import postgres from 'postgres';
import type { IngredientElement } from '@/modules/ingredients/schema/ingredient-enums';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { insertDeityLink, insertIngredient } from '../support/db/insert-ingredient';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { seedCoven } from './stories/coven-ingredients';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { deitySlug, ingredientSlug } from '@/lib/slugify';

// M5.5: the admin's compendium form's presentation — IngredientForm on
// the compendium, which carries the form's first axe scans in a browser,
// the Combobox's among them (claude-docs/components/ingredient-form.md,
// "Testing").
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The dialog stands whole inside the viewport, so the long form scrolls inside it rather than off the screen. */
async function expectInsideViewport(page: Page, dialog: Locator) {
  const { width, height } = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  for (const gap of [box.y, height - box.y - box.height, box.x, width - box.x - box.width]) {
    expect(gap).toBeGreaterThanOrEqual(0);
  }
}

/** Presses Apply Filters in the open panel: everything held there is applied in one navigation. */
async function applyFilters(page: Page) {
  await page.getByRole('button', { name: 'Apply Filters' }).click();
}

/**
 * Opens the Filters panel and returns it. The button only exists once the page has hydrated
 * (before it, Filters is a link to the open panel), so waiting for it waits for the script.
 */
async function openFilters(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: /^Filters/ });
  await expect(button).toBeVisible();
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  const panel = page.getByRole('dialog', { name: 'Filters' });
  await expect(panel).toBeVisible();
  return panel;
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
  const wheeled = page.evaluate(
    () =>
      new Promise((done) =>
        addEventListener('wheel', done, { once: true, passive: true, capture: true }),
      ),
  );
  await page.mouse.wheel(0, 300);
  // The wheel arrived, then two frames: by then a wheel that reached the page
  // has moved it, as the precondition above shows it does with no dialog open.
  await wheeled;
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

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

test('the compendium form stands inside the viewport on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInAs(page, 'phone-admin@admin-compendium.test', ['discord'], 'admin');

  await page.goto('/admin/compendium?new');

  await expectInsideViewport(page, page.getByRole('dialog', { name: 'Add Ingredient' }));
  await assertNoAccessibilityViolations(page);
});

// The compendium form's pickers in the app, which no story checks: the add,
// edit and delete themselves are story 18's (tests/e2e/stories/07-admin.spec.ts).
test('the compendium form stands inside the viewport and keeps its pickers inside the dialog', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-compendium.test', ['discord'], 'admin');

  const response = await page.goto('/admin/compendium?new');
  expect(response?.status()).toBe(200);
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(adding).toBeVisible();

  // The long form scrolls inside the modal rather than running off the screen.
  await expectInsideViewport(page, adding);

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
test('Enter turns the No Refs switch, as Space does, and Apply Filters applies it', async ({
  page,
}) => {
  await signInAs(page, 'keyboard-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  // Hydrated first: before it, Enter submits the form natively with the switch off.
  await openFilters(page);

  const noRefs = page.getByRole('switch', { name: /^No Refs/ });
  await noRefs.focus();
  await expect(noRefs).not.toBeChecked();

  await page.keyboard.press('Enter');
  await expect(noRefs).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(noRefs).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(noRefs).toBeChecked();
  // Held, not applied: the panel covers the results, so the address waits for Apply.
  await expect(page).not.toHaveURL(/withoutReferences/);

  await applyFilters(page);
  await expect(page).toHaveURL(/withoutReferences=1/);
  await assertNoAccessibilityViolations(page);
});

// M11.22: the read takes a list of forms, and the Form box sends its one
// choice as a list of one, so the box still narrows the list by its form.
test('the Form box keeps only the entries holding the form chosen', async ({ page }) => {
  await signInAs(page, 'form-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  const editOf = (formalName: string) =>
    page.getByRole('link', { name: `Edit Cat's Claw, ${formalName}` });
  // Why the filter could have kept it: the thorn Cat's Claw is listed beside the bark ones.
  await expect(editOf('Senegalia greggii')).toBeVisible();
  await expect(editOf('Uncaria tomentosa')).toBeVisible();

  await openFilters(page);
  await page.getByRole('combobox', { name: 'Forms' }).fill('bark');
  await page.getByRole('option', { name: /^Bark/ }).click();
  await applyFilters(page);

  await expect(page).toHaveURL(/[?&]forms=Bark(&|$)/);
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
  await page.getByRole('option', { name: 'New Reference' }).click();
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

// M11.21: the ingredient's toxic toggle, which no story walks: it starts off,
// is reached by Tab and turned by Space, and reopening reads it back from the
// server. The forms' toggles and the two kept apart are the service's to prove
// (tests/modules/ingredients/services/toxic-flags.test.ts).
test('the toxic toggle starts off, saves, and reads back on reopening', async ({ page }) => {
  await signInAs(page, 'toxic-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium?new');
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await adding.getByRole('textbox', { name: 'Name', exact: true }).fill('Aaa Toxicwort');
  await adding.getByRole('combobox', { name: 'Classification' }).click();
  await adding
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None' })
    .click();

  const toggle = adding.getByRole('switch', { name: 'Toxic', exact: true });
  await expect(toggle).not.toBeChecked();
  // The next stop after Safety Notes by Tab (neither carries an info tip since
  // 2026-10-20), and turned by Space.
  await adding.getByRole('textbox', { name: 'Safety Notes' }).first().focus();
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggle).toBeChecked();
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();

  // Read back from the server after a reload.
  const editing = page.getByRole('dialog', { name: 'Edit Ingredient, Aaa Toxicwort', exact: true });
  await expect(editing).toBeVisible();
  await page.reload();
  await editing.getByRole('button', { name: 'Open All' }).click();
  await expect(editing.getByRole('switch', { name: 'Toxic', exact: true })).toBeChecked();
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
  await page.goto('/admin/compendium?withoutReferences=1');
  // Hydrated first: before it, the box is a plain text field with no dropdown.
  await page.waitForLoadState('networkidle');

  const name = page.getByRole('combobox', { name: 'Name' });
  await name.fill('cats claw');
  const rows = page.getByRole('option', { name: CATS_CLAW });
  await expect(rows.first()).toBeVisible();
  // Why the URL below could have carried the typed text: it was not applied while typing.
  await expect(page).not.toHaveURL(/query=/);
  // The open dropdown is a page state of its own, scanned once here.
  await assertNoAccessibilityViolations(page);

  await rows.first().click();

  const dialog = page.getByRole('dialog', { name: /^Edit Ingredient, Cat's Claw/ });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/[?&]withoutReferences=1(&|$)/);
  await expect(page).toHaveURL(/[?&]edit=cat/);
  await expect(page).not.toHaveURL(/query=/);
});

test('arrowing down the Name box keeps the highlighted row inside the dropdown', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'search-scroll-admin@admin-compendium.test',
    ['discord'],
    'admin',
  );
  // Enough matches to fill the dropdown past its height, which the seed has no one query for.
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    for (let i = 1; i <= 30; i++) {
      const name = `Scrollwort ${String(i).padStart(2, '0')}`;
      await insertIngredient(sql, makeIngredient({ name, nomenclature: 'none' }), userId);
    }
  } finally {
    await sql.end();
  }
  await page.goto('/admin/compendium');
  await page.waitForLoadState('networkidle');

  const name = page.getByRole('combobox', { name: 'Name' });
  await name.fill('scrollwort');
  const listbox = page.getByRole('listbox').filter({ has: page.getByRole('option') });
  const options = listbox.getByRole('option');
  await expect(options.first()).toBeVisible();

  // The panel that clips the rows: the listbox, or the popup around it. Its
  // box is what a row has to lie inside to be seen.
  const clip = await listbox.evaluateHandle((el) => {
    for (let n: Element | null = el; n; n = n.parentElement) {
      if (n.scrollHeight > n.clientHeight + 1 && getComputedStyle(n).overflowY !== 'visible')
        return n;
    }
    return el;
  });
  // Why the check below could fail: the rows fill more than the panel shows.
  expect(await clip.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);

  // The last row starts below the fold; ArrowDown walks to it from the top.
  const count = await options.count();
  for (let i = 0; i < count; i++) await name.press('ArrowDown');

  const active = listbox.locator('[role="option"][aria-selected="true"]');
  await expect(active).toHaveCount(1);
  const inside = await active.evaluate((row, panel) => {
    const r = row.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
  }, clip);
  expect(inside).toBe(true);
});

test('Enter in the Name box applies the name, keeping No Refs', async ({ page }) => {
  await signInAs(page, 'search-enter-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  await page.waitForLoadState('networkidle');

  await openFilters(page);
  await page.getByRole('switch', { name: /^No Refs/ }).click();
  // Closed again, which applies it, so that the dropdown below opens over the list and not under the panel.
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page).toHaveURL(/withoutReferences=1/);

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

// M8.13: the elements filter is in the address, as repeated parameters, and
// the address is the whole state: loaded directly (no control draws it yet,
// M12.4), it lists the entries holding any element named, the pager keeps it,
// another control's change keeps it and opens the first page, and a reload
// and Back show the same list.
test('?elements= in the address filters the list, survives the pager and another filter, and drops the page', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'element-filter-admin@admin-compendium.test',
    ['discord'],
    'admin',
  );
  // 28 entries holding fire among others, one earth, one water: thirty in
  // all, so the name alone spans two pages of 25.
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    for (let i = 1; i <= 30; i++) {
      const elements: IngredientElement[] =
        i <= 28 ? ['fire', 'air'] : i === 29 ? ['earth'] : ['water'];
      await insertIngredient(
        sql,
        makeIngredient({
          name: `Elementwort ${String(i).padStart(2, '0')}`,
          nomenclature: 'none',
          elements,
        }),
        userId,
      );
    }
  } finally {
    await sql.end();
  }

  const row = (n: number) =>
    page.getByRole('link', { name: `Edit Elementwort ${String(n).padStart(2, '0')}` });
  const main = page.getByRole('main');

  // One element finds an entry holding it among others; two find either.
  await page.goto('/admin/compendium?query=Elementwort&elements=earth');
  await expect(row(29)).toBeVisible();
  await expect(row(30)).toHaveCount(0);
  await expect(row(1)).toHaveCount(0);
  await page.goto('/admin/compendium?query=Elementwort&elements=earth&elements=water');
  await expect(row(29)).toBeVisible();
  await expect(row(30)).toBeVisible();
  await expect(row(1)).toHaveCount(0);

  // 28 hold fire: two pages, and the pager carries the filter to the second.
  await page.goto('/admin/compendium?query=Elementwort&elements=fire');
  await expect(row(1)).toBeVisible();
  await main.getByRole('link', { name: 'Next' }).click();
  // Why the cursor below could have survived the change: this page holds one.
  await expect(page).toHaveURL(/[?&]after=/);
  await expect(page).toHaveURL(/[?&]elements=fire(&|$)/);
  await expect(row(28)).toBeVisible();
  await expect(row(1)).toHaveCount(0);

  await page.reload();
  await expect(page).toHaveURL(/[?&]elements=fire(&|$)/);
  await expect(row(28)).toBeVisible();

  // Another filter changing keeps the elements and opens the first page.
  await openFilters(page);
  await main.getByRole('switch', { name: /^No Refs/ }).click();
  await applyFilters(page);
  await expect(page).toHaveURL(/[?&]withoutReferences=1(&|$)/);
  await expect(page).toHaveURL(/[?&]elements=fire(&|$)/);
  await expect(page).not.toHaveURL(/[?&](after|before)=/);
  await expect(row(1)).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/[?&]after=/);
  await expect(page).not.toHaveURL(/withoutReferences/);
  await expect(row(28)).toBeVisible();
});

// M8.11: the Categories picker (MB.126's CategoryPicker) in the filter row.
// The address holds the slugs, repeated; two picks combine with AND; a reload
// restores the chips; a pick is announced by the picker's own region.
test('the Categories picker filters by AND, writes repeated slugs, restores on reload and focuses back', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'category-filter-admin@admin-compendium.test',
    ['discord'],
    'admin',
  );
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const add = (name: string, categories: string[]) =>
      insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', categories }), userId);
    await add('Categorywort Both', ['Protection', 'Cleansing']);
    await add('Categorywort One', ['Protection']);
    await add('Categorywort None', []);
  } finally {
    await sql.end();
  }

  const edit = (name: string) => page.getByRole('link', { name: `Edit ${name}` });
  await page.goto('/admin/compendium?query=Categorywort');
  await openFilters(page);
  // Why the filter could have dropped them: all three are listed unfiltered.
  await expect(edit('Categorywort Both')).toBeVisible();
  await expect(edit('Categorywort One')).toBeVisible();
  await expect(edit('Categorywort None')).toBeVisible();

  const box = page.getByRole('combobox', { name: 'Category' });
  const announcer = page.getByRole('status', { name: 'Categories changes' });

  await box.fill('protection');
  await page.getByRole('option', { name: /^Protection/ }).click();
  // Held in the panel: the address and the list wait for Apply.
  await expect(box).toBeFocused();
  await expect(announcer).not.toBeEmpty();
  await expect(page).not.toHaveURL(/categories=/);
  await expect(edit('Categorywort None')).toBeVisible();
  await applyFilters(page);
  await expect(page).toHaveURL(/[?&]categories=protection(&|$)/);
  await expect(edit('Categorywort One')).toBeVisible();
  await expect(edit('Categorywort None')).toHaveCount(0);

  await openFilters(page);
  await box.fill('cleansing');
  await page.getByRole('option', { name: /^Cleansing/ }).click();
  await expect(box).toBeFocused();
  await applyFilters(page);
  await expect(page).toHaveURL(/[?&]categories=protection(&|.*&)categories=cleansing(&|$)/);
  await expect(edit('Categorywort Both')).toBeVisible();
  await expect(edit('Categorywort One')).toHaveCount(0);

  // The selected state is programmatic: the picked option is no longer offered.
  await openFilters(page);
  await box.fill('cleansing');
  await expect(page.getByRole('option', { name: /^Cleansing/ })).toHaveCount(0);
  await box.fill('');

  await page.reload();
  await expect(page).toHaveURL(/[?&]categories=cleansing(&|$)/);
  await expect(edit('Categorywort Both')).toBeVisible();
  await expect(edit('Categorywort One')).toHaveCount(0);

  // An unknown slug is dropped and the rest still filter.
  await page.goto(
    '/admin/compendium?query=Categorywort&categories=nosuchslug&categories=protection',
  );
  await expect(edit('Categorywort One')).toBeVisible();
  await expect(edit('Categorywort None')).toHaveCount(0);
});

test('the Categories picker is usable at 375px and has no accessibility violations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await signInAs(page, 'category-axe-admin@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium?categories=protection');
  await openFilters(page);

  const box = page.getByRole('combobox', { name: 'Category' });
  await box.scrollIntoViewIfNeeded();
  await expect(box).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  await box.fill('cl');
  await expect(page.getByRole('option').first()).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// M8.12: the match mode. Two categories show an All and Any choice; Any widens
// the list to an entry filed under either, writes `categoryMode=any`, and a
// reload keeps it. Dropping to one category drops the mode from the address.
test('the match mode widens two categories to Any, is kept in the address, and goes with the second category', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'category-mode-admin@admin-compendium.test',
    ['discord'],
    'admin',
  );
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const add = (name: string, categories: string[]) =>
      insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', categories }), userId);
    await add('Modewort Both', ['Protection', 'Cleansing']);
    await add('Modewort One', ['Protection']);
    await add('Modewort None', []);
  } finally {
    await sql.end();
  }

  const edit = (name: string) => page.getByRole('link', { name: `Edit ${name}` });
  const match = page.getByRole('group', { name: 'Match' });
  await page.goto('/admin/compendium?query=Modewort&categories=protection');
  await openFilters(page);
  // One category: the mode stays, on All, and cannot be changed.
  await expect(match.getByRole('button', { name: /All/ })).toBeDisabled();

  const box = page.getByRole('combobox', { name: 'Category' });
  await box.fill('cleansing');
  await page.getByRole('option', { name: /^Cleansing/ }).click();
  await expect(match.getByRole('button', { name: /All/ })).toHaveCount(0);
  await expect(held(match, 'All')).toBeEnabled();
  await expect(held(match, 'All')).toBeChecked();
  await applyFilters(page);
  // Why Any could differ: under All, the entry with one category is out.
  await expect(edit('Modewort Both')).toBeVisible();
  await expect(edit('Modewort One')).toHaveCount(0);

  await openFilters(page);
  await choose(match, 'Any');
  await applyFilters(page);
  await expect(page).toHaveURL(/[?&]categoryMode=any(&|$)/);
  await expect(edit('Modewort One')).toBeVisible();
  await expect(edit('Modewort Both')).toBeVisible();
  await expect(edit('Modewort None')).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  await page.reload();
  await openFilters(page);
  await expect(held(match, 'Any')).toBeChecked();
  await expect(edit('Modewort One')).toBeVisible();

  // Back to one category: the mode goes from the address and the group rests on All, disabled.
  await page.getByRole('button', { name: 'Remove Category: Cleansing' }).click();
  await expect(match.getByRole('button', { name: /All/ })).toBeDisabled();
  await applyFilters(page);
  await expect(page).not.toHaveURL(/categoryMode/);

  // A second category starts again at All.
  await openFilters(page);
  await box.fill('cleansing');
  await page.getByRole('option', { name: /^Cleansing/ }).click();
  await expect(held(match, 'All')).toBeChecked();
  await applyFilters(page);
  await expect(edit('Modewort One')).toHaveCount(0);
});

// M12.1: a curator makes a folk name the display name. The question always
// asks; once answered the list shows the folk name as the entry's name, and
// the question holds at 375px without an accessibility violation. The entry
// is held by two covens first, so the delete confirm's coven count (M12.25)
// is walked here too: nothing else opens it in a browser.
test('a curator sees the covens holding an entry, then promotes a folk name and the list shows it as the name', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  // seedCoven signs each owner in on this page, so it runs before the curator signs in.
  const covens = [
    await seedCoven(page, 'Fixture Coven Count One', 'count-one.test', { A: 'owner' }),
    await seedCoven(page, 'Fixture Coven Count Two', 'count-two.test', { A: 'owner' }),
  ];
  const { userId } = await signInAs(
    page,
    'promote-curator@admin-compendium.test',
    ['discord'],
    'curator',
  );
  const fixture = makeIngredient({
    name: 'Fixture Promotewort',
    canonicalName: 'Fixtura promotea',
    folkNames: ['Hedge Promote', 'Lane Promote'],
  });
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const ingredientId = await insertIngredient(sql, fixture, userId);
    for (const coven of covens) {
      await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, userId);
    }
  } finally {
    await sql.end();
  }
  const editUrl = `/admin/compendium?edit=${ingredientSlug(fixture.name, fixture.canonicalName)}`;
  await page.goto(editUrl);
  const dialog = page.getByRole('dialog', { name: /^Edit Ingredient, Fixture Promotewort/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete Ingredient' }).click();
  const deleting = dialog.getByRole('group', { name: /Delete/ });
  await expect(deleting.getByRole('status')).toContainText('2');
  await assertNoAccessibilityViolations(page);

  // A fresh load sets the delete question aside without answering it.
  await page.goto(editUrl);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Open All' }).click();

  const folk = dialog.getByRole('group', { name: 'Folk Names', exact: true });
  const promote = folk.getByRole('button', {
    name: 'Make Hedge Promote the Display Name',
    exact: true,
  });
  // The precondition: the entry is named for what it is saved as, and the control is there to press.
  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Fixture Promotewort',
  );
  await promote.click();

  const question = page.getByRole('button', { name: 'Promote', exact: true });
  await expect(question).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await question.click();

  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Hedge Promote',
  );
  await expect(folk.getByRole('button', { name: 'Remove Fixture Promotewort' })).toBeVisible();
  await expect(folk.getByRole('button', { name: 'Remove Hedge Promote' })).toHaveCount(0);

  // What the list reads from the database, not from the open form.
  await page.goto('/admin/compendium?query=Promote');
  await expect(page.getByRole('link', { name: /^Edit Hedge Promote/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit Fixture Promotewort/ })).toHaveCount(0);
});

// M12.4: the Filters panel and the sentence above the results, walked in a browser. Five
// entries named Facetwort A to E: A holds the form Alpha, B the form Beta, C the form Gamma
// and the Greek deity, D Alpha and the Greek deity and is toxic, E Alpha and the Roman deity.
// The deity is one name under two traditions, so the address has to tell them apart.
const FACET_DEITY = 'Facetdeity';
const GREEK_SLUG = deitySlug(FACET_DEITY, 'Greek');
const ROMAN_SLUG = deitySlug(FACET_DEITY, 'Roman');

async function seedFacetworts(userId: string) {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    // Seeded once per database: the specs below share it, and a deity's slug is unique.
    const [seeded] = await sql`select 1 from ingredients where name = 'Facetwort A' limit 1`;
    if (seeded) return;
    const deity = async (tradition: string) => {
      const [row] = await sql.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', ${userId}, true)`;
        return tx`
          insert into deities (name, slug, description, tradition_id, created_by, updated_by)
          select ${FACET_DEITY}, ${deitySlug(FACET_DEITY, tradition)}, 'A fixture deity.', id,
            ${userId}, ${userId}
          from deity_traditions where name = ${tradition} and deleted_at is null
          returning id`;
      });
      return row.id as string;
    };
    const greek = await deity('Greek');
    const roman = await deity('Roman');
    const add = (letter: string, form: string, toxic = false) =>
      insertIngredient(
        sql,
        makeIngredient({
          name: `Facetwort ${letter}`,
          nomenclature: 'none',
          toxic,
          variants: [makeVariant({ form: `Facetform ${form}` })],
        }),
        userId,
      );
    await add('A', 'Alpha');
    await add('B', 'Beta');
    await insertDeityLink(sql, await add('C', 'Gamma'), greek, 0, userId);
    await insertDeityLink(sql, await add('D', 'Alpha', true), greek, 0, userId);
    await insertDeityLink(sql, await add('E', 'Alpha'), roman, 0, userId);
  } finally {
    await sql.end();
  }
}

/**
 * Picks a choice in a choice chip: opens its menu, then clicks the option's label, since the
 * native radio under it is drawn invisible and a click on the input finds the label in the way.
 * Shut, the menu's radios are out of the accessibility tree, so the option is found only once
 * the summary has opened it.
 */
async function choose(group: Locator, name: string | RegExp): Promise<void> {
  await group.locator('summary').click();
  await group
    .getByRole('radio', { name })
    .locator('xpath=ancestor::label[1]')
    .click({ position: { x: 10, y: 10 } });
}

/** A radio in a chip's menu whether the menu is open or shut, for what it holds rather than what is shown. */
const held = (group: Locator, name: string | RegExp): Locator =>
  group.getByRole('radio', { name, includeHidden: true });

async function listed(page: Page): Promise<string> {
  // A link is named by its aria-label when it has one, else by its text.
  const labels = await page
    .getByRole('link', { name: /^Edit Facetwort / })
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('aria-label') ?? link.textContent ?? ''),
    );
  return labels
    .map((label) => label.trim().slice(-1))
    .sort()
    .join('');
}

/** The sentence above the results: the one status region that is not a picker's announcer. */
const sentenceOf = (page: Page) =>
  page.locator('p[role="status"]').filter({ hasNot: page.getByRole('link') });

/** The number a label ends on, as in "Toxic 3". */
// Bare in a choice chip's radio and in a suggestion; a radio group's own count may still carry brackets.
const countIn = (label: string) => Number(/(\d+)\)?\s*$/.exec(label.trim())?.[1]);

/** Picks the option of a type-ahead or multi-select by its label. */
async function pick(page: Page, box: string, typed: string, option: string | RegExp) {
  const field = page.getByRole('combobox', { name: box, exact: true });
  // The click first: a list closed by Escape or a press elsewhere stays closed while the field keeps
  // focus, and `fill` sets the value without a focus event, so the list would never reopen.
  await field.click();
  await field.fill(typed);
  await page.getByRole('option', { name: option }).first().click();
  // A pick leaves the list open for the next (M12.54); Tab away closes it, as a person would before
  // reaching for what it covers. Not Escape: a list left with nothing to offer closes itself as the
  // counts reload, and an Escape landing after that closes the Filters panel instead.
  await field.press('Tab');
}

test('two forms list the entries holding either, and a form with a deity lists the entries holding both', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'facet-forms@admin-compendium.test',
    ['discord'],
    'admin',
  );
  await seedFacetworts(userId);
  await page.goto('/admin/compendium?query=Facetwort');
  await openFilters(page);
  // Why a filter could drop rows: all five are listed unfiltered.
  await expect.poll(() => listed(page)).toBe('ABCDE');

  // M12.54: after a pick the list stays open for the next, the focus in the box; Escape closes it.
  const forms = page.getByRole('combobox', { name: 'Forms', exact: true });
  await forms.click();
  await forms.fill('Facetform Alpha');
  await page
    .getByRole('option', { name: /^Facetform Alpha/ })
    .first()
    .click();
  await expect(forms).toHaveAttribute('aria-expanded', 'true');
  await expect(forms).toBeFocused();
  await forms.press('Escape');
  await expect(forms).toHaveAttribute('aria-expanded', 'false');
  // Held in the panel: neither the address nor the list has moved.
  await expect(page).not.toHaveURL(/forms=/);
  await expect.poll(() => listed(page)).toBe('ABCDE');
  await applyFilters(page);
  await expect(page).toHaveURL(/[?&]forms=Facetform(\+|%20)Alpha(&|$)/);
  await expect.poll(() => listed(page)).toBe('ADE');

  await openFilters(page);
  await pick(page, 'Forms', 'Facetform Beta', /^Facetform Beta/);
  await applyFilters(page);
  await expect(page).toHaveURL(/forms=Facetform(\+|%20)Alpha&forms=Facetform(\+|%20)Beta/);
  await expect.poll(() => listed(page)).toBe('ABDE');
  // The sentence names each value, and holds no link to follow.
  const sentence = sentenceOf(page);
  await expect(sentence).toContainText('facetform alpha');
  await expect(sentence).toContainText('facetform beta');
  await expect(sentence.getByRole('link')).toHaveCount(0);

  // A chip's cross takes its value out of the filter and the address.
  await openFilters(page);
  await page.getByRole('button', { name: 'Remove Form: Facetform Beta' }).click();
  await applyFilters(page);
  await expect(page).not.toHaveURL(/Beta/);
  await expect.poll(() => listed(page)).toBe('ADE');
  await expect(sentence).not.toContainText('facetform beta');

  // Two deities of one name, told apart by the address and the sentence.
  await openFilters(page);
  await pick(page, 'Deities', FACET_DEITY, new RegExp(`^${FACET_DEITY}`));
  await applyFilters(page);
  await expect.poll(() => page.url()).toMatch(/deities=/);
  const slugs = [GREEK_SLUG, ROMAN_SLUG].filter((slug) => page.url().includes(`deities=${slug}`));
  expect(slugs).toHaveLength(1);
  // One form and one deity: the entries holding both.
  await expect.poll(() => listed(page)).toBe(slugs[0] === GREEK_SLUG ? 'D' : 'E');

  await openFilters(page);
  await pick(page, 'Deities', FACET_DEITY, new RegExp(`^${FACET_DEITY}`));
  await applyFilters(page);
  await expect(page).toHaveURL(new RegExp(`deities=${GREEK_SLUG}`));
  await expect(page).toHaveURL(new RegExp(`deities=${ROMAN_SLUG}`));
  await expect.poll(() => listed(page)).toBe('DE');
  await expect(sentence).toContainText(`${FACET_DEITY} (Greek)`);
  await expect(sentence).toContainText(`${FACET_DEITY} (Roman)`);
});

test('the panel takes focus in, gives it back on Escape, and a reload and Back both restore the filter', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'facet-focus@admin-compendium.test',
    ['discord'],
    'admin',
  );
  await seedFacetworts(userId);
  await page.goto('/admin/compendium?query=Facetwort');
  const button = page.getByRole('button', { name: /^Filters/ });
  const panel = await openFilters(page);
  expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');

  // Two changes, two entries in the history.
  await openFilters(page);
  await pick(page, 'Forms', 'Facetform Alpha', /^Facetform Alpha/);
  await applyFilters(page);
  await expect.poll(() => listed(page)).toBe('ADE');
  await openFilters(page);
  await choose(page.getByRole('group', { name: 'Toxic' }), /^Toxic \d/);
  await applyFilters(page);
  await expect.poll(() => listed(page)).toBe('D');

  await page.reload();
  await expect(page).toHaveURL(/toxic=toxic/);
  await expect(button).toHaveAccessibleName('Filters 2');
  await expect.poll(() => listed(page)).toBe('D');
  await openFilters(page);
  await expect(page.getByRole('button', { name: 'Remove Form: Facetform Alpha' })).toBeVisible();
  await expect(held(page.getByRole('group', { name: 'Toxic' }), /^Toxic \d/)).toBeChecked();

  await page.goBack();
  await expect(page).not.toHaveURL(/toxic=/);
  await expect(page).toHaveURL(/forms=Facetform/);
  await expect.poll(() => listed(page)).toBe('ADE');
  await expect(page.getByRole('button', { name: /^Filters/ })).toHaveAccessibleName('Filters 1');
});

test('at 375px the panel is a modal sheet that closes on Escape, with no accessibility violations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { userId } = await signInAs(
    page,
    'facet-phone@admin-compendium.test',
    ['discord'],
    'admin',
  );
  await seedFacetworts(userId);
  await page.goto('/admin/compendium?query=Facetwort&forms=Facetform+Alpha');
  const panel = await openFilters(page);

  // A sheet, not an overlay: the browser holds the rest of the page inert behind it.
  await expect.poll(() => panel.evaluate((el) => el.matches(':modal'))).toBe(true);
  await expect(panel.getByRole('button', { name: 'Close' }).first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await assertNoAccessibilityViolations(page);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: /^Filters/ })).toBeFocused();
});

test('the panel opens with its top at its final place from the first frame', async ({ page }) => {
  const { userId } = await signInAs(
    page,
    'facet-layout@admin-compendium.test',
    ['discord'],
    'admin',
  );
  await seedFacetworts(userId);
  // The suite runs with reduced motion, which skips the slide this test is about.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/admin/compendium?query=Facetwort');
  const button = page.getByRole('button', { name: /^Filters/ });
  await button.waitFor();
  // The pre-paint script that hides the open no-script panel until hydration has run.
  await expect(page.locator('html')).toHaveAttribute('data-js', '');
  await page.evaluate(() => {
    const w = window as unknown as { tops: number[] };
    w.tops = [];
    const tick = () => {
      const pad = document.querySelector('.facet-panel__pad');
      const dialog = document.querySelector('dialog.facet-panel');
      if (pad && dialog instanceof HTMLDialogElement && dialog.open) {
        w.tops.push(pad.getBoundingClientRect().top);
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
  const panel = await openFilters(page);
  await expect(panel.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
  // Until the slide has finished, so the frames sampled cover the whole of it.
  await panel.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
  const tops = await page.evaluate(() => (window as unknown as { tops: number[] }).tops);
  // Why it could have moved: the slide ran, so frames were sampled while the height grew.
  expect(tops.length).toBeGreaterThan(5);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
});

for (const [label, width, height] of [
  ['1280', 1280, 900],
  ['390', 390, 800],
] as const) {
  test(`the Match menu opens whole inside the panel at ${label}px`, async ({ page }) => {
    await signInAs(page, `match-menu-${label}@admin-compendium.test`, ['discord'], 'admin');
    await page.setViewportSize({ width, height });
    // Two categories chosen, so Match can open; it ends its row on every panel, which is
    // where a menu hung from the chip's left edge ran past the panel's right edge.
    await page.goto('/admin/compendium?categories=protection&categories=cleansing');
    const panel = await openFilters(page);
    const match = panel.getByRole('group', { name: 'Match' });
    await match.locator('summary').click();
    await expect(match.locator('details')).toHaveAttribute('open', '');
    const menu = match.locator('.facet-chip__menu');
    await expect(menu).toBeVisible();
    // Why it could have been cut: the menu is wider than the chip and the panel clips to its
    // own box.
    const menuBox = (await menu.boundingBox())!;
    const chipBox = (await match.locator('summary').boundingBox())!;
    expect(menuBox.width).toBeGreaterThan(chipBox.width);
    // Polled: the menu takes its side once it has measured itself open.
    await expect
      .poll(async () => {
        const box = (await menu.boundingBox())!;
        const panelBox = (await panel.boundingBox())!;
        return box.x >= panelBox.x && box.x + box.width <= panelBox.x + panelBox.width;
      })
      .toBe(true);
  });
}

for (const [label, width, height] of [
  ['1280', 1280, 900],
  ['375', 375, 800],
] as const) {
  test(`the Match tip opens whole inside the panel at ${label}px`, async ({ page }) => {
    await signInAs(page, `match-tip-${label}@admin-compendium.test`, ['discord'], 'admin');
    await page.setViewportSize({ width, height });
    await page.goto('/admin/compendium?categories=protection&categories=cleansing');
    const panel = await openFilters(page);
    const match = panel.getByRole('group', { name: 'Match' });
    await expect(match).toBeVisible();
    await match.locator('summary, button').hover();
    const tip = panel.getByRole('tooltip');
    await expect(tip).toBeVisible();
    // Why it could have been cut: the panel clips to its own box, so a tip opening past the
    // top edge would lie outside it. Whole means every edge of the tip is inside the panel's.
    const tipBox = (await tip.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    expect(tipBox.y).toBeGreaterThanOrEqual(panelBox.y);
    expect(tipBox.x).toBeGreaterThanOrEqual(panelBox.x);
    expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
    expect(tipBox.y + tipBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height);
    // The tip is the thing on top at its own centre, so nothing covers or clips it.
    expect(
      await tip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
    ).toBe(true);
  });
}

// The Categories column draws the card's chips: the first two and a +N button, whose panel
// floats over the rows beneath. A component test cannot measure where it opens, or that the
// table frame does not clip it or the row grow. No seeded entry has more than three
// categories, so the test seeds its own with four, named to sort first, and leaves the
// seeded entries as every other test on the worker reads them.
const CHIPWORT = 'Aaa Chipwort';

async function seedChipwort(userId: string) {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [seeded] = await sql`select 1 from ingredients where name = ${CHIPWORT} limit 1`;
    if (seeded) return;
    await insertIngredient(
      sql,
      makeIngredient({
        name: CHIPWORT,
        nomenclature: 'none',
        categories: ['Protection', 'Binding', 'Healing', 'Strength'],
      }),
      userId,
    );
  } finally {
    await sql.end();
  }
}

for (const [name, viewport] of [
  ['a desktop table', { width: 1280, height: 900 }],
  ['a phone card', { width: 375, height: 800 }],
] as const) {
  test(`the +N panel in the Categories column floats over the rows beneath on ${name}, and the row keeps its height`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const { userId } = await signInAs(
      page,
      `chips-${viewport.width}@admin-compendium.test`,
      ['discord'],
      'admin',
    );
    await seedChipwort(userId);
    await page.goto('/admin/compendium');
    const more = page.getByRole('button', { name: /more categories? for Aaa Chipwort/i }).first();
    await expect(more).toBeVisible();
    const row = page.getByRole('row').filter({ has: more });

    // Why the panel could have gone wrong: the table frame scrolls, and there are rows below.
    expect(await page.getByRole('row').count()).toBeGreaterThan(3);
    // Centred, so the panel has room to open below.
    await more.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const rowBefore = (await row.boundingBox())!.height;
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const panel = row.getByRole('group', { name: /^More categories for Aaa Chipwort/ });
    await expect(panel).toBeVisible();

    // Floating, not pushing: the row is no taller.
    expect((await row.boundingBox())!.height).toBe(rowBefore);
    // On top of what is beneath: the point at the panel's centre belongs to the panel,
    // whatever row or Edit pencil lies under it.
    const onTop = await panel.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return el.contains(hit);
    });
    expect(onTop).toBe(true);
    // The fixed panel adds nothing to the page's width.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toBeFocused();
  });
}

test('the Edit column stays pinned at the frame edge while the table scrolls sideways, and its link still opens', async ({
  page,
}) => {
  // Wide enough to be a table (above the stacking width), narrow enough that it scrolls.
  await page.setViewportSize({ width: 700, height: 900 });
  await signInAs(page, 'pinned-edit@admin-compendium.test', ['discord'], 'admin');
  await page.goto('/admin/compendium');
  const frame = page.locator('.data-table-frame');
  const scrollable = await frame.evaluate((el) => el.scrollWidth > el.clientWidth);
  // Why the pin could have failed: the table does overflow its frame.
  expect(scrollable).toBe(true);

  await frame.evaluate((el) => {
    el.scrollTo({ left: el.scrollWidth });
  });
  const edit = page.getByRole('link', { name: /^Edit / }).first();
  const frameBox = (await frame.boundingBox())!;
  const editBox = (await edit.boundingBox())!;
  expect(editBox.x + editBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  // Scrolled back to the start it is still inside the frame: pinned, not merely scrolled to.
  await frame.evaluate((el) => {
    el.scrollTo({ left: 0 });
  });
  const startBox = (await edit.boundingBox())!;
  expect(startBox.x + startBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  await edit.click();
  await expect(page).toHaveURL(/[?&]edit=/);
});

// M12.30: the No Form to-do filter lists the entries with no live form. Formlesswort A and B
// hold none; Formlesswort C holds one, so the filter must leave it out.
async function seedFormlessworts(userId: string) {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [seeded] = await sql`select 1 from ingredients where name = 'Formlesswort A' limit 1`;
    if (seeded) return;
    const add = (letter: string, variants: ReturnType<typeof makeVariant>[]) =>
      insertIngredient(
        sql,
        makeIngredient({ name: `Formlesswort ${letter}`, nomenclature: 'none', variants }),
        userId,
      );
    await add('A', []);
    await add('B', []);
    await add('C', [makeVariant({ form: 'Formlessform Alpha' })]);
  } finally {
    await sql.end();
  }
}

test('No Form lists the entries with no form, counts them, and lives in the address', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'no-form@admin-compendium.test', ['discord'], 'admin');
  await seedFormlessworts(userId);
  const shownNames = async () =>
    (
      await page
        .getByRole('link', { name: /^Edit Formlesswort / })
        .evaluateAll((links) =>
          links.map((link) => (link.getAttribute('aria-label') ?? link.textContent ?? '').trim()),
        )
    )
      .map((label) => label.slice(-1))
      .sort()
      .join('');

  await page.goto('/admin/compendium?query=Formlesswort');
  // Why the filter could have mattered: all three are listed before it.
  await expect.poll(shownNames).toBe('ABC');
  const panel = await openFilters(page);
  const noForm = panel.getByRole('switch', { name: /^No Form/ });
  const shown = countIn(
    await noForm.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent ?? ''),
  );
  expect(shown).toBe(2);
  await noForm.click();
  await applyFilters(page);

  await expect(page).toHaveURL(/[?&]withoutForms=1(&|$)/);
  await expect.poll(shownNames).toBe('AB');

  // A link opens it, and Back keeps the page before it.
  await page.goto('/admin/compendium?query=Formlesswort&withoutForms=1');
  await expect.poll(shownNames).toBe('AB');
  await openFilters(page);
  await expect(page.getByRole('switch', { name: /^No Form/ })).toBeChecked();
  await assertNoAccessibilityViolations(page);
  await page.goBack();
  await expect(page).not.toHaveURL(/withoutForms/);
});
