import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Settles first: a spec that switches the theme and scans straight after would
// otherwise read a colour part-way along its ease (the account disc, MB.7).
// The title is waited for too: a soft navigation (a filter, a router refresh)
// swaps the metadata, and for a few milliseconds on a quiet machine, hundreds
// under load, the document has no <title> while the new rows are already in,
// so axe's document-title rule fails a page that is about to have one (MB.265).
// `skipRules` is for the component workshop, whose story page is one component
// and not a whole page: it has no level-one heading unless the story draws one.
export async function assertNoAccessibilityViolations(
  page: Page,
  { skipRules = [] }: { skipRules?: string[] } = {},
) {
  await expect(page).toHaveTitle(/\S/);
  await settleTransitions(page);
  const scan = async () =>
    (await new AxeBuilder({ page }).disableRules(skipRules).analyze()).violations;
  let violations = await scan();
  // The metadata swap can also land between the wait above and the scan's read (story 24): a
  // missing title is scanned again once, after waiting for one. A page that never has a title
  // still fails, at the wait.
  if (violations.some((v) => v.id === 'document-title')) {
    await expect(page).toHaveTitle(/\S/);
    violations = await scan();
  }
  const summary = violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
  expect(violations, summary).toEqual([]);
}

// A page holds at a phone's width when nothing pushes it sideways: the
// document is no wider than the window. Measured in the real browser, since
// happy-dom lays nothing out; 375px is the narrowest width a section signs off at
// (claude-docs/styling.md, "Designing a section"). With `restore`, the
// window goes back to its width afterwards, for a walk that goes on past the
// measurement at the width it had.
export async function assertNoSidewaysScroll(page: Page, { restore = false } = {}) {
  const size = restore ? page.viewportSize() : null;
  await page.setViewportSize({ width: 375, height: 812 });
  // Two frames for what follows the window by itself: a callout or badge placed
  // by Floating UI moves on the resize event and a frame, not in the same task
  // (M12.31), so a measurement at once read it where it stood at the old width.
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
  const { scrollWidth, clientWidth, wide } = await page.evaluate(() => {
    const root = document.documentElement;
    // What reaches past the window, named, so a failure says which element
    // rather than only by how much.
    const past = (element: Element) =>
      element.getBoundingClientRect().right > root.clientWidth + 0.5;
    // Outermost offenders only: a wide element's children are wide with it.
    const wide = [...document.querySelectorAll('body *')]
      .filter((element) => past(element) && !(element.parentElement && past(element.parentElement)))
      .slice(0, 8)
      .map((element) => {
        const { right, width } = element.getBoundingClientRect();
        const name = [element.tagName.toLowerCase(), ...element.classList].join('.');
        return `${name} (right ${Math.round(right)}, width ${Math.round(width)})`;
      });
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, wide };
  });
  expect(
    scrollWidth,
    `wider than the window: ${wide.join('; ') || 'nothing named'}`,
  ).toBeLessThanOrEqual(clientWidth);
  if (size) await page.setViewportSize(size);
}

// Every colour eases over the theme's 400ms; a scan straight after a theme
// change would read a colour part-way along, so each running transition is
// let finish first. A transition that is cancelled has stopped easing, which
// is as settled as one that finished, but its `finished` promise rejects with
// an AbortError (WebKit cancels one a later style change replaces), so the
// rejection is read as done. Replaced transitions are waited for in turn.
export async function settleTransitions(page: Page) {
  await page.evaluate(async () => {
    // Transitions only: a scroll-driven animation (the sorrel's) never finishes.
    const running = () => document.getAnimations().filter((each) => each instanceof CSSTransition);
    while (running().length > 0) {
      await Promise.all(running().map((each) => each.finished.catch(() => undefined)));
    }
  });
}
