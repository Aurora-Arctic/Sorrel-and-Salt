import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { seedCoven } from './stories/coven-ingredients';
import { signInAgainAs, signInAs } from './session';
import { SITE_ROLE_ACCESS } from '@/components/UserList/roles';
import { WORKSPACE_ROLE_ACCESS } from '@/components/MemberList/role-access';

// Each Role column carries a tip per row saying what the role may do, in the words Change Role shows:
// the site roles on the admin's People page, the coven roles on a coven's members page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an admin opens a role tip on the People page and reads what the role may do', async ({
  page,
}) => {
  await signInAs(page, 'admin@role-tooltips.test', ['discord'], 'admin');
  await page.goto('/admin/users?query=role-tooltips.test');

  const row = page.getByRole('row', { name: /admin@role-tooltips\.test/ });
  const button = row.getByRole('button', { name: 'About Admin' });
  await button.focus();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(SITE_ROLE_ACCESS.admin);

  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
});

test('an owner opens a role tip on the members page and reads what the role may do', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Role Tooltips Coven', 'role-tooltips-coven.test', {
    Owner: 'owner',
    Viewer: 'viewer',
  });
  await signInAgainAs(page, coven.users.Owner!);
  await page.goto(`/coven/${coven.slug}/members`);

  const row = page.getByRole('row', { name: /Fixture Viewer/ });
  const button = row.getByRole('button', { name: 'About Viewer' });
  await button.focus();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(WORKSPACE_ROLE_ACCESS.viewer);

  await assertNoAccessibilityViolations(page);
});
