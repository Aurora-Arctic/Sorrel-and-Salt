import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import type { CDPSession, Page } from '@playwright/test';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import { test as base, expect } from '../fixtures';
import { assertNoAccessibilityViolations, settleTransitions } from '../axe';
import { recreateE2eDatabase } from '../database';
import { serverUrl, slotPort, wsEndpoint } from '../slots';
import { withSql } from './accounts-setup';

// Signing in with a passkey, held by Chromium's virtual authenticator. WebAuthn runs only in a secure context, and
// the one plain-http host that counts as one is localhost, so this file reaches its slot server at localhost: the
// remote browser through `exposeNetwork`, and the server answering with a localhost base URL
// (claude-docs/testing/e2e.md, "Passkeys").

const test = base.extend({
  baseURL: async ({ slot }, use) => {
    await use(serverUrl(slotPort(slot)));
  },
});

test.use({
  connectOptions: wsEndpoint ? { wsEndpoint, exposeNetwork: '<loopback>' } : undefined,
});

// The virtual authenticator is a CDP domain, which Chromium alone speaks.
test.skip(({ browserName }) => browserName !== 'chromium', 'needs CDP');

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A P-256 key as the authenticator holds it (PKCS#8) and as the server stores it (COSE), with its credential id. */
function passkeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const coordinate = (value: string | undefined) =>
    new Uint8Array(Buffer.from(value!, 'base64url'));
  // COSE_Key: kty EC2 (1: 2), alg ES256 (3: -7), crv P-256 (-1: 1), x (-2), y (-3).
  const cose = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, coordinate(jwk.x)],
      [-3, coordinate(jwk.y)],
    ]),
  );
  return {
    credentialId: randomBytes(16),
    pkcs8: privateKey.export({ format: 'der', type: 'pkcs8' }),
    publicKey: Buffer.from(cose).toString('base64'),
  };
}

/** A verified account in no coven holding one passkey row for `key`, written as the plugin writes a registration. */
async function accountWithPasskey(email: string, key: ReturnType<typeof passkeyPair>) {
  const id = randomUUID();
  await withSql(async (sql) => {
    await sql`
      insert into users (id, name, email, email_verified, role, created_by, updated_by)
      values (${id}, 'Fixture Passkeyholder', ${email}, true, 'user', ${id}, ${id})
    `;
    await sql`
      insert into passkeys (name, public_key, user_id, credential_id, counter, device_type, backed_up, transports)
      values ('Laptop', ${key.publicKey}, ${id}, ${key.credentialId.toString('base64url')}, 0, 'singleDevice', false, 'internal')
    `;
  });
  return id;
}

/** A virtual platform authenticator on `page`, answering every prompt as a verified user would. */
async function virtualAuthenticator(page: Page): Promise<{ cdp: CDPSession; id: string }> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, id: authenticatorId };
}

async function scanBothThemes(page: Page): Promise<void> {
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await settleTransitions(page);
    await assertNoAccessibilityViolations(page);
  }
}

test.describe('signing in with a passkey', () => {
  test(
    'a passkey the device holds signs its account in from the sign-in page, and lands where a sign-in lands',
    { tag: '@story-73' },
    async ({ page, context }) => {
      const key = passkeyPair();
      const userId = await accountWithPasskey('holder@passkey-story.test', key);
      const { cdp, id } = await virtualAuthenticator(page);
      await cdp.send('WebAuthn.addCredential', {
        authenticatorId: id,
        credential: {
          credentialId: key.credentialId.toString('base64'),
          isResidentCredential: true,
          rpId: 'localhost',
          privateKey: key.pkcs8.toString('base64'),
          userHandle: Buffer.from(userId).toString('base64'),
          signCount: 0,
        },
      });

      await page.goto('/sign-in');
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
