import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';

// An owner pauses a member's access to one coven from the member's modal on the members page, the member opening the
// coven lands on the coven's paused page, and once the owner lifts the pause the member opens the coven again
// (claude-docs/components/member-detail.md, "Coven Access").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an owner pauses a member’s access to the coven, the member sees the paused page, and once lifted opens it again', async ({
  page,
  browser,
}) => {
  const member = await browser.newContext();
  const memberPage = await member.newPage();
  // The member's page ends signed in as the member; the owner's is signed in again below.
  const coven = await seedCoven(memberPage, 'Fixture Paused Coven', 'coven-pause.test', {
    Owner: 'owner',
    Member: 'member',
  });
  await signInAgainAs(page, coven.users.Owner!);
  const home = `/coven/${coven.slug}`;

  // Before the pause, the member opens the coven.
  await memberPage.goto(home);
  await expect(memberPage).toHaveURL(home);

  // The owner pauses the member for a week from the member's modal, asked before it is sent.
  await page.goto(`${home}/members`);
  const table = page.getByRole('table', { name: 'Members' });
  // An owner's access is never paused: the owner's modal has no Coven Access section.
  await table.getByRole('link', { name: 'Fixture Owner', exact: true }).click();
  const ownerModal = page.getByRole('dialog', { name: 'Fixture Owner' });
  await expect(ownerModal.getByRole('region', { name: 'Membership' })).toBeVisible();
  await expect(ownerModal.getByRole('region', { name: 'Coven Access' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(ownerModal).toHaveCount(0);

  await table.getByRole('link', { name: 'Fixture Member', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Fixture Member' });
  const access = modal.getByRole('region', { name: 'Coven Access' });
  await access.getByRole('button', { name: 'Coven Access' }).click();
  await access.getByRole('combobox', { name: 'For' }).selectOption({ label: '1 Week' });
  await access.getByRole('textbox', { name: 'Note' }).fill('Cooling off');
  await access.getByRole('button', { name: 'Pause Access' }).click();
  // The question asks over the modal's body, its answers in the modal.
  await expect(modal.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await modal.getByRole('button', { name: 'Pause', exact: true }).click();

  // The modal now shows the pause, with its note, and offers its lifting instead; the row behind marks it.
  await expect(access.getByRole('button', { name: 'Lift Pause' })).toBeVisible();
  await expect(access).toContainText('Cooling off');
  await expect(
    table.getByRole('row').filter({ hasText: 'Fixture Member' }).getByText('Paused'),
  ).toBeVisible();
  const [standing] = await withSql(
    (sql) => sql<{ dated: boolean; note: string | null }[]>`
      select until > now() + interval '6 days' as dated, note from workspace_member_pauses
      where workspace_id = ${coven.id} and user_id = ${coven.users.Member!} and lifted_at is null`,
  );
  expect(standing).toEqual({ dated: true, note: 'Cooling off' });

  // The member opening any page of the coven lands on its paused page, which says until when.
  await memberPage.goto(`${home}/grimoire`);
  await expect(memberPage).toHaveURL(`/coven-paused/${coven.slug}`);
  await expect(memberPage.getByRole('heading', { name: 'Access Paused', level: 1 })).toBeVisible();
  await expect(memberPage.getByRole('main')).toContainText(
    'Your access to Fixture Paused Coven is paused until',
  );
  await assertNoAccessibilityViolations(memberPage);

  // The owner lifts it; the modal offers Pause Access again, and lists the lifted pause.
  await access.getByRole('button', { name: 'Lift Pause' }).click();
  await modal.getByRole('button', { name: 'Lift', exact: true }).click();
  await expect(access.getByRole('button', { name: 'Pause Access' })).toBeVisible();
  await expect(
    access.getByRole('list', { name: 'Earlier Pauses' }).getByRole('listitem'),
  ).toHaveCount(1);

  // The member's access is restored: the coven opens, and its paused page sends them back to it.
  await memberPage.goto(home);
  await expect(memberPage).toHaveURL(home);
  await memberPage.goto(`/coven-paused/${coven.slug}`);
  await expect(memberPage).toHaveURL(home);

  await member.close();
});
