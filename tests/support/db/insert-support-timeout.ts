import type postgres from 'postgres';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { addressCountKey } from '@/lib/send-count-key';

// The one raw way a test seeds a keeper's support time-out on a sender, without the time-out service, so setup writes no
// audit and starts no mail (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** A time-out as a keeper left it. */
export interface SupportTimeoutFixture {
  /** A Postgres interval from now, `'2 days'`, or a negative one for a time-out that has run out; null for no end date. */
  endsIn?: string | null;
  /** Lifted by the keeper, so it no longer stands. */
  lifted?: boolean;
  /** The sender's address, stored as its HMAC key, so the time-out also binds the address; none when absent. */
  address?: string;
}

/** Writes the time-out on `userId`, or on the address alone when `userId` is null, stamped by keeper E, and returns its id. */
export async function insertSupportTimeout(
  sql: postgres.Sql,
  userId: string | null,
  { endsIn = null, lifted = false, address }: SupportTimeoutFixture = {},
): Promise<string> {
  const keeper = FIXTURE_USERS.E.id;
  const [row] = await sql`
    insert into support_timeouts (user_id, address_key, until, note, lifted_at, created_by, updated_by)
    values (${userId}, ${address === undefined ? null : addressCountKey(address)},
      ${endsIn === null ? null : sql`now() + ${endsIn}::interval`}, 'Fixture time-out note',
      ${lifted ? sql`now()` : null}, ${keeper}, ${keeper})
    returning id`;
  return row!.id as string;
}
