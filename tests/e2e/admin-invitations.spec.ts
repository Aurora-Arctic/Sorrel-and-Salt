import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';
import { signInAs } from './session';

// MB.70 on /admin/invitations, the People page's Invitations tab, against the
// built server: a non-admin's 403; an admin invites an address, the link
// reaches it through the transport (Mailpit), the pending invitation is listed
// with its reason, and Revoke withdraws it, which its link then refuses
// (claude-docs/components/admin-invitations.md).
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** This run's own address, so a retry or another worker cannot read its mail. */
const address = (local: string) => `${local}-${randomUUID()}@admin-invitations.test`;

/** The invitation's path from the mailed link: the build's origin is its fallback, not this server. */
async function mailedInvitePath(to: string): Promise<string> {
  const message = await latestMessageTo(to);
  const link = message.text.match(/https?:\/\/\S+\/invite\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error(`no invitation link in: ${message.text}`);
  return new URL(link).pathname;
}

async function pendingCount(email: string): Promise<number> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [{ count }] = await sql`
      select count(*)::int as count from invitations
      where email = ${email} and accepted_at is null and revoked_at is null
    `;
    return count as number;
  } finally {
    await sql.end();
  }
}

test('a signed-in non-admin is refused at /admin/invitations with the 403 page', async ({
  page,
}) => {
  await signInAs(page, address('not-an-admin'));

  const response = await page.goto('/admin/invitations?invite');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test(
  'an admin invites an address with a reason, mailed the link and listed as pending',
  { tag: '@story-62' },
  async ({ page }) => {
    const invited = address('invited');
    await signInAs(page, address('admin'), ['discord'], 'admin');
    await page.goto('/admin/invitations');

    const section = page.getByRole('region', { name: 'Admin Invitations' });
    // Invite Admin is the tab's action, beside the page's heading (MB.115).
    await page.getByRole('link', { name: 'Invite Admin' }).click();
    const dialog = page.getByRole('dialog', { name: 'Invite Admin' });
    const send = dialog.getByRole('button', { name: 'Send Invitation' });
    const email = dialog.getByRole('textbox', { name: 'Email Address' });
    // It opens on its first field (MB.115).
    await expect(email).toBeFocused();
    await expect(send).toBeDisabled();
    await email.fill(invited);
    // By role: "Reason" also names its info tip's button.
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('Curates the resins');
    await expect(send).toBeEnabled();
    await assertNoAccessibilityViolations(page);
    await send.click();

    await expect(section.getByRole('status')).toContainText(invited);
    const row = section.getByRole('row', { name: new RegExp(invited.replace(/[.]/g, '\\.')) });
    await expect(row).toContainText('Curates the resins');
    // The page answers no link: the mail is the only place it is.
    const path = await mailedInvitePath(invited);
    expect(await page.content()).not.toContain(path);
    await assertNoAccessibilityViolations(page);
  },
);

test(
  'an admin revokes a pending invitation after confirming, and its link is refused',
  { tag: '@story-62' },
  async ({ page }) => {
    const invited = address('withdrawn');
    await signInAs(page, address('admin'), ['discord'], 'admin');
    await page.goto('/admin/invitations');
    const section = page.getByRole('region', { name: 'Admin Invitations' });
    await page.getByRole('link', { name: 'Invite Admin' }).click();
    const dialog = page.getByRole('dialog', { name: 'Invite Admin' });
    await dialog.getByRole('textbox', { name: 'Email Address' }).fill(invited);
    await dialog.getByRole('button', { name: 'Send Invitation' }).click();
    const path = await mailedInvitePath(invited);

    await section.getByRole('button', { name: `Revoke the invitation to ${invited}` }).click();
    const confirm = page.getByRole('dialog', { name: 'Revoke Invitation' });
    await expect(confirm).toContainText(invited);
    await assertNoAccessibilityViolations(page);
    await confirm.getByRole('button', { name: 'Revoke' }).click();

    await expect(section.getByRole('row', { name: new RegExp(invited) })).toHaveCount(0);
    expect(await pendingCount(invited)).toBe(0);

    // Its link is refused: the page, and no Accept on it.
    await signInAs(page, invited);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  },
);
