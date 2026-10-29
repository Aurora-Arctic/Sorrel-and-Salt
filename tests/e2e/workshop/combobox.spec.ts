import { expect, test, type Locator, type Page } from '@playwright/test';

// The Combobox's layout facts, measured in its Storybook stories since happy-dom draws no layout: the list
// opens above the box when there is no room beneath, follows it as the page scrolls, and an entry's tooltip
// opens only when its text is cut off (claude-docs/components/combobox.md). Offers and picks are tests/components/Combobox's.

const LONG = 'Fixturawortiamtestalisfixturawortiamtestalisfixturawortiamtestalisfixturawortiam';

/**
 * The story in Storybook's bare preview (`iframe.html`), with `css` in the page before the story
 * mounts, so a list opened on mount is placed in the page as `css` lays it
 * out rather than moved there afterwards.
 */
async function openStory(page: Page, story: string, css = '') {
  await page.setViewportSize({ width: 1280, height: 800 });
  if (css) {
    await page.addInitScript((rules) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = rules;
        document.head.append(style);
      });
    }, css);
  }
  await page.goto(`/iframe.html?id=forms-combobox--${story}&viewMode=story&globals=theme:dark`);
  await expect(page.getByRole('combobox').first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

const rect = (locator: Locator) =>
  locator.evaluate((node) => {
    const { top, bottom, left, height } = node.getBoundingClientRect();
    return { top, bottom, left, height };
  });

/** Two frames, so a placement Floating UI schedules has been applied. */
const frames = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

test('the list opens above the box when there is no room beneath it, inside the window', async ({
  page,
}) => {
  // The field is pushed near the window's foot inside the story frame, not by the body: the frame clips its
  // overflow, so moving the frame itself would leave the room beneath the field unchanged and nothing to flip from.
  await openStory(
    page,
    'two-buckets',
    '.workshop-story-frame { padding-top: calc(100vh - 200px); box-sizing: border-box; }',
  );
  const input = page.getByRole('combobox', { name: 'Form' });
  const list = page.getByRole('listbox', { name: 'Form suggestions' });
  await expect(list).toBeVisible();
  await frames(page);

  const box = await rect(input);
  const room = page.viewportSize()!.height - box.bottom;
  const placed = await rect(list);
  // Why it could have opened beneath: the box is in the window, and the list
  // holds more than the room left under it.
  expect(box.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(await list.evaluate((node) => node.scrollHeight)).toBeGreaterThan(room);

  expect(placed.bottom).toBeLessThanOrEqual(box.top);
  expect(placed.top).toBeGreaterThanOrEqual(0);
});

test('an open list follows its box as the page scrolls', async ({ page }) => {
  // The workshop's story frame carries a transform, which would make it the fixed
  // list's containing block and carry the list along with no placement at
  // all; without it the list is fixed to the window, as in the app.
  await openStory(
    page,
    'two-buckets',
    'body { padding-top: 300px; min-height: 300vh; } .workshop-story-frame { transform: none !important; }',
  );
  const input = page.getByRole('combobox', { name: 'Form' });
  const list = page.getByRole('listbox', { name: 'Form suggestions' });
  await expect(list).toBeVisible();
  await frames(page);
  const boxBefore = await rect(input);
  const listBefore = await rect(list);

  await page.evaluate(() => window.scrollBy(0, 150));
  await frames(page);
  const boxAfter = await rect(input);
  const listAfter = await rect(list);

  // Why it could have stayed put: the list is fixed to the window, and the box moved.
  expect(boxBefore.top - boxAfter.top).toBeCloseTo(150, 0);
  expect(Math.abs(listAfter.top - listBefore.top - (boxAfter.top - boxBefore.top))).toBeLessThan(1);
  expect(
    Math.abs(listAfter.left - listBefore.left - (boxAfter.left - boxBefore.left)),
  ).toBeLessThan(1);
});

test.describe('an entry’s tooltip', () => {
  /** An entry's own text, ahead of the tooltip that repeats it. */
  const textOf = (page: Page, value: string) =>
    page.getByRole('listitem').filter({ hasText: value }).getByText(value, { exact: true }).first();
  const isCutOff = (text: Locator) => text.evaluate((node) => node.scrollWidth > node.clientWidth);
  const tooltip = (page: Page) => page.getByRole('tooltip');

  test.beforeEach(async ({ page }) => {
    await openStory(page, 'folk-name-list');
    // The list opens on mount; closed, so it covers nothing hovered below.
    await page.getByRole('combobox', { name: 'Folk Name' }).press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('a cut-off text shows whole in a tooltip on hover and while its x has focus', async ({
    page,
  }) => {
    const text = textOf(page, LONG);
    // Why a tooltip is owed: the text is cut off.
    expect(await isCutOff(text)).toBe(true);
    await expect(tooltip(page)).toHaveCount(0);

    await text.hover();
    await expect(tooltip(page)).toBeVisible();
    await expect(tooltip(page)).toHaveText(LONG);

    await page.mouse.move(0, 0);
    await expect(tooltip(page)).toHaveCount(0);

    await page.getByRole('button', { name: `Remove ${LONG}` }).focus();
    await expect(tooltip(page)).toBeVisible();
    await expect(tooltip(page)).toHaveText(LONG);

    await page.keyboard.press('Escape');
    await expect(tooltip(page)).toHaveCount(0);
  });

  test('a text that fits opens no tooltip, on hover or on its x’s focus', async ({ page }) => {
    const text = textOf(page, 'Hedge Fixture');
    expect(await isCutOff(text)).toBe(false);

    await text.hover();
    await page.getByRole('button', { name: 'Remove Hedge Fixture' }).focus();
    // Why the wait could pass too soon: past the hover's 300ms rest, the
    // long entry's tooltip has opened by now, in the test above.
    await page.waitForTimeout(500);
    await expect(tooltip(page)).toHaveCount(0);
  });
});
