import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import { DESKTOP_WIDTH, PHONE_WIDTH } from './breakpoints';

// A step's Move Down answers a mouse click, not only a key: the grip's grown hit area beside it must not lie over it.
// Only a real layout shows what a pointer lands on.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const width of [DESKTOP_WIDTH, PHONE_WIDTH]) {
  test(`a mouse click on a step's Move Down moves the step, at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const coven = await seedCoven(page, `Fixture Coven Move ${width}`, `move-${width}.test`, {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await page.getByRole('link', { name: 'New Spell' }).click();
    await page.getByRole('dialog', { name: 'New Spell' }).waitFor();
    const steps = page.getByRole('list', { name: 'Steps' }).getByRole('listitem');

    for (const name of ['Testwort', 'Testroot']) {
      await page.getByRole('combobox', { name: 'Add to Jar' }).fill(name);
      await page.getByRole('option', { name: `Add "${name}" as a one-off ingredient` }).click();
    }
    // Precondition: Testwort is first, and its Move Down is available.
    await expect(steps).toHaveCount(2);
    await expect(steps.first()).toContainText('Testwort');
    await page.getByRole('button', { name: 'Reorder Steps' }).click();
    const down = page.getByRole('button', { name: 'Move Down Testwort', exact: true });
    await expect(down).not.toHaveAttribute('aria-disabled', 'true');

    // No `force`: the click lands where the pointer is, so a control drawn over the button takes it instead.
    await down.click({ timeout: 5000 });
    await expect(steps.first()).toContainText('Testroot');
    await expect(steps.nth(1)).toContainText('Testwort');
  });
}
