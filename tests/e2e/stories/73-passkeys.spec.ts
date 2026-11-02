import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import { expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { wsEndpoint } from '../slots';
import { withSql } from './accounts-setup';
import { scanBothThemes, signInWithPasskey, test } from './passkeys-setup';

// Signing in with a passkey, held by Chromium's virtual authenticator, at the slot server's localhost address
// (passkeys-setup.ts).

test.use({
  connectOptions: wsEndpoint ? { wsEndpoint, exposeNetwork: '<loopback>' } : undefined,
});

// The virtual authenticator is a CDP domain, which Chromium alone speaks.
test.skip(({ browserName }) => browserName !== 'chromium', 'needs CDP');

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('signing in with a passkey', () => {
  test(
    'a passkey the device holds signs its account in from the sign-in page, and lands where a sign-in lands',
    { tag: '@story-73' },
    async ({ page, context }) => {
      const { userId } = await signInWithPasskey(page, 'holder@passkey-story.test');
      await scanBothThemes(page);
      await page.getByRole('button', { name: 'Sign In with a Passkey' }).click();

      // An account in no coven lands on the coven landing, which a signed-out visitor is sent away from.
      await expect(page).toHaveURL(/\/coven$/);
      const cookies = await context.cookies();
      expect(cookies.find((cookie) => cookie.name === LAST_USED_PROVIDER_COOKIE)?.value).toBe(
        'passkey',
      );
      const [{ sessions }] = await withSql(
        (sql) => sql`select count(*)::int as sessions from sessions where user_id = ${userId}`,
      );
      expect(sessions).toBe(1);
      await scanBothThemes(page);
    },
  );
});
