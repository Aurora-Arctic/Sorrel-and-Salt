import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import { expectRoll, makeCoven, makeUser, seatsOf, withSql } from './accounts-setup';

// Stories 9, 10 and 11, walked in the browser against the built server: the
// members page's roll, removing a member and leaving, and the last-owner
// guard. Each test builds a coven of its own by SQL (accounts-setup.ts), so a
// removal or a role change in one cannot reach another; the step each story
// is about goes through the page. A refusal is shown twice over: the control
// is absent where the page knows better, and where a page loaded earlier
// still offers it, the server refuses it and the page says so.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ASH = 'Fixture Ash';
const BIRCH = 'Fixture Birch';
const CEDAR = 'Fixture Cedar';
const NAMES = [ASH, BIRCH, CEDAR];

/**
 * Ash, Birch and Cedar, with addresses of the test's own (`key`) since the
 * email index is unique, seated in a new coven at the roles given. The page
 * is left signed in as the last of them made.
 */
async function covenOfThree(
  page: Page,
  key: string,
  roles: { ash: 'owner'; birch: 'owner' | 'member'; cedar: 'member' | 'viewer' },
) {
  const ash = await makeUser(page, `ash@${key}.members-story.test`, ASH);
  const birch = await makeUser(page, `birch@${key}.members-story.test`, BIRCH);
  const cedar = await makeUser(page, `cedar@${key}.members-story.test`, CEDAR);
  const coven = await makeCoven(`Fixture ${key} Coven`, [
    [ash, roles.ash],
    [birch, roles.birch],
    [cedar, roles.cedar],
  ]);
  return { ash, birch, cedar, coven };
}

/** The Members link in the coven's section nav. */
const membersLink = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Coven' })
    .getByRole('link', { name: 'Members', exact: true });

/** The refusal said in the page's main, apart from Next's route announcer outside it. */
const refusal = (page: Page) => page.getByRole('main').getByRole('alert');

