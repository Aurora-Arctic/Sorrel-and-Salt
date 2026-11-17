import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import { seedCoven } from './coven-ingredients';

// @story-96: a Steward renames the coven on its page, the coven loads at its new address, and its
// old address takes a member there.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('Story 96: A Steward Renames the Coven', { tag: '@story-96' }, () => {
  test('a Steward renames the coven, and the old address redirects to the new one', async ({
    page,
  }) => {
    const coven = await seedCoven(page, 'Fixture Story Before', 'story-96.test', { A: 'owner' });
    const old = coven.slug;
    await signInAgainAs(page, coven.users.A);

    await test.step('the Steward opens the coven page and changes its name', async () => {
      await page.goto(`/coven/${old}`);
      const name = page.getByRole('textbox', { name: 'Name' });
      await expect(name).toHaveValue('Fixture Story Before');
      await name.fill('Fixture Story After');
      await page.getByRole('button', { name: /^Save/ }).click();
    });

    await test.step('the coven loads at its new address', async () => {
      await expect(page).toHaveURL(/\/coven\/fixture-story-after$/);
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Fixture Story After');
    });

    await test.step('the old address takes the Steward to the new one', async () => {
      await page.goto(`/coven/${old}/ingredients`);
      await expect(page).toHaveURL(/\/coven\/fixture-story-after\/ingredients$/);
    });
  });
});
