import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function assertNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
  expect(violations, summary).toEqual([]);
}

// A page holds at a phone's width when nothing pushes it sideways: the
// document is no wider than the window. Measured in the real browser, since
// jsdom lays nothing out; 375px is the narrowest width a section signs off at
// (claude-docs/styling.md, "Designing a section").
export async function assertNoSidewaysScroll(page: Page) {
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
}
