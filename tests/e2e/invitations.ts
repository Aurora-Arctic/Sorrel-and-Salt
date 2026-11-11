import { expect, type Page } from '@playwright/test';
import { assertNoSidewaysScroll } from './axe';

/** From the coven's members or invitations page: opens the Invite dialog, sends an invitation and closes the dialog. */
export async function sendInvitationFromDialog(
  page: Page,
  email: string,
  role: 'Observer' | 'Practitioner',
): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Invite', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Email Address' }).fill(email);
  await dialog.getByRole('radio', { name: role }).check();
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
}

/**
 * Opens an invitation link that must be refused and returns the refusal's text. Nothing of the coven
 * shows, and the Accept button is absent. With `shape`, the page also keeps its heading and fits the width.
 */
export async function refusalAt(
  page: Page,
  path: string,
  covenName: string,
  { shape = false }: { shape?: boolean } = {},
): Promise<string> {
  await page.goto(path);
  if (shape)
    await expect(page.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeVisible();
  const refusal = page.getByRole('main').getByRole('alert');
  await expect(refusal).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(covenName);
  if (shape) await assertNoSidewaysScroll(page, { restore: true });
  return (await refusal.textContent()) ?? '';
}
