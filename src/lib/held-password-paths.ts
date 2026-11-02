/**
 * The signed-in endpoints that check a password the account already holds, each with the body field it reads it from.
 * A wrong password at any of them is a guess at the same password a sign-in takes, so the auth hooks count it toward the
 * account's lock and hold it while the lock is on; the breached-password guard test reads this list, so an endpoint that
 * takes a held password is on it or fails that test.
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
