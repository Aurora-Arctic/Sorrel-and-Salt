import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Where the focus goes as a dialog opened by the page's address closes,
// for the two closes no story walks (claude-docs/components/modal.md, "Giving
// the focus back"). Back leaves the address the press wrote, and the focus
// goes back to the link pressed; a pasted address has no opener, and the focus
// goes to the page's heading rather than being lost to the page. The standard
// seed's Protection category is the entry both open.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const EDIT = { name: 'Edit Category, Protection', exact: true } as const;

test('a dialog opened by a press and closed by Back gives the focus back to its link', async ({
  page,
}) => {
  await signInAs(page, 'back@route-modal-focus.test', ['discord'], 'admin');
  await page.goto('/admin/categories?query=Protection');
  const link = page.getByRole('link', { name: 'Edit Protection', exact: true });

  await link.click();
  const dialog = page.getByRole('dialog', EDIT);
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await expect(page).toHaveURL(/\?query=Protection&edit=protection$|\?edit=protection/);

  await page.goBack();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/categories\?query=Protection$/);
  await expect(link).toBeFocused();
});

test("a dialog reached by a pasted address gives the focus to the page's heading as it closes", async ({
  page,
}) => {
  await signInAs(page, 'pasted@route-modal-focus.test', ['discord'], 'admin');
  await page.goto('/admin/categories?edit=protection');
  const dialog = page.getByRole('dialog', EDIT);
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();

  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await expect(dialog).toHaveCount(0);
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeFocused();
  // Focusable by script alone, so Tab never stops on it.
  await expect(heading).toHaveAttribute('tabindex', '-1');
});
