import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// A step's Quantity takes a comma or a point and tidies to a point on blur, and an unreadable amount
// is refused on Save with the error summary, in a real browser (focus and blur are the point).
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a step quantity tidies a comma on blur, and a bad amount is refused on Save', async ({
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
  const quantity = dialog.getByRole('textbox', { name: /^Quantity/ });

  await quantity.fill('2,5');
  await quantity.blur();
  await expect(quantity).toHaveValue('2.5');

  await quantity.fill('lots');
  await dialog.getByRole('button', { name: /^Save/ }).click();
  await expect(page.getByText('Has an error to fix').first()).toBeVisible();
  await page.getByRole('button', { name: /^Edit Rosemary/ }).click();
  await expect(page.getByRole('textbox', { name: /^Quantity/ })).toHaveAccessibleDescription(
    /Enter an amount as a number, like 2.5/,
  );
});