test.describe('who is in a coven', () => {
  test(
    'an owner and a member read the roll with every role, and a viewer is turned away at its address',
    { tag: '@story-9' },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'roll', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });

      for (const reader of [ash, birch]) {
        await signInAgainAs(page, reader);
        await page.goto(`/coven/${coven.slug}`);
        await membersLink(page).click();
        await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/members$`));
        await expect(membersLink(page)).toHaveAttribute('aria-current', 'page');
        await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
        // The addresses are the owner's alone: each row carries its
        // member's for Ash, and none reaches Birch's page.
        const table = page.getByRole('table', { name: 'Members' });
        for (const [name, address] of [
          [ASH, 'ash@roll.members-story.test'],
          [BIRCH, 'birch@roll.members-story.test'],
          [CEDAR, 'cedar@roll.members-story.test'],
        ]) {
          // By the name cell: Ash is also named in other rows' Invited By and Updated.
          const row = table
            .getByRole('row')
            .filter({ has: page.getByRole('cell', { name: new RegExp(`^${name}( You)?$`) }) });
          if (reader === ash) await expect(row).toContainText(address);
          else await expect(row).not.toContainText(address);
        }
        if (reader === ash) {
          await assertNoAccessibilityViolations(page);
          await assertNoSidewaysScroll(page);
        }
      }

      // Why the viewer's 404 is the members page's own check: they hold a live
      // seat, and the coven's page opens for them.
      await signInAgainAs(page, cedar);
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(200);
      await expect(page.getByRole('navigation', { name: 'Coven' })).toBeVisible();
      await expect(membersLink(page)).toHaveCount(0);
      expect((await page.goto(`/coven/${coven.slug}/members`))?.status()).toBe(404);
      await expect(page.getByRole('table', { name: 'Members' })).toHaveCount(0);
    },
  );

  test(
    'a signed-in stranger meets the same 404 at the coven and its roll as at an address that names no coven',
    { tag: '@story-9' },
    async ({ page }) => {
      const { ash, coven } = await covenOfThree(page, 'stranger', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });
      const stranger = await makeUser(page, 'stranger@members-story.test', 'Fixture Stranger');

      // The coven exists and admits its owner, so the stranger's 404 is the guard's.
      await signInAgainAs(page, ash);
      expect((await page.goto(`/coven/${coven.slug}/members`))?.status()).toBe(200);

      await signInAgainAs(page, stranger);
      for (const path of [`/coven/${coven.slug}`, `/coven/${coven.slug}/members`]) {
        const refused = await page.goto(path);
        expect(refused?.status()).toBe(404);
        // The answer carries nothing of the coven, in the markup or the RSC
        // payload: the address is the visitor's, the name is not.
        expect(await refused?.text()).not.toContain('Fixture stranger Coven');
        await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
        await expect(page.getByRole('table', { name: 'Members' })).toHaveCount(0);
      }
      expect((await page.goto('/coven/no-such-coven'))?.status()).toBe(404);
      await assertNoAccessibilityViolations(page);
    },
  );
});

test.describe('removing a member, and leaving', () => {
  test(
    'an owner removes a member from the roll, and the removed member is turned away from the coven',
    { tag: '@story-10' },
    async ({ page }) => {
      const { ash, birch, coven } = await covenOfThree(page, 'remove', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });

      // Why the later 404 is the removal's: Birch is admitted now.
      await signInAgainAs(page, birch);
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(200);

      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
      // Nobody removes themself from the roll: leaving is the coven page's.
      await expect(page.getByRole('button', { name: `Remove ${ASH}` })).toHaveCount(0);
      await page.getByRole('button', { name: `Remove ${BIRCH}` }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('button', { name: 'Remove', exact: true })).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expectRoll(page, { [ASH]: 'Owner', [CEDAR]: 'Viewer' }, NAMES);
      // The Remove that had the focus went with its row: the page's heading
      // takes it, rather than the page losing it.
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
      await page.setViewportSize({ width: 375, height: 812 });
      await assertNoAccessibilityViolations(page);
      await assertNoSidewaysScroll(page);

      // A soft removal: Birch's seat is kept, marked, and no other is touched.
      const seats = await withSql(
        (sql) => sql`
          select user_id, deleted_at is not null as gone from workspace_members
          where workspace_id = ${coven.id}`,
      );
      expect(seats).toHaveLength(3);
      expect(seats.filter((seat) => seat.gone).map((seat) => seat.user_id)).toEqual([birch]);

      await signInAgainAs(page, birch);
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(404);
      // With no coven left, their landing lists none.
      await page.goto('/coven');
      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
    },
  );

  test(
    'a viewer leaves the coven from its page, lands outside it, and is turned away from it afterwards',
    { tag: '@story-10' },
    async ({ page }) => {
      const { ash, cedar, coven } = await covenOfThree(page, 'leave', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });

      // A viewer may change nothing in the coven, and may still go.
      await signInAgainAs(page, cedar);
      await page.goto(`/coven/${coven.slug}`);
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Leave Coven', exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      const confirm = dialog.getByRole('button', { name: 'Leave Coven', exact: true });
      await expect(confirm).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await confirm.click();

      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('main').getByRole('region')).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(404);

      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member' }, NAMES);
      expect(await seatsOf(coven.id)).not.toHaveProperty(cedar);
    },
  );

  test(
    'a member has no remove or role control, and a removal sent from a page they loaded as an owner is refused',
    { tag: '@story-10' },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'refuse', {
        ash: 'owner',
        birch: 'owner',
        cedar: 'viewer',
      });

      // Loaded while Birch is an owner, so the page offers Remove on Cedar.
      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      const remove = page.getByRole('button', { name: `Remove ${CEDAR}`, exact: true });
      await expect(remove).toBeVisible();

      // Meanwhile Ash makes Birch a member, which the open page cannot know.
      await withSql(
        (sql) => sql`
          update workspace_members set role = 'member', updated_by = ${ash}
          where workspace_id = ${coven.id} and user_id = ${birch}`,
      );

      await remove.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(refusal(page)).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      // Said under the Remove that was pressed, which takes the focus back from the dialog.
      await expect(remove).toBeFocused();
      await assertNoAccessibilityViolations(page);
      expect(await seatsOf(coven.id)).toEqual({
        [ash]: 'owner',
        [birch]: 'member',
        [cedar]: 'viewer',
      });

      // Read again, the page knows Birch for a member: the roll is unchanged
      // and no row carries a control.
      await page.reload();
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
      await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Change Role / })).toHaveCount(0);
    },
  );
});

test.describe('the last owner', () => {
  test(
    'the only owner cannot demote themself or be removed: the refusal is said under its control, and nothing moved',
    { tag: '@story-11' },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'sole', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });
      const before = { [ash]: 'owner', [birch]: 'member', [cedar]: 'viewer' };
      // Why each refusal could have gone through: Ash holds the owner's
      // controls and is the only owner there is.
      expect(await seatsOf(coven.id)).toEqual(before);

      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
      // Remove is offered on the others' rows and never on the owner's own,
      // and no one else holds it.
      await expect(page.getByRole('button', { name: `Remove ${BIRCH}` })).toBeVisible();
      await expect(page.getByRole('button', { name: `Remove ${ASH}` })).toHaveCount(0);

      const control = page.getByRole('button', { name: `Change Role for ${ASH}`, exact: true });
      const roll = await page.getByRole('table').boundingBox();
      await control.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('radio', { name: /^Member/ }).check();
      await dialog.getByRole('button', { name: 'Demote', exact: true }).click();

      await expect(refusal(page)).toBeVisible();
      await expect(dialog).toHaveCount(0);
      // Under its own control, which keeps the focus, and nothing moved: the
      // callout is out of the flow, so the roll sits where it sat.
      await expect(control).toBeFocused();
      const button = await control.boundingBox();
      const said = await refusal(page).boundingBox();
      expect(said!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
      expect(said!.x).toBeLessThan(button!.x + button!.width);
      expect(said!.x + said!.width).toBeGreaterThan(button!.x);
      expect(await page.getByRole('table').boundingBox()).toEqual(roll);
      await assertNoAccessibilityViolations(page);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
      expect(await seatsOf(coven.id)).toEqual(before);
    },
  );

  test(
    'the only owner is offered no plain leave, and leaves by handing the coven to another member first',
    { tag: ['@story-10', '@story-11'] },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'handover', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });

      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}`);
      const leave = page.getByRole('main').getByRole('button', { name: 'Leave Coven' });
      // Enabled, so nobody concludes they are stuck.
      await expect(leave).toBeEnabled();
      await leave.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('radio', { name: /^Hand It/ })).toBeChecked();
      // There is no confirm that would leave the coven ownerless.
      await expect(dialog.getByRole('button', { name: 'Leave Coven', exact: true })).toHaveCount(0);
      // The deletion is the other way out, its confirm taking the place once chosen.
      await dialog.getByRole('radio', { name: /^Delete It/ }).check();
      await expect(dialog.getByRole('button', { name: 'Delete Coven' })).toBeEnabled();
      await dialog.getByRole('radio', { name: /^Hand It/ }).check();

      // Two others, so the new owner is searched for rather than offered alone.
      await dialog.getByRole('combobox', { name: 'New Owner' }).click();
      await expect(dialog.getByRole('option')).toHaveCount(2);
      await dialog.getByRole('option', { name: new RegExp(BIRCH) }).click();
      await expect(dialog.getByRole('button', { name: 'Promote and Leave' })).toBeEnabled();
      await assertNoAccessibilityViolations(page);

      // By keyboard: focus the action and press Enter.
      await dialog.getByRole('button', { name: 'Promote and Leave' }).focus();
      await page.keyboard.press('Enter');
      // The landing, since Ash is in no other coven now.
      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('main').getByRole('region')).toBeVisible();
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(404);

      expect(await seatsOf(coven.id)).toEqual({ [birch]: 'owner', [cedar]: 'viewer' });
      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [BIRCH]: 'Owner', [CEDAR]: 'Viewer' }, NAMES);
    },
  );

  test(
    'a leave sent from a page loaded while another owner was there is refused once they have gone, and the owner stays',
    { tag: '@story-11' },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'stale', {
        ash: 'owner',
        birch: 'owner',
        cedar: 'member',
      });

      // With another owner there, the page offers the plain leave.
      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}`);
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Leave Coven', exact: true })
        .click();
      const confirm = page
        .getByRole('dialog')
        .getByRole('button', { name: 'Leave Coven', exact: true });
      await expect(confirm).toBeEnabled();

      // Meanwhile Birch leaves, so Ash is now the only owner.
      await withSql(
        (sql) => sql`
          update workspace_members set deleted_at = now(), deleted_by = ${birch}, updated_by = ${birch}
          where workspace_id = ${coven.id} and user_id = ${birch}`,
      );

      await confirm.click();
      await expect(refusal(page)).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('button', { name: 'Leave Coven', exact: true }),
      ).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}$`));
      await assertNoAccessibilityViolations(page);
      expect(await seatsOf(coven.id)).toEqual({ [ash]: 'owner', [cedar]: 'member' });

      // Read again, the page knows Ash for the only owner and offers the way out instead.
      await page.reload();
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Leave Coven', exact: true })
        .click();
      await expect(page.getByRole('dialog').getByRole('radio', { name: /^Hand It/ })).toBeVisible();
    },
  );

  test(
    'with two owners one demotes the other, and the owner left cannot demote themself',
    { tag: '@story-11' },
    async ({ page }) => {
      const { ash, birch, cedar, coven } = await covenOfThree(page, 'two', {
        ash: 'owner',
        birch: 'member',
        cedar: 'viewer',
      });

      // Ash makes Birch a second owner.
      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Member', [CEDAR]: 'Viewer' }, NAMES);
      await page.getByRole('button', { name: `Change Role for ${BIRCH}` }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('radio', { name: /^Owner/ }).check();
      await expect(dialog.getByRole('button', { name: 'Promote', exact: true })).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await dialog.getByRole('button', { name: 'Promote', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expectRoll(page, { [ASH]: 'Owner', [BIRCH]: 'Owner', [CEDAR]: 'Viewer' }, NAMES);

      // With two, Birch demotes Ash.
      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      await page.getByRole('button', { name: `Change Role for ${ASH}` }).click();
      await dialog.getByRole('radio', { name: /^Member/ }).check();
      await dialog.getByRole('button', { name: 'Demote', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expectRoll(page, { [ASH]: 'Member', [BIRCH]: 'Owner', [CEDAR]: 'Viewer' }, NAMES);

      // Birch is the last owner now, and cannot step down.
      await page.getByRole('button', { name: `Change Role for ${BIRCH}` }).click();
      await dialog.getByRole('radio', { name: /^Member/ }).check();
      await dialog.getByRole('button', { name: 'Demote', exact: true }).click();
      await expect(refusal(page)).toBeVisible();
      await expectRoll(page, { [ASH]: 'Member', [BIRCH]: 'Owner', [CEDAR]: 'Viewer' }, NAMES);
      expect(await seatsOf(coven.id)).toEqual({
        [ash]: 'member',
        [birch]: 'owner',
        [cedar]: 'viewer',
      });
    },
  );
});
