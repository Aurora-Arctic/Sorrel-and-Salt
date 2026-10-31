import type { Locator } from '@playwright/test';

/**
 * Picks a mode in an admin support dialog's Send As chip: opens its menu, then clicks the option's label, since the
 * native radio is drawn invisible. The dialog opens on Internal Note.
 */
export async function sendAs(dialog: Locator, mode: 'Reply' | 'Internal Note'): Promise<void> {
  const group = dialog.getByRole('group', { name: 'Send As' });
  await group.locator('summary').click();
  await group
    .getByRole('radio', { name: mode })
    .locator('xpath=ancestor::label[1]')
    .click({ position: { x: 10, y: 10 } });
}
