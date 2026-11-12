import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { seedCoven } from './stories/coven-ingredients';
import { signInAgainAs, signInAs } from './session';
import { SITE_ROLE_ACCESS } from '@/components/UserList/roles';
import { WORKSPACE_ROLE_ACCESS } from '@/components/MemberList/roles';

// Each Role column carries a tip per row saying what the role may do, in the words Change Role shows:
// the site roles on the keeper's People page, the coven roles on a coven's members page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a keeper opens a role tip on the People page and reads what the role may do', async ({
  page,
}) => {
  await signInAs(page, 'admin@role-tooltips.test', ['discord'], 'admin');
  await page.goto('/keepers/users?query=role-tooltips.test');

  const row = page.getByRole('row', { name: /admin@role-tooltips\.test/ });
  const button = row.getByRole('button', { name: 'About Keeper' });
  await button.focus();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(SITE_ROLE_ACCESS.admin);

  // Sweep gap: the page state reached in "a keeper opens a role tip on the People page and reads what the role may do", which no sweep route or modal opens.
  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
});

test('a role tip in a wide People table wraps its text inside its bubble and the window', async ({
  page,
}) => {
  // Wide enough that the table keeps its columns rather than stacking into cards.
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAs(page, 'wrap@role-tooltips.test', ['discord'], 'admin');
  await page.goto('/keepers/users?query=wrap@role-tooltips.test');

  const row = page.getByRole('row', { name: /wrap@role-tooltips\.test/ });
  await row.getByRole('button', { name: 'About Keeper' }).focus();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();

  // The bubble's own box, and the box and line count of the text drawn in it.
  const { window, box, ink, lines } = await tip.evaluate((bubble) => {
    const range = document.createRange();
    range.selectNodeContents(bubble);
    const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
    const text = range.getBoundingClientRect();
    const own = bubble.getBoundingClientRect();
    return {
      window: document.documentElement.clientWidth,
      box: { left: own.left, right: own.right, width: own.width },
      ink: { left: text.left, right: text.right },
      lines: tops.size,
    };
  });

  // Why the check could fail: the bubble is narrower than the window, so a long description has to wrap.
  expect(box.width).toBeLessThan(window / 2);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(window);
  expect(lines).toBeGreaterThan(1);
  expect(ink.right).toBeLessThanOrEqual(box.right);
  expect(ink.left).toBeGreaterThanOrEqual(box.left);
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
  const button = row.getByRole('button', { name: 'About Observer' });
  await button.focus();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(WORKSPACE_ROLE_ACCESS.viewer);

  // Sweep gap: the page state reached in "an owner opens a role tip on the members page and reads what the role may do", which no sweep route or modal opens.
  await assertNoAccessibilityViolations(page);
});
