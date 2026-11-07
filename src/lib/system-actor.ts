import { SIGNED_OUT_SENDER_ID } from './support-sender';
// The seeded account that is the actor of a scheduled job's writes. It holds no seat, cannot create a coven and no sign-in reaches it.
export const SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-00000000a111';

/** Neither is a person, so nothing done to a person (a time-out, a pause) applies to them. */
export function isStandInAccount(userId: string): boolean {
  return userId === SYSTEM_ACTOR_ID || userId === SIGNED_OUT_SENDER_ID;
}
