import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { seedWorld, signIn, visit } from './axe-sweep';
import { DESKTOP_WIDTH, PURPOSE_WIDTHS } from './breakpoints';
import { recreateE2eDatabase } from './database';

// The header stays one line at every width and text size: what does not fit is folded, Add Ingredient first to a
// plus, then into the account panel (claude-docs/components/app-shell.md, "The end block").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function rootFont(page: Page, size: string) {
  await page.evaluate(
    (fontSize) =>
      new Promise<void>((done) => {
        document.documentElement.style.fontSize = fontSize;
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
    size,
  );
}

/** The bar's height is one line's: the bar height token at the current root font, its foot rule inside it. */
async function expectOneLine(page: Page) {
  const { height, line } = await page.getByRole('banner').evaluate((bar) => {
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return { height: bar.getBoundingClientRect().height, line: root * 3.25 };
  });
  expect(
    Math.abs(height - line),
    `the bar is ${height}px tall, one line is ${line}px`,
  ).toBeLessThan(1);
}

/** Every control in the bar ends inside the window, the end block's own controls included. */
async function expectBarInWindow(page: Page) {
  const { scanned, past } = await page.getByRole('banner').evaluate((bar) => {
    const edge = document.documentElement.clientWidth + 0.5;
    const inner = bar.firstElementChild;
    const end = inner?.lastElementChild;
    const controls = [...(inner?.children ?? []), ...(end?.children ?? [])];
    return {
      scanned: controls.length,
      past: controls
        .filter((control) => control.getBoundingClientRect().right > edge)
        .map((control) => control.className),
    };
  });
  // The brand, the nav and the end block, and the account button and the disc inside it at least.
  expect(scanned).toBeGreaterThanOrEqual(5);
  expect(past, 'controls of the bar that end past the window').toEqual([]);
}

/** How many times wider than tall the button is: a label is several, the plus alone is one. */
const aspectOf = (button: Locator) =>
  button.evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return width / height;
  });

async function signedInCovenPage(page: Page) {
  const world = await seedWorld(page);
  await signIn(page, world, 'steward');
  return `/coven/${world.coven.slug}`;
}

const PUBLIC_SETTINGS = [
  { label: 'a 320px window', width: PURPOSE_WIDTHS.reflow, font: '100%' },
  { label: 'a 1280px window at a 200% root font', width: DESKTOP_WIDTH, font: '200%' },
] as const;
const SETTINGS = [
  ...PUBLIC_SETTINGS,
  { label: 'a 320px window at a 200% root font', width: PURPOSE_WIDTHS.reflow, font: '200%' },
] as const;

for (const [kind, open, settings] of [
  ['a signed-in coven page', signedInCovenPage, SETTINGS],
  ['the public compendium', async () => '/compendium', PUBLIC_SETTINGS],
] as const) {
  test.describe(kind, () => {
    for (const { label, width, font } of settings) {
      test(`keeps the bar to one line in ${label}`, async ({ page }) => {
        const path = await open(page);
        await page.setViewportSize({ width, height: 812 });
        await visit(page, path);
        await rootFont(page, font);

        await expectOneLine(page);
        await expectBarInWindow(page);
        // At 320px and 200% the page beneath reaches past the window by itself (a long coven name in the
        // heading, the phone tab bar's labels), so there the bar alone is held to the window.
        if (font === '100%' || width !== PURPOSE_WIDTHS.reflow) {
          await assertNoSidewaysScroll(page, { width });
        }
      });
    }
  });
}

test('moves the site links into the account panel where even the folded bar has no room for them', async ({
  page,
}) => {
  const world = await seedWorld(page);
  // A keeper's bar has four site links, more than a 1280px window holds beside the folded end at a 200% root font.
  await signIn(page, world, 'keeper');
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 812 });
  await visit(page, '/keepers');
  const banner = page.getByRole('banner');
  const site = banner.getByRole('navigation', { name: 'Site' });
  await expect(site.getByRole('link', { name: 'Keepers' })).toBeVisible();

  await rootFont(page, '200%');
  await expectOneLine(page);
  await expectBarInWindow(page);
  await assertNoSidewaysScroll(page, { width: DESKTOP_WIDTH });
  await expect(site).toBeHidden();

  const account = banner.locator('.account-menu__button');
  await account.click();
  const panel = page.locator(`[id="${await account.getAttribute('aria-controls')}"]`);
  for (const name of ['Compendium', 'Your Coven', 'Curator', 'Keepers']) {
    await expect(panel.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(panel.getByRole('button', { name: 'Add Ingredient', exact: true })).toBeVisible();
});

test.describe('Add Ingredient', () => {
  test('shows its full label where it fits', async ({ page }) => {
    const path = await signedInCovenPage(page);
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 812 });
    await visit(page, path);

    const add = page
      .getByRole('banner')
      .getByRole('button', { name: 'Add Ingredient', exact: true });
    await expect(add).toBeVisible();
    expect(await aspectOf(add)).toBeGreaterThan(2);
  });

  test('shows a plus, keeping its name, where its label does not fit', async ({ page }) => {
    const path = await signedInCovenPage(page);
    await page.setViewportSize({ width: PURPOSE_WIDTHS.reflow, height: 812 });
    await visit(page, path);
    const banner = page.getByRole('banner');

    const add = banner.getByRole('button', { name: 'Add Ingredient', exact: true });
    await expect(add).toBeVisible();
    // The plus alone, a square, the name kept for a screen reader.
    expect(await aspectOf(add)).toBeCloseTo(1, 1);
    await expect(add.locator('svg')).toBeVisible();

    await add.click();
    await expect(page.getByRole('dialog', { name: /^Add Ingredient/ })).toBeVisible();
  });

  test('folds into the account panel as its first item where even the plus does not fit', async ({
    page,
  }) => {
    const path = await signedInCovenPage(page);
    await page.setViewportSize({ width: PURPOSE_WIDTHS.reflow, height: 812 });
    await visit(page, path);
    await rootFont(page, '200%');
    const banner = page.getByRole('banner');
    const account = banner.getByRole('button', { name: 'Fixture A', exact: true });
    const add = banner.getByRole('button', { name: 'Add Ingredient', exact: true });

    // Folded: the bar shows the account button and no Add Ingredient.
    await expect(account).toBeVisible();
    await expect(add).toBeHidden();

    await account.focus();
    await page.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator(`[id="${await account.getAttribute('aria-controls')}"]`);
    await expect(panel.getByRole('listitem').first().getByRole('button')).toHaveAccessibleName(
      'Add Ingredient',
    );
    await expect(add).toBeVisible();
    // The panel is wider than the room left of the account button at this size, and still opens inside the window.
    const { left, right, edge } = await panel.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, edge: document.documentElement.clientWidth };
    });
    expect(right - left).toBeGreaterThan(0);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(edge);

    await page.keyboard.press('Tab');
    await expect(add).toBeFocused();
    await assertNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toBeFocused();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(add).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /^Add Ingredient/ });
    await expect(dialog).toBeVisible();
    await expect(account).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(account).toBeFocused();
  });
});
