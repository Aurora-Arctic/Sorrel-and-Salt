import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Settles first: a spec that switches the theme and scans straight after would
// otherwise read a colour part-way along its ease (the account disc, MB.7).
export async function assertNoAccessibilityViolations(page: Page) {
  await settleTransitions(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
  expect(violations, summary).toEqual([]);
}

// A page holds at a phone's width when nothing pushes it sideways: the
// document is no wider than the window. Measured in the real browser, since
// jsdom lays nothing out; 375px is the narrowest width a section signs off at
// (claude-docs/styling.md, "Designing a section"). With `restore`, the
// window goes back to its width afterwards, for a walk that goes on past the
// measurement at the width it had.
export async function assertNoSidewaysScroll(page: Page, { restore = false } = {}) {
  const size = restore ? page.viewportSize() : null;
  await page.setViewportSize({ width: 375, height: 812 });
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
