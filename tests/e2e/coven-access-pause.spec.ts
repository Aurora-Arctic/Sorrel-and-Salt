import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { insertWorkspace } from '../support/db/insert-workspace';

// An owner pauses a member's access to one coven (claude-docs/components/member-detail.md, "Coven Access").

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

  await memberPage.goto(home);
  await expect(memberPage).toHaveURL(home);

  await page.goto(`${home}/members`);
  const table = page.getByRole('table', { name: 'Members' });
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
  await access.getByRole('combobox', { name: 'For' }).click();
  await page.getByRole('option', { name: '1 Week' }).click();
  await access.getByRole('textbox', { name: 'Note' }).fill('Cooling off');
  await access.getByRole('button', { name: 'Pause Access' }).click();
  await expect(modal.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  // Sweep gap: the Pause Access confirmation dialog open over a filled pause form.
  await assertNoAccessibilityViolations(page);
  await modal.getByRole('button', { name: 'Pause', exact: true }).click();

  await expect(access.getByRole('button', { name: 'Lift Pause' })).toBeVisible();
  await expect(access).toContainText('Cooling off');
  await expect(
    table
      .getByRole('row')
      .filter({ hasText: 'Fixture Member' })
      .getByText(/^Paused until /),
  ).toBeAttached();
  const [standing] = await withSql(
    (sql) => sql<{ dated: boolean; note: string | null }[]>`
      select until > now() + interval '6 days' as dated, note from workspace_member_pauses
      where workspace_id = ${coven.id} and user_id = ${coven.users.Member!} and lifted_at is null`,
  );
  expect(standing).toEqual({ dated: true, note: 'Cooling off' });

  await memberPage.goto(`${home}/grimoire`);
  await expect(memberPage).toHaveURL(`/coven-paused/${coven.slug}`);
  await expect(memberPage.getByRole('heading', { name: 'Access Paused', level: 1 })).toBeVisible();
  await expect(memberPage.getByRole('main')).toContainText(
    'Your access to Fixture Paused Coven is paused until',
  );

  await access.getByRole('button', { name: 'Lift Pause' }).click();
  await modal.getByRole('button', { name: 'Lift', exact: true }).click();
  await expect(access.getByRole('button', { name: 'Pause Access' })).toBeVisible();
  await expect(
    access.getByRole('list', { name: 'Earlier Pauses' }).getByRole('listitem'),
  ).toHaveCount(1);

  await memberPage.goto(home);
  await expect(memberPage).toHaveURL(home);
  await memberPage.goto(`/coven-paused/${coven.slug}`);
  await expect(memberPage).toHaveURL(home);

  await member.close();
});

test('a member whose access is paused leaves the coven from its paused page', async ({ page }) => {
  // The page ends signed in as the member.
  const coven = await seedCoven(page, 'Fixture Leaving Coven', 'coven-pause-leave.test', {
    Owner: 'owner',
    Member: 'member',
  });
  const memberId = coven.users.Member!;
  // The pause is a setup row: the owner's controls that set one are walked above.
  await withSql(
    (sql) => sql`
      insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
      values (${coven.id}, ${memberId}, null, ${coven.users.Owner!}, ${coven.users.Owner!})`,
  );

  await page.goto(`/coven/${coven.slug}`);
  await expect(page).toHaveURL(`/coven-paused/${coven.slug}`);
  await page.getByRole('main').getByRole('button', { name: 'Leave Coven', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Leave Fixture Leaving Coven?');
  // Sweep gap: the Leave Coven dialog opened by a paused member, which the sweep opens only for a steward.
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Leave Coven', exact: true }).click();

  await expect(page).toHaveURL('/coven');
  const [seat] = await withSql(
    (sql) => sql<{ deleted_by: string | null }[]>`
      select deleted_by from workspace_members
      where workspace_id = ${coven.id} and user_id = ${memberId} and deleted_at is not null`,
  );
  expect(seat).toEqual({ deleted_by: memberId });
  await page.goto(`/coven-paused/${coven.slug}`);
  await expect(page.getByRole('heading', { name: 'Access Paused' })).toHaveCount(0);
});

test('a member paused in the coven they would land in is taken to their next coven, and the paused page leads to it too', async ({
  page,
}) => {
  // The page ends signed in as the member. Alder sorts ahead of Birch, so without the pause the member lands in Alder.
  const alder = await seedCoven(page, 'Fixture Alder Coven', 'coven-pause-elsewhere.test', {
    Owner: 'owner',
    Member: 'member',
  });
  const memberId = alder.users.Member!;
  const ownerId = alder.users.Owner!;
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await insertWorkspace(
        tx,
        'Fixture Birch Coven',
        [
          [ownerId, 'owner'],
          [memberId, 'member'],
        ],
        {
          slug: 'fixture-birch-coven',
          author: ownerId,
        },
      );
      await tx`
        insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
        values (${alder.id}, ${memberId}, null, ${ownerId}, ${ownerId})`;
    }),
  );
  const birchHome = '/coven/fixture-birch-coven';

  await page.goto('/coven');
  await expect(page).toHaveURL(birchHome);

  await page.goto(`/coven/${alder.slug}`);
  await expect(page).toHaveURL(`/coven-paused/${alder.slug}`);
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(/Fixture Alder Coven/);
  await page
    .getByRole('list', { name: 'Your Other Covens' })
    .getByRole('link', { name: 'Fixture Birch Coven' })
    .click();
  await expect(page).toHaveURL(birchHome);

  await page.goto(`/coven-paused/${alder.slug}`);
  await page.getByRole('combobox', { name: 'Coven' }).click();
  await page.getByRole('option', { name: 'Fixture Birch Coven' }).click();
  await expect(page).toHaveURL(birchHome);

  await page.getByRole('combobox', { name: 'Coven' }).click();
  await page.getByRole('option', { name: /Fixture Alder Coven/ }).click();
  await expect(page).toHaveURL(`/coven-paused/${alder.slug}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Access Paused' })).toBeVisible();
});
