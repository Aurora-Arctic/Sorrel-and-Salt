import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';

// `/invite/[token]` against the built server (MB.70): public, so a signed-out
// visitor is asked to sign in and brought back; signed in, the invited
// address, verified, is offered Accept, which lands an admin on /admin
// (claude-docs/components/invitation-acceptance.md). Who else is refused is
// the accept service's and acceptance story 08's. The invitations are
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

test(
  'a signed-out visitor is asked to sign in and brought back to the link',
  { tag: '@story-62' },
  async ({ page }) => {
    const path = await invite(`signed-out-${randomUUID()}${DOMAIN}`);

    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(path);
    // Nothing of the invitation before a session holds the link.
    await expect(page.getByRole('main').getByText(/admin/i)).toHaveCount(0);
    const signIn = page.getByRole('link', { name: 'Sign In' });
    await expect(signIn).toHaveAttribute('href', `/sign-in?next=${encodeURIComponent(path)}`);
    await assertNoAccessibilityViolations(page);
  },
);

test(
  'the invited account, verified, accepts and lands on /admin as an admin',
  { tag: '@story-62' },
  async ({ page }) => {
    const invited = `accepts-${randomUUID()}${DOMAIN}`;
    const path = await invite(invited);
    const { userId } = await signInAs(page, invited, ['microsoft'], 'user', {
      emailVerified: false,
    });
    // Confirmed since: the same account, verified, signed in afresh.
    await withSql((sql) => sql`update users set email_verified = true where id = ${userId}`);
    await signInAgainAs(page, userId);

    await page.goto(path);
    const accept = page.getByRole('button', { name: 'Accept Invitation' });
    await expect(accept).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await accept.click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
    const [row] = await withSql((sql) => sql`select role::text from users where id = ${userId}`);
    expect(row.role).toBe('admin');

    // A second use is refused: the page, and no Accept on it.
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeVisible();
    await expect(accept).toHaveCount(0);
  },
);

test(
  'the invited account accepts a coven’s invitation and lands in the coven',
  { tag: '@story-6' },
  async ({ page }) => {
    const invited = `joins-${randomUUID()}${DOMAIN}`;
    const slug = `fixture-invite-coven-${randomUUID().slice(0, 8)}`;
    const token = randomBytes(32).toString('base64url');
    const path = `/invite/${token}`;
    const { userId } = await signInAs(page, invited, ['microsoft'], 'user');
    await withSql(async (sql) => {
      const [admin] =
        await sql`select id from users where role = 'admin' order by created_at limit 1`;
      const [workspace] = await sql`
        insert into workspaces (name, slug, created_by, updated_by)
        values ('Fixture Invite Coven', ${slug}, ${admin.id}, ${admin.id}) returning id`;
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${admin.id}, 'owner', ${admin.id}, ${admin.id})`;
      await sql`
        insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by)
        values (${invited}, ${createHash('sha256').update(token).digest('hex')}, ${workspace.id},
          'member', ${admin.id}, ${admin.id})`;
    });

    await page.goto(path);
    const accept = page.getByRole('button', { name: 'Accept Invitation' });
    await expect(accept).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await accept.click();

    await expect(page).toHaveURL(new RegExp(`/coven/${slug}$`));
    const [row] = await withSql(
      (sql) => sql`
        select m.role::text, u.can_create_workspace from workspace_members m
        join users u on u.id = m.user_id
        where m.user_id = ${userId}`,
    );
    expect(row).toMatchObject({ role: 'member', can_create_workspace: true });
  },
);
