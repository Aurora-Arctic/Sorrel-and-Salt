import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';

// The spell builder's Visibility control (M10.13), which no numbered story
// walks: DESIGN.md §5 governs visibility by its one-way rule rather than a
// story. A member writes a spell private, then shares it with the coven in
// one confirmed action, and the control shuts with its reason. What was
// stored is read from the database. Story 56 walks the Private badge, and the
// service's refusal of a narrowing is tests/modules/grimoire/services's (M10.6).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member writes a spell private, then shares it with the coven for good', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Visibility', 'spell-visibility.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire?new=spell-${coven.slug}`);

  // A switch (the owner's call, 2026-10-27): on is the coven, off is private.
  const visibility = page.getByRole('switch', { name: 'Share With the Coven', exact: true });
  const save = page.getByRole('button', { name: 'Save Spell' });
  await expect(visibility).toBeChecked();

  await visibility.uncheck();
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
  // Still private, and still free to be shared.
  await expect(visibility).not.toBeChecked();
  await expect(visibility).toBeEnabled();

  await visibility.click();
  const question = page.getByRole('group', { name: /Share With the Coven/ });
  await expect(question).toBeVisible();
  await question.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(question).toBeHidden();

  await expect(visibility).toBeChecked();
  await expect(visibility).toBeDisabled();
  await expect(visibility).toHaveAccessibleDescription(/cannot be made private again/);
  await expect(visibility).toHaveAccessibleDescription(/Duplicate/);
  expect(await stored()).toEqual([{ visibility: 'workspace' }]);
});
