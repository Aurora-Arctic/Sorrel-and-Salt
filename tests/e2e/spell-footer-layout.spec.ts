import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import { VISIBILITY_LABELS } from '@/components/GrimoireList/params';

// The spell builder's footer: the Shared switch on its own line above the buttons, and Delete Spell in
// the same row as Save Spell and Mark Complete. Layout, so it is read from bounding boxes.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the Shared switch stands above the footer buttons and Delete Spell shares the Save Spell row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const coven = await seedCoven(page, 'Fixture Coven Footer', 'spell-footer-layout.test', {
    A: 'owner',
  });
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/coven/${coven.slug}/grimoire?new=spell-${coven.slug}`);

  const save = page.getByRole('button', { name: 'Save Spell' });
  await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Footer Working');
  await save.click();
  await expect(save).toBeDisabled();

  const box = async (locator: ReturnType<typeof page.locator>) => {
    const found = await locator.boundingBox();
    expect(found).not.toBeNull();
    return found!;
  };
  const del = await box(page.getByRole('button', { name: /^Delete Spell/ }));
  const saveBox = await box(save);
  const complete = await box(page.getByRole('button', { name: 'Mark Complete' }));
  const shared = await box(
    page.getByRole('switch', { name: VISIBILITY_LABELS.workspace, exact: true }),
  );

  // Delete and Mark Complete sit in Save's vertical band.
  for (const other of [del, complete]) {
    expect(Math.abs(other.y + other.height / 2 - (saveBox.y + saveBox.height / 2))).toBeLessThan(
      saveBox.height / 2,
    );
  }
  // The switch ends above where the buttons begin.
  expect(shared.y + shared.height).toBeLessThanOrEqual(saveBox.y);
  // Delete is no longer pushed to the row's far end: it follows Mark Complete.
  expect(del.x).toBeGreaterThan(complete.x);
  expect(del.x - (complete.x + complete.width)).toBeLessThan(100);
});
