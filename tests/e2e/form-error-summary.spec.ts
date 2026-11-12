import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { hydrated } from './waits';
import { DESKTOP_WIDTH } from './breakpoints';

// (claude-docs/components/field.md, "Announcing errors")
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a failed Save puts focus on the error summary, which links to the field and prefixes the page title', async ({
  page,
}) => {
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 });
  await signInAs(page, 'a-keeper@error-summary.test', ['discord'], 'admin');
  await page.goto('/curator/compendium?new=ingredient-compendium');
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(adding).toBeVisible();
  // Hydrated first, or the press lands on server HTML that no form owns.
  await hydrated(page, 'dialog form, [role="dialog"] form');

  // Save stays shut until something is typed; a Description alone leaves the required Name empty.
  await adding.getByRole('textbox', { name: 'Description' }).fill('A fixture description.');
  const before = await page.title();
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();

  const summary = adding.getByRole('group', { name: /problem/i });
  await expect(summary).toBeFocused();
  await expect(page).toHaveTitle(`Error: ${before}`);

  const link = summary.getByRole('link').first();
  const target = await link.getAttribute('href');
  await link.click();
  await expect(adding.locator(target!)).toBeFocused();
  // Sweep gap: the Add form after a failed Save, with the error summary shown and focused.
  await assertNoAccessibilityViolations(page);
});
