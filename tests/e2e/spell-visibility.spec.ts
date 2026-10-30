import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';

// The spell builder's Visibility control (DESIGN.md §5): a draft is shared and made private again freely,
// and once the spell is marked complete the control shuts with its reason. What was stored is read from the
// database; the service's refusal is tests/modules/grimoire/services's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a new spell starts private, a draft moves between private and shared freely, and completing it shares it for good', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Visibility', 'spell-visibility.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire?new=spell-${coven.slug}`);

  // A switch: on is the coven, off is private; a new spell starts off.
  const visibility = page.getByRole('switch', { name: 'Share With the Coven', exact: true });
  const save = page.getByRole('button', { name: 'Save Spell' });
  await expect(visibility).not.toBeChecked();

  await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Hidden Working');
  await save.click();
  await expect(save).toBeDisabled();
  await expect(save).not.toHaveAttribute('aria-busy', 'true');
  const stored = () =>
    withSql(
      (sql) =>
        sql<{ visibility: string }[]>`
          select visibility from spells
          where workspace_id = ${coven.id} and title = 'Fixture Hidden Working'`,
    );
  expect(await stored()).toEqual([{ visibility: 'private' }]);
  // A draft: still private, and free to be shared with no question.
  await expect(visibility).not.toBeChecked();
  await expect(visibility).toBeEnabled();

  await visibility.check();
  await expect(page.getByRole('group', { name: /Share With the Coven/ })).toBeHidden();
  await save.click();
  await expect(save).toBeDisabled();
  expect(await stored()).toEqual([{ visibility: 'workspace' }]);
  // Shared, and still a draft, so it goes private again.
  await expect(visibility).toBeEnabled();
  await visibility.uncheck();
  await save.click();
  await expect(save).toBeDisabled();
  expect(await stored()).toEqual([{ visibility: 'private' }]);

  // Share it, and mark it complete: that save starts the lock.
  await visibility.check();
  await page.getByRole('button', { name: 'Mark Complete' }).click();
  await expect(page.getByRole('button', { name: 'Mark Complete' })).toHaveCount(0);
  await expect(visibility).toBeChecked();
  await expect(visibility).toBeDisabled();
  await expect(visibility).toHaveAccessibleDescription(/cannot be made private again/);
  await expect(visibility).toHaveAccessibleDescription(/Duplicate/);
  expect(await stored()).toEqual([{ visibility: 'workspace' }]);
});
