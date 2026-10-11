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
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}
