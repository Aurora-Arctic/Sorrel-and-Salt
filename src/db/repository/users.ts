import { eq } from 'drizzle-orm';
import { users } from '../../modules/identity/schema/users';
import { findMany } from './finders';

/**
 * The live row holding this address, or `undefined`. Compared lower-cased,
 * which `users_email_lower_case` holds every row to. The third read that takes
 * no proof, for the reason the first two do: an address is claimed site-wide,
 * so there is no workspace to hold a proof for. The service calling it decides
 * what a hit means; the index's export list is pinned, so a fourth is a
 * decision.
 */
export async function findUserByEmail(
  email: string,
): Promise<(typeof users)['$inferSelect'] | undefined> {
  const [row] = await findMany(users, eq(users.email, email.toLowerCase()));
  return row;
}
