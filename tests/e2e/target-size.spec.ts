import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { seedHelpArticles } from './help-articles';
import { signInAs } from './session';
import { DESKTOP_WIDTH, PHONE_WIDTH } from './breakpoints';

// WCAG 2.5.8 on the controls the audit measured under 24 by 24 CSS pixels: the help search's magnifier, which sits
// inside its box so no spacing exempts it, and the date range field's quick picks at phone width. The grimoire card's
// "Edited" line is measured by card-click.spec.ts.

const MIN = 24;

async function boxOf(
  control: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  if (!box) throw new Error('the control has no box');
  return box;
}

async function expectAtLeast24(control: Locator, label: string): Promise<void> {
  const box = await boxOf(control);
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(MIN);
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(MIN);
}

/** Where typed text starts in the box, from the start edge: its border and inline-start padding. */
const textStartOf = (input: Locator): Promise<number> =>
  input.evaluate((element) => {
    const style = getComputedStyle(element);
    const { left } = element.getBoundingClientRect();
    return left + parseFloat(style.borderInlineStartWidth) + parseFloat(style.paddingInlineStart);
  });

async function expectSearchTarget(page: Page, where: string): Promise<void> {
  const search = page.getByRole('main').getByRole('search');
  const submit = search.getByRole('button', { name: 'Search', exact: true });
  await expectAtLeast24(submit, `${where} Search`);
  // The box keeps its text clear of the magnifier, so a press on the button never lands on typed words.
  const box = await boxOf(submit);
  expect(
    await textStartOf(search.getByRole('searchbox')),
    `${where} text start`,
  ).toBeGreaterThanOrEqual(box.x + box.width);
}

test.beforeAll(async () => {
  await recreateE2eDatabase();
  await seedHelpArticles('author@target-size.test');
});

for (const [size, width] of [
  ['desktop', DESKTOP_WIDTH],
  ['phone', PHONE_WIDTH],
] as const) {
  test(`the help search's magnifier is at least 24 by 24 and clear of the typed text, signed out and on the staff help, at ${size} width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });

    for (const path of ['/help', '/help/glossary', '/help/search?q=testwort']) {
      await page.goto(path);
      await expectSearchTarget(page, path);
    }

    await signInAs(page, `curator-${size}@target-size.test`, ['discord'], 'curator');
    await page.goto('/help/staff');
    await expectSearchTarget(page, '/help/staff');
  });
}

test('on a phone, the date range quick picks are at least 24 tall, with a gap between each and the next', async ({
  page,
}) => {
  await page.setViewportSize({ width: PHONE_WIDTH, height: 844 });
  await signInAs(page, 'keeper-picks@target-size.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await drawer.getByRole('button', { name: /^Minted/ }).click();
  const minted = page.getByRole('dialog', { name: 'Choose Minted Days' });
  await expect(minted).toBeVisible();

  const names = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month'];
  const boxes = [];
  for (const name of names) {
    const box = await boxOf(minted.getByRole('button', { name, exact: true }));
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(MIN);
    boxes.push({ name, ...box });
  }
  // Neighbours do not touch: each pick ends before the next begins, across or down.
  for (const [at, box] of boxes.slice(1).entries()) {
    const before = boxes[at]!;
    const apart = box.x >= before.x + before.width + 1 || box.y >= before.y + before.height + 1;
    expect(apart, `${before.name} and ${box.name} stand apart`).toBe(true);
  }
});

test('on a phone, the help search results and the filters panel Clear All link are at least 24 tall', async ({
  page,
}) => {
  await page.setViewportSize({ width: PHONE_WIDTH, height: 844 });
  await page.goto('/help/search?q=testwort');
  const results = page.getByRole('main').getByRole('list').first().getByRole('link');
  await expect(results.first()).toBeVisible();
  for (const [at, link] of (await results.all()).entries()) {
    await expectAtLeast24(link, `help result ${at + 1}`);
  }

  await signInAs(page, 'keeper-clear@target-size.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expectAtLeast24(drawer.getByRole('link', { name: 'Clear All' }), 'Clear All');
});
