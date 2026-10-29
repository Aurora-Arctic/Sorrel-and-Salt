import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { compendiumList, withSql } from './coven-ingredients';

// Story 63: a visitor with no account opens the compendium from the front door, is not
// turned away to sign in, and reads an entry from a card. The pages are public;
// the chrome round them carries the way in, and following it reaches the sign-in page.
// Both pages' axe scans,
// signed out, are tests/e2e/public-compendium.spec.ts's and compendium-entry.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test(
  'a visitor with no account reads the compendium and an entry, then follows Sign In',
  { tag: '@story-63' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Browse the Compendium' }).click();

    // The list itself, not the sign-in page with a way back.
    await expect(page).toHaveURL(/\/compendium$/);
    const card = compendiumList(page).locator(':scope > li').first();
    // The entry link is the one in the card's heading, named for the entry; the card also
    // carries a Quick Look link beside it.
    const name = await card.getByRole('heading', { level: 2 }).innerText();
    const link = card.getByRole('link', { name, exact: true });
    const href = await link.getAttribute('href');
    const slug = href?.replace('/compendium/ingredients/', '');
    const [entry] = await withSql(
      (sql) => sql<{ name: string; workspace_id: string | null }[]>`
        select name, workspace_id from ingredients where slug = ${slug ?? ''} and deleted_at is null`,
    );
    // The card is a compendium entry's, so its page is the public one.
    expect(entry.workspace_id).toBeNull();

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1, name: entry.name })).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/sign-in/);
  },
);
