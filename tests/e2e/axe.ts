import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function assertNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
  expect(violations, summary).toEqual([]);
}
