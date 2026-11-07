/**
 * The signed-in endpoints that check a password the account already holds, with the body field each reads;
 * the breached-password guard test reads this list, so a new endpoint is on it or fails that test.
 */
export const HELD_PASSWORD_FIELDS: Readonly<Record<string, string>> = {
  '/change-password': 'currentPassword',
  '/verify-password': 'password',
  '/delete-user': 'password',
  '/two-factor/enable': 'password',
  '/two-factor/disable': 'password',
  '/two-factor/get-totp-uri': 'password',
  '/two-factor/generate-backup-codes': 'password',
};
