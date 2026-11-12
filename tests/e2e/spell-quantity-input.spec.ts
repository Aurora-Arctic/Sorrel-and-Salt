import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { holdServerAnswers } from './hold-server-answers';
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

  // The first save has landed; the next one is held, as a slow server holds it.
  const status = page.getByRole('status').filter({ hasText: /Draft saved/ });
  await expect(status).toBeVisible();
  const answers = await holdServerAnswers(page, { prefetch: 'pass', alsoGraphql: true });
  answers.hold();
  const saved = page.waitForResponse(
    (response) =>
      response.request().postDataJSON()?.operationName === 'UpdateSpell' &&
      JSON.stringify(response.request().postDataJSON().variables).includes('1000'),
  );
  await quantity.fill('1000');
  await quantity.blur();
  await expect(quantity).toHaveValue('1,000');
  await expect.poll(answers.held, 'the save of 1000 is on its way').toBeGreaterThan(0);

  // Saved as 1000 and shown again with the separator once the saved spell is reopened. The status
  // still announces the first save, so it says nothing about this one: the test waits for the save's own answer.
  await answers.release();
  await saved;
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

test('a step Quantity and Unit stand at the same height, with and without an error under one', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Align', 'quantity-align.test', {
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
  const unit = dialog.getByRole('combobox', { name: /^Unit/ });
  const top = async (control: typeof quantity) => (await control.boundingBox())!.y;

  expect(await top(quantity), 'the boxes line up at rest').toBeCloseTo(await top(unit), 0);

  // An error under Quantity must not move either box.
  await quantity.fill('abc');
  await quantity.blur();
  await expect(quantity).toHaveAccessibleDescription(/Enter an amount as a number/);
  expect(await top(quantity), 'the boxes line up with an error').toBeCloseTo(await top(unit), 0);
});
