import { expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { wsEndpoint } from '../slots';
import { withSql } from './accounts-setup';
import { scanBothThemes, signInWithPasskey, test } from './passkeys-setup';

// Adding, renaming and removing a passkey from the account page, with Chromium's virtual authenticator, at the slot
// server's localhost address (passkeys-setup.ts).

test.use({
  connectOptions: wsEndpoint ? { wsEndpoint, exposeNetwork: '<loopback>' } : undefined,
});

// The virtual authenticator is a CDP domain, which Chromium alone speaks.
test.skip(({ browserName }) => browserName !== 'chromium', 'needs CDP');

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('passkeys on the account page', () => {
  test(
    'a signed-in account adds a passkey, renames it and removes another, and the list follows each',
    { tag: '@story-74' },
    async ({ page }) => {
      const { userId, authenticator } = await signInWithPasskey(page, 'keeper@passkey-story.test');
      await page.getByRole('button', { name: 'Sign In with a Passkey' }).click();
      await expect(page).toHaveURL(/\/coven$/);
      // The sign-in key is forgotten, so the device can make a new one: a registration refuses a device that
      // already holds one of the account's keys.
      await authenticator.cdp.send('WebAuthn.clearCredentials', {
        authenticatorId: authenticator.id,
      });

      await page.goto('/account/sign-in');
      const section = page.getByRole('region', { name: 'Passkeys' });
      const list = section.getByRole('list', { name: 'Passkeys' });
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await scanBothThemes(page);

      await section.getByRole('button', { name: 'Add a Passkey' }).click();
      await expect(list.getByRole('listitem')).toHaveCount(2);

      // Made unnamed, it is called after the browser that made it.
      const [{ name: made }] = await withSql(
        (sql) =>
          sql`select name from passkeys where user_id = ${userId} order by created_at desc limit 1`,
      );
      expect(made).toMatch(/^Chrome/);
      await expect(section.getByRole('button', { name: `Rename ${made}` })).toBeVisible();

      await section.getByRole('button', { name: `Rename ${made}` }).click();
      const dialog = page.getByRole('dialog', { name: 'Rename Passkey' });
      await dialog.getByRole('textbox', { name: 'Name' }).fill('Phone');
      await scanBothThemes(page);
      await dialog.getByRole('button', { name: 'Save Name' }).click();
      await expect(dialog).toBeHidden();
      await expect(section.getByRole('button', { name: 'Rename Phone' })).toBeVisible();

      await section.getByRole('button', { name: 'Remove Laptop' }).click();
      const confirm = page.getByRole('dialog', { name: 'Remove Passkey' });
      await scanBothThemes(page);
      await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(section.getByRole('button', { name: 'Remove Phone' })).toBeVisible();

      // The list says what the server holds, read again from a fresh page and from the table.
      await page.reload();
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(section.getByRole('button', { name: 'Remove Phone' })).toBeVisible();
      const rows = await withSql((sql) => sql`select name from passkeys where user_id = ${userId}`);
      expect(rows.map((row) => row.name)).toEqual(['Phone']);
      await scanBothThemes(page);
    },
  );
});
