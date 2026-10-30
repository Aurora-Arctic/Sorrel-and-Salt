import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import type { CDPSession, Page } from '@playwright/test';
import { test as base } from '../fixtures';
import { assertNoAccessibilityViolations, settleTransitions } from '../axe';
import { serverUrl, slotPort } from '../slots';
import { withSql } from './accounts-setup';

// What the passkey stories share. WebAuthn runs only in a secure context, and the one plain-http host that counts
// as one is localhost, so a passkey story reaches its slot server at localhost: the remote browser through
// `exposeNetwork`, and the server answering with a localhost base URL (claude-docs/testing/e2e.md, "Passkeys").

/**
 * The story `test`, at the slot server's localhost address. Each spec also sets `exposeNetwork` and skips browsers
 * other than Chromium, as Playwright takes `test.use` and `test.skip` only in the spec file itself.
 */
export const test = base.extend({
  baseURL: async ({ slot }, use) => {
    await use(serverUrl(slotPort(slot)));
  },
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

export async function scanBothThemes(page: Page): Promise<void> {
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await settleTransitions(page);
    await assertNoAccessibilityViolations(page);
  }
}

/**
 * A fresh account holding one passkey, named Laptop, which `page`'s virtual authenticator holds too, and `page` on
 * the sign-in page, ready to use it.
 */
export async function signInWithPasskey(page: Page, email: string) {
  const key = passkeyPair();
  const userId = await accountWithPasskey(email, key);
  const authenticator = await virtualAuthenticator(page);
  await authenticator.cdp.send('WebAuthn.addCredential', {
    authenticatorId: authenticator.id,
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
  return { userId, authenticator };
}
