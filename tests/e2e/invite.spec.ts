import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';

// `/invite/[token]` against the built server (MB.70): public, so a signed-out
// visitor is asked to sign in and brought back; signed in, only the invited
// address, verified, is offered Accept, which lands an admin on /admin
// (claude-docs/components/invitation-acceptance.md). The invitations are
// written here as the repository writes them, the token's hash alone; mailing
// one is admin-invitations.spec.ts's.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const DOMAIN = '@invite.test';

async function withSql<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

/** A pending site-tier invitation to `email`, sent by the seed's admin; answers its link's path. */
async function invite(email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await withSql(async (sql) => {
    const [admin] =
      await sql`select id from users where role = 'admin' order by created_at limit 1`;
    await sql`
      insert into invitations (email, token_hash, note, created_by, updated_by)
      values (${email}, ${createHash('sha256').update(token).digest('hex')}, 'Curates the resins',
        ${admin.id}, ${admin.id})
    `;
  });
  return `/invite/${token}`;
}

test('a signed-out visitor is asked to sign in and brought back to the link', async ({ page }) => {
  const path = await invite(`signed-out-${randomUUID()}${DOMAIN}`);

  const response = await page.goto(path);

  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeVisible();
  const signIn = page.getByRole('link', { name: 'Sign In' });
  await expect(signIn).toHaveAttribute('href', `/sign-in?next=${encodeURIComponent(path)}`);
  // Nothing of the invitation before a session holds the link.
  await expect(page.getByRole('main').getByText(/admin/i)).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

test('a different address is refused, and the invited one is sent to confirm it first', async ({
  page,
}) => {
  const invited = `pending-${randomUUID()}${DOMAIN}`;
  const path = await invite(invited);

  await signInAs(page, `someone-else-${randomUUID()}${DOMAIN}`);
  await page.goto(path);
  await expect(page.getByText(/sent to a different email address/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);

  await signInAs(page, invited, ['microsoft'], 'user', { emailVerified: false });
  await page.goto(path);
  await expect(page.getByText(/Confirm your email address/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
    'href',
    `/account/email?next=${encodeURIComponent(path)}`,
  );
  await assertNoAccessibilityViolations(page);
});

test('the invited account, verified, accepts and lands on /admin as an admin', async ({ page }) => {
  const invited = `accepts-${randomUUID()}${DOMAIN}`;
  const path = await invite(invited);
  const { userId } = await signInAs(page, invited, ['microsoft'], 'user', {
    emailVerified: false,
  });
  // Confirmed since: the same account, verified, signed in afresh.
  await withSql((sql) => sql`update users set email_verified = true where id = ${userId}`);
  await signInAgainAs(page, userId);

  await page.goto(path);
  await expect(page.getByText(/invited to become an admin/)).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Accept Invitation' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
  const [row] = await withSql((sql) => sql`select role::text from users where id = ${userId}`);
  expect(row.role).toBe('admin');

  // A second use says so.
  await page.goto(path);
  await expect(page.getByText('This invitation has already been accepted.')).toBeVisible();
});
