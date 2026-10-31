import type { Route } from '@playwright/test';
import { test, expect } from '../fixtures';
import { signInAgainAs } from '../session';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { localIngredient, seedCoven, withSql } from './coven-ingredients';

// Story 81, the ingredient half: typing in a coven's ingredient form is saved without a press.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test(
  'a member’s typing in the ingredient form is saved without a press, and survives a reload',
  { tag: '@story-81' },
  async ({ page }) => {
    // The offline save retries after 2, 5 and 15 seconds before it says it failed.
    test.setTimeout(90_000);
    const coven = await seedCoven(
      page,
      'Fixture Coven Eighty-One Ingredients',
      'story-81-ing.test',
      {
        A: 'owner',
        B: 'member',
      },
    );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/ingredients?new=ingredient-coven-${coven.slug}`);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name' }).first().fill('Autosavewort');
    // Nothing is pressed: the ingredient is created once it has a name, and the address names it.
    await expect(page).toHaveURL(/\?edit=[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(dialog.getByRole('status').filter({ hasText: /saved/i })).toBeVisible();
    await assertNoAccessibilityViolations(page);

    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Name' }).first(),
    ).toHaveValue('Autosavewort');

    // Offline, the save fails after its retries and says so; back online, Retry saves it.
    const reopened = page.getByRole('dialog');
    await reopened.getByRole('textbox', { name: 'Name' }).first().fill('Autosavewort Offline');
    const dropSaves = (route: Route) => route.abort('internetdisconnected');
    await page.route('**/api/graphql', dropSaves);
    await expect(reopened.getByText(/Could not save/)).toBeVisible({ timeout: 45_000 });
    await assertNoAccessibilityViolations(page);
    await page.unroute('**/api/graphql', dropSaves);
    await reopened.getByRole('button', { name: 'Retry' }).click();
    await expect(reopened.getByRole('status').filter({ hasText: /saved/i })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Name' }).first(),
    ).toHaveValue('Autosavewort Offline');
  },
);

test(
  'two members edit one ingredient: the second save is refused, and Reload Latest or Keep My Version settles it',
  { tag: '@story-81' },
  async ({ page, browser, baseURL }) => {
    const coven = await seedCoven(
      page,
      'Fixture Coven Eighty-One Shared Ingredient',
      'story-81-ing2.test',
      {
        A: 'owner',
        B: 'member',
      },
    );
    const held = await withSql((sql) =>
      localIngredient(sql, coven.id, coven.users.A, { name: 'Sharedwort' }),
    );
    await signInAgainAs(page, coven.users.B);
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await signInAgainAs(otherPage, coven.users.A);
    const address = `/coven/${coven.slug}/ingredients?edit=${held.ingredientId}`;
    await page.goto(address);
    await otherPage.goto(address);
    await page.getByRole('button', { name: 'Open All' }).click();
    await otherPage.getByRole('button', { name: 'Open All' }).click();
    const first = page.getByRole('dialog');
    const second = otherPage.getByRole('dialog');
    const name = (dialog: typeof first) => dialog.getByRole('textbox', { name: 'Name' }).first();
    const conflict = 'This ingredient was changed elsewhere.';

    await name(first).fill('Seen by B');
    await expect(first.getByRole('status').filter({ hasText: /saved/i })).toBeVisible({
      timeout: 20_000,
    });
    await name(second).fill('Seen by A');
    await expect(second.getByText(conflict)).toBeVisible({ timeout: 20_000 });
    await assertNoAccessibilityViolations(otherPage);

    await second.getByRole('button', { name: 'Reload Latest' }).click();
    await otherPage.getByRole('button', { name: 'Open All' }).click();
    await expect(name(second)).toHaveValue('Seen by B');
    await expect(second.getByText(conflict)).toBeHidden();

    // The second browser saved nothing, so the first is not behind; the second now writes over it.
    await name(second).fill('Seen by A, after reload');
    await expect(second.getByRole('status').filter({ hasText: /saved/i })).toBeVisible({
      timeout: 20_000,
    });
    await name(first).fill('Kept by B');
    await expect(first.getByText(conflict)).toBeVisible({ timeout: 20_000 });
    await first.getByRole('button', { name: 'Keep My Version' }).click();
    await expect(first.getByText(conflict)).toBeHidden();
    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(name(page.getByRole('dialog'))).toHaveValue('Kept by B');
    await other.close();
  },
);
