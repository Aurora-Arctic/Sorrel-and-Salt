import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import { expectRoll, makeCoven, makeUser, seatsOf, withSql } from './accounts-setup';

// Each test builds its own coven by SQL (accounts-setup.ts). A refusal shows twice: the control is absent where the page knows better, and where a stale page still offers it the server refuses and the page says so.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ASH = 'Fixture Ash';
const BIRCH = 'Fixture Birch';
const CEDAR = 'Fixture Cedar';
const NAMES = [ASH, BIRCH, CEDAR];

/** Addresses are the test's own (`key`) since the email index is unique. The page is left signed in as the last of them. */
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

const membersLink = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Coven' })
    .getByRole('link', { name: 'Members', exact: true });

async function openMember(page: Page, name: string) {
  await page
    .getByRole('table', { name: 'Members' })
    .getByRole('link', { name, exact: true })
    .click();
  const modal = page.getByRole('dialog', { name });
  await expect(modal).toBeVisible();
  return modal;
}

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
        await expectRoll(
          page,
          { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
          NAMES,
        );
        // The addresses are the owner's alone: each row carries its member's for Ash, none reaches Birch's page.
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
      await expectRoll(
        page,
        { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
        NAMES,
      );
      await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
      // Nobody removes themself from the roll: leaving is the coven page's.
      const own = await openMember(page, ASH);
      await expect(own.getByRole('button', { name: `Change Role for ${ASH}` })).toBeVisible();
      await expect(own.getByRole('button', { name: `Remove ${ASH}` })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(own).toHaveCount(0);

      const dialog = await openMember(page, BIRCH);
      await dialog.getByRole('button', { name: `Remove ${BIRCH}` }).click();
      await expect(dialog.getByRole('button', { name: 'Remove', exact: true })).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/members$`));
      await expectRoll(page, { [ASH]: 'Steward', [CEDAR]: 'Observer' }, NAMES);
      await page.setViewportSize({ width: 375, height: 812 });
      await assertNoAccessibilityViolations(page);
      await assertNoSidewaysScroll(page);

      const seats = await withSql(
        (sql) => sql`
          select user_id, deleted_at is not null as gone from workspace_members
          where workspace_id = ${coven.id}`,
      );
      expect(seats).toHaveLength(3);
      expect(seats.filter((seat) => seat.gone).map((seat) => seat.user_id)).toEqual([birch]);

      await signInAgainAs(page, birch);
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(404);
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
      await expectRoll(page, { [ASH]: 'Steward', [BIRCH]: 'Practitioner' }, NAMES);
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

      // Loaded while Birch is an owner, so Cedar's modal offers Remove.
      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      const modal = await openMember(page, CEDAR);
      const remove = modal.getByRole('button', { name: `Remove ${CEDAR}`, exact: true });
      await expect(remove).toBeVisible();

      await withSql(
        (sql) => sql`
          update workspace_members set role = 'member', updated_by = ${ash}
          where workspace_id = ${coven.id} and user_id = ${birch}`,
      );

      await remove.click();
      await modal.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(modal.getByRole('alert')).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
      await expect(remove).toBeVisible();
      await assertNoAccessibilityViolations(page);
      expect(await seatsOf(coven.id)).toEqual({
        [ash]: 'owner',
        [birch]: 'member',
        [cedar]: 'viewer',
      });

      await page.reload();
      await expect(modal).toBeVisible();
      await expectRoll(
        page,
        { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
        NAMES,
      );
      await expect(modal.getByRole('region', { name: 'Membership' })).toContainText('Observer');
      await expect(modal.getByRole('button', { name: /^Remove / })).toHaveCount(0);
      await expect(modal.getByRole('button', { name: /^Change Role / })).toHaveCount(0);
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
      await expectRoll(
        page,
        { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
        NAMES,
      );
      const other = await openMember(page, BIRCH);
      await expect(other.getByRole('button', { name: `Remove ${BIRCH}` })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(other).toHaveCount(0);

      const dialog = await openMember(page, ASH);
      await expect(dialog.getByRole('button', { name: `Remove ${ASH}` })).toHaveCount(0);
      const control = dialog.getByRole('button', { name: `Change Role for ${ASH}`, exact: true });
      const facts = dialog.getByRole('region', { name: 'Membership' });
      const placed = await facts.boundingBox();
      await control.click();
      await dialog.getByRole('radio', { name: /^Practitioner/ }).check();
      await dialog.getByRole('button', { name: 'Demote', exact: true }).click();

      const said = dialog.getByRole('alert');
      await expect(said).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Demote', exact: true })).toHaveCount(0);
      // Under its own control, and nothing moved: the callout is out of the
      // flow, so the modal's facts sit where they sat.
      const button = await control.boundingBox();
      const at = await said.boundingBox();
      expect(at!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
      expect(at!.x).toBeLessThan(button!.x + button!.width);
      expect(at!.x + at!.width).toBeGreaterThan(button!.x);
      expect(await facts.boundingBox()).toEqual(placed);
      await assertNoAccessibilityViolations(page);
      await expectRoll(
        page,
        { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
        NAMES,
      );
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
      await expect(leave).toBeEnabled();
      await leave.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('radio', { name: /^Hand It/ })).toBeChecked();
      // There is no confirm that would leave the coven ownerless.
      await expect(dialog.getByRole('button', { name: 'Leave Coven', exact: true })).toHaveCount(0);
      await dialog.getByRole('radio', { name: /^Delete Coven/ }).check();
      await expect(dialog.getByRole('button', { name: 'Delete Coven' })).toBeEnabled();
      await dialog.getByRole('radio', { name: /^Hand It/ }).check();

      // Two others, so the new owner is searched for rather than offered alone.
      await dialog.getByRole('combobox', { name: 'New Steward' }).click();
      await expect(dialog.getByRole('option')).toHaveCount(2);
      await dialog.getByRole('option', { name: new RegExp(BIRCH) }).click();
      await expect(dialog.getByRole('button', { name: 'Promote and Leave' })).toBeEnabled();
      await assertNoAccessibilityViolations(page);

      await dialog.getByRole('button', { name: 'Promote and Leave' }).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('main').getByRole('region')).toBeVisible();
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(404);

      expect(await seatsOf(coven.id)).toEqual({ [birch]: 'owner', [cedar]: 'viewer' });
      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(page, { [BIRCH]: 'Steward', [CEDAR]: 'Observer' }, NAMES);
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

      await signInAgainAs(page, ash);
      await page.goto(`/coven/${coven.slug}/members`);
      await expectRoll(
        page,
        { [ASH]: 'Steward', [BIRCH]: 'Practitioner', [CEDAR]: 'Observer' },
        NAMES,
      );
      const dialog = await openMember(page, BIRCH);
      await dialog.getByRole('button', { name: `Change Role for ${BIRCH}` }).click();
      await dialog.getByRole('radio', { name: /^Steward/ }).check();
      await expect(dialog.getByRole('button', { name: 'Promote', exact: true })).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await dialog.getByRole('button', { name: 'Promote', exact: true }).click();
      await expect(dialog.getByRole('region', { name: 'Membership' })).toContainText('Steward');
      await expectRoll(page, { [ASH]: 'Steward', [BIRCH]: 'Steward', [CEDAR]: 'Observer' }, NAMES);

      await signInAgainAs(page, birch);
      await page.goto(`/coven/${coven.slug}/members`);
      const ashModal = await openMember(page, ASH);
      await ashModal.getByRole('button', { name: `Change Role for ${ASH}` }).click();
      await ashModal.getByRole('radio', { name: /^Practitioner/ }).check();
      await ashModal.getByRole('button', { name: 'Demote', exact: true }).click();
      await expectRoll(
        page,
        { [ASH]: 'Practitioner', [BIRCH]: 'Steward', [CEDAR]: 'Observer' },
        NAMES,
      );
      await page.keyboard.press('Escape');
      await expect(ashModal).toHaveCount(0);

      const own = await openMember(page, BIRCH);
      await own.getByRole('button', { name: `Change Role for ${BIRCH}` }).click();
      await own.getByRole('radio', { name: /^Practitioner/ }).check();
      await own.getByRole('button', { name: 'Demote', exact: true }).click();
      await expect(own.getByRole('alert')).toBeVisible();
      await expectRoll(
        page,
        { [ASH]: 'Practitioner', [BIRCH]: 'Steward', [CEDAR]: 'Observer' },
        NAMES,
      );
      expect(await seatsOf(coven.id)).toEqual({
        [ash]: 'member',
        [birch]: 'owner',
        [cedar]: 'viewer',
      });
    },
  );
});
