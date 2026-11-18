import type { Page } from '@playwright/test';
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

/** The bar's height is one line's: the bar height token at the current root font, and its one-pixel foot rule. */
async function expectOneLine(page: Page) {
  const { height, line } = await page.getByRole('banner').evaluate((bar) => {
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return { height: bar.getBoundingClientRect().height, line: root * 3.25 + 1 };
  });
  expect(
    Math.abs(height - line),
    `the bar is ${height}px tall, one line is ${line}px`,
  ).toBeLessThan(1);
}

async function signedInCovenPage(page: Page) {
  const world = await seedWorld(page);
  await signIn(page, world, 'steward');
  return `/coven/${world.coven.slug}`;
}

const SETTINGS = [
  { label: 'a 320px window', width: PURPOSE_WIDTHS.reflow, font: '100%' },
  { label: 'a 1280px window at a 200% root font', width: DESKTOP_WIDTH, font: '200%' },
  { label: 'a 320px window at a 200% root font', width: PURPOSE_WIDTHS.reflow, font: '200%' },
] as const;

for (const [kind, open, settings] of [
  ['a signed-in coven page', signedInCovenPage, SETTINGS],
  ['the public compendium', async () => '/compendium', SETTINGS.slice(0, 2)],
] as const) {
  test.describe(kind, () => {
    for (const { label, width, font } of settings) {
      test(`keeps the bar to one line in ${label}`, async ({ page }) => {
        const path = await open(page);
        await page.setViewportSize({ width, height: 812 });
        await visit(page, path);
        await rootFont(page, font);

        await expectOneLine(page);
        await assertNoSidewaysScroll(page, { width });
      });
    }
  });
}

test.describe('Add Ingredient', () => {
  test('shows its full label where it fits', async ({ page }) => {
    const path = await signedInCovenPage(page);
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 812 });
    await visit(page, path);

    const add = page
      .getByRole('banner')
      .getByRole('button', { name: 'Add Ingredient', exact: true });
    await expect(add).toBeVisible();
    expect((await add.innerText()).trim()).not.toBe('');
  });

  test('shows a plus, keeping its name, where its label does not fit', async ({ page }) => {
    const path = await signedInCovenPage(page);
    await page.setViewportSize({ width: PURPOSE_WIDTHS.reflow, height: 812 });
    await visit(page, path);
    const banner = page.getByRole('banner');

    const add = banner.getByRole('button', { name: 'Add Ingredient', exact: true });
    await expect(add).toBeVisible();
    // The plus alone: no visible text, the name kept for a screen reader.
    expect((await add.innerText()).trim()).toBe('');

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
