import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// A step's Quantity takes digits and one point, tidies to the plain number on blur, reads a comma as a thousands
// separator, and refuses
// any unreadable amount on Save, in a real browser (focus and blur are the point).
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a step quantity tidies to a plain number on blur, a comma is dropped, and letters are refused on Save', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Quantity', 'quantity-input.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Spell' });
  await dialog.waitFor();
  await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Rosemary (Herb)');
  await page
    .getByRole('option', { name: 'Rosemary (Herb)' })
    .filter({ hasNotText: 'as a one-off ingredient' })
    .first()
    .click();
  const quantity = page.getByRole('dialog').getByRole('textbox', { name: /^Quantity/ });

  await quantity.fill(' 2.50 ');
  await quantity.blur();
  await expect(quantity).toHaveValue('2.5');

  await quantity.fill('1000');
  await quantity.blur();
  await expect(quantity).toHaveValue('1,000');

  // Saved as 1000 and shown again with the separator once the saved spell is reopened.
  await expect(page.getByRole('status').filter({ hasText: /Draft saved/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Jar', exact: true }).click();
  await page.getByRole('button', { name: /^Edit Rosemary/ }).click();
  await expect(quantity).toHaveValue('1,000');

  await quantity.fill('abc');
  await page.getByRole('dialog').getByRole('button', { name: /^Save/ }).click();
  await expect(page.getByText('Has an error to fix').first()).toBeVisible();
  await page.getByRole('button', { name: /^Edit Rosemary/ }).click();
  await expect(quantity).toHaveAccessibleDescription(/Enter an amount as a number, like 2.5/);
});
