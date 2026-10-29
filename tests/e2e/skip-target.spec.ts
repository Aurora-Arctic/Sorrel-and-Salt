import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Where the keyboard goes after a click, and where the skip link sends it, in both page frames (the signed-in
// AppShell and the signed-out PublicFrame, each on /compendium). The skip target is an empty `span#main`,
// focusable by script only: a `tabindex="-1"` wrapper once took the focus on a click on plain text, so the
// next Tab went back to the page's first control.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Probe = { tabbableBefore: number; tabbableAfter: number; x: number; y: number } | null;

/**
 * Picks plain text with a control before and after it, scrolls it to the window's middle and keeps the
 * text and both controls on `window` for the assertions. Returns the point to click, or null.
 */
async function probe(page: Page): Promise<Probe> {
  return page.evaluate((selector) => {
    const main = document.querySelector('main');
    if (!main) return null;
    const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
    const tabbable = [...main.querySelectorAll(selector)].filter(visible);
    const texts = [...main.querySelectorAll('p, h2, h3, dt, dd')].filter(
      (el) =>
        visible(el) &&
        (el.textContent ?? '').trim().length > 0 &&
        !el.closest(selector) &&
        !el.querySelector(selector),
    );
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const target = texts.find(
      (text) =>
        tabbable.some((control) => follows(control, text)) &&
        tabbable.some((control) => follows(text, control)),
    );
    if (!target) return null;
    const next = tabbable.find((control) => follows(target, control))!;
    target.scrollIntoView({ block: 'center' });
    const box = target.getBoundingClientRect();
    // The first text node's left edge, so the click lands on the text itself.
    const x = box.left + Math.min(4, box.width / 2);
    const y = box.top + box.height / 2;
    // Nothing focusable sits over the point clicked, or the click would focus it.
    const hit = document.elementFromPoint(x, y);
    if (!hit || !target.contains(hit) || hit.closest(selector)) return null;
    Object.assign(window, { __probe: { first: tabbable[0], next } });
    return {
      tabbableBefore: tabbable.filter((control) => follows(control, target)).length,
      tabbableAfter: tabbable.filter((control) => follows(target, control)).length,
      x,
      y,
    };
  }, TABBABLE);
}

const isFocused = (page: Page, which: 'first' | 'next') =>
  page.evaluate(
    (key) =>
      (window as unknown as { __probe: Record<string, Element> }).__probe[key] ===
      document.activeElement,
    which,
  );

/** The first control after `#main` in document order: where Tab goes from it. */
const firstAfterSkipTarget = (page: Page) =>
  page.evaluate((selector) => {
    const target = document.getElementById('main')!;
    const control = [...document.querySelectorAll(selector)].find(
      (el) =>
        (el as HTMLElement).offsetParent !== null &&
        Boolean(target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    return control === undefined ? null : control.outerHTML.slice(0, 200);
  }, TABBABLE);

const activeOuterHtml = (page: Page) =>
  page.evaluate(() => document.activeElement?.outerHTML.slice(0, 200) ?? null);

async function clickThenTab(page: Page): Promise<void> {
  const point = await probe(page);
  // Why the old behaviour would fail here: there is a control before the
  // click point, where a Tab from a focused wrapper would land, and one after.
  expect(point).not.toBeNull();
  expect(point!.tabbableBefore).toBeGreaterThan(0);
  expect(point!.tabbableAfter).toBeGreaterThan(0);
  expect(await isFocused(page, 'first')).toBe(false);

  await page.mouse.click(point!.x, point!.y);
  await page.keyboard.press('Tab');

  // The old wrapper sent this Tab back to the page's first control.
  expect(await isFocused(page, 'first')).toBe(false);
  expect(await isFocused(page, 'next')).toBe(true);
}

async function skipThenTab(page: Page): Promise<void> {
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to Content' });
  await expect(skip).toBeFocused();
  const expected = await firstAfterSkipTarget(page);
  expect(expected).not.toBeNull();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await activeOuterHtml(page)).toBe(expected);
}

// The skip link runs first and the click second on one page load: the skip
// leaves focus on the page's first control, so that is blurred before the
// click, which sets where the next Tab starts from on its own.
async function skipThenClick(page: Page): Promise<void> {
  await skipThenTab(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await clickThenTab(page);
}

test('signed out, in the public frame: the skip link reaches the page, and a Tab after a click on plain text goes on from the click', async ({
  page,
}) => {
  await page.goto('/compendium');
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  await skipThenClick(page);
});

test('signed in, in the application shell: the skip link reaches the page, and a Tab after a click on plain text goes on from the click', async ({
  page,
}) => {
  await signInAs(page, 'skip@skip-target.test');
  await page.goto('/compendium');
  await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  await skipThenClick(page);
});
