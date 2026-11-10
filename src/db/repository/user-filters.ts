import { notInArray, or, type SQL } from 'drizzle-orm';
import { users } from '../../modules/identity/schema/users';
import { SIGNED_OUT_SENDER_ID } from '../../lib/support-sender';
import { SYSTEM_ACTOR_ID } from '../../lib/system-actor';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { containsText } from './predicates';

/** The seeded accounts that stand in for no one: nobody signs in as them, and they hold no mailbox. */
export const STAND_IN_USER_IDS = [BOOTSTRAP_USER_ID, SYSTEM_ACTOR_ID, SIGNED_OUT_SENDER_ID];

/** The user is a person, not one of the stand-in accounts. */
export const notStandIn = notInArray(users.id, STAND_IN_USER_IDS);

/** The user's name or address holds `query` anywhere, case-insensitively. */
export function nameOrEmailHolds(query: string): SQL {
  return or(containsText(users.name, query), containsText(users.email, query)) as SQL;
}
