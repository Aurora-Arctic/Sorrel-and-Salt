import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoSidewaysScroll } from './axe';
import { seedWorld, signIn, visit } from './axe-sweep';
import { DESKTOP_WIDTH, PURPOSE_WIDTHS } from './breakpoints';
import { recreateE2eDatabase } from './database';

// The header at the WCAG reflow width and at a 200% root font (claude-docs/audits/accessibility.md, AX-1): its end
// block wraps rather than pushing the page wider than the window, and the section nav's More follows the text size.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const CONTROLS = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

async function largeRootFont(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        document.documentElement.style.fontSize = '200%';
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
}

/** Every control the header shows lies inside the window, answers a pointer at its centre, and is reached by Tab. */
async function expectHeaderControlsReachable(page: Page) {
  const banner = page.getByRole('banner');
  const shown = banner.locator(CONTROLS).locator('visible=true');
  const count = await shown.count();
  // Precondition: the header shows controls, so an empty check could not pass.
  expect(count).toBeGreaterThan(0);

  const width = page.viewportSize()!.width;
  for (let at = 0; at < count; at++) {
    const control = shown.nth(at);
    await control.evaluate((element, mark) => element.setAttribute('data-reach', mark), `${at}`);
    const box = (await control.boundingBox())!;
    expect(box.x, `control ${at} starts off screen`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `control ${at} ends off screen`).toBeLessThanOrEqual(width + 0.5);
    const hit = await control.evaluate((element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      const under = document.elementFromPoint(left + width / 2, top + height / 2);
      return Boolean(under && (element === under || element.contains(under)));
    });
    expect(hit, `control ${at} is covered at its centre`).toBe(true);
  }

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const reached = new Set<string>();
  // Enough presses to pass every header control; the header comes first in the page's order.
  for (let press = 0; press < count * 2 + 10 && reached.size < count; press++) {
    await page.keyboard.press('Tab');
    const mark = await page.evaluate(
      () => document.activeElement?.closest('[data-reach]')?.getAttribute('data-reach') ?? null,
    );
    if (mark !== null) reached.add(mark);
  }
  expect([...reached].sort(), 'header controls Tab did not reach').toEqual(
    Array.from({ length: count }, (_, at) => `${at}`).sort(),
  );
}

async function signedInCovenPage(page: Page) {
  const world = await seedWorld(page);
  await signIn(page, world, 'steward');
  return `/coven/${world.coven.slug}`;
}

for (const [kind, open] of [
  ['a signed-in coven page', signedInCovenPage],
  ['the public compendium', async () => '/compendium'],
] as const) {
  test.describe(kind, () => {
    // Regression: at 320px the header's end block pushed the page wider than the window.
    test('fits a 320px window with every header control on screen', async ({ page }) => {
      const path = await open(page);
      await page.setViewportSize({ width: PURPOSE_WIDTHS.reflow, height: 812 });
      await visit(page, path);

      await assertNoSidewaysScroll(page, { width: PURPOSE_WIDTHS.reflow });
      await expectHeaderControlsReachable(page);
    });

    // Regression: at a 200% root font the header and the section nav pushed the page sideways.
    test('fits a 1280px window at a 200% root font with every header control on screen', async ({
      page,
    }) => {
      const path = await open(page);
      await page.setViewportSize({ width: DESKTOP_WIDTH, height: 812 });
      await visit(page, path);
      await largeRootFont(page);

      await assertNoSidewaysScroll(page, { width: DESKTOP_WIDTH });
      await expectHeaderControlsReachable(page);
    });
  });
}

// Regression: More was chosen by the window width alone, so at large text the tabs ran past the window.
test('the section nav puts its later tabs behind More as the root font grows', async ({ page }) => {
  const path = await signedInCovenPage(page);
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 812 });
  await visit(page, path);
  const nav = page.getByRole('navigation', { name: 'Coven' });
  const more = nav.getByRole('button', { name: 'More', exact: true });
  // Precondition: at the default text size every tab fits, so More is not drawn.
  await expect(nav.getByRole('link').first()).toBeVisible();
  await expect(more).toHaveCount(0);

  await largeRootFont(page);

  await expect(more).toBeVisible();
  await assertNoSidewaysScroll(page, { width: DESKTOP_WIDTH });
});
