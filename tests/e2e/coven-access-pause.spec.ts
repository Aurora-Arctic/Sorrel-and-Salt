import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';

// An owner pauses a member's access to one coven from the members page, the member opening the coven lands on the
// coven's paused page, and once the owner lifts the pause the member opens the coven again
// (claude-docs/components/member-list.md, "Pausing access").

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

  // The owner pauses the member for a week, asked before it is sent.
  await page.goto(`${home}/members`);
  await expect(
    page.getByRole('button', { name: 'Pause Access for Fixture Owner' }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Pause Access for Fixture Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pause Access for Fixture Member?' });
  await dialog.getByRole('combobox', { name: 'For' }).selectOption({ label: '1 Week' });
  await dialog.getByRole('textbox', { name: 'Note' }).fill('Cooling off');
  await expect(dialog.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Pause', exact: true }).click();

  // The row now shows the pause, and offers its lifting instead.
  await expect(page.getByRole('button', { name: 'Lift Pause for Fixture Member' })).toBeVisible();
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

  // The owner lifts it; the row offers Pause Access again, and the dialog lists the lifted pause.
  await page.getByRole('button', { name: 'Lift Pause for Fixture Member' }).click();
  await page
    .getByRole('dialog', { name: 'Lift the Pause for Fixture Member?' })
    .getByRole('button', { name: 'Lift', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pause Access for Fixture Member' }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Pause Access for Fixture Member?' })
      .getByRole('list', { name: 'Earlier Pauses' })
      .getByRole('listitem'),
  ).toHaveCount(1);

  // The member's access is restored: the coven opens, and its paused page sends them back to it.
  await memberPage.goto(home);
  await expect(memberPage).toHaveURL(home);
  await memberPage.goto(`/coven-paused/${coven.slug}`);
  await expect(memberPage).toHaveURL(home);

  await member.close();
});
