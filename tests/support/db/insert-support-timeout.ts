import type postgres from 'postgres';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { addressCountKey } from '@/lib/send-count-key';

// The one raw way a test seeds a keeper's support time-out on a sender, without the time-out service, so setup writes no
// audit and starts no mail (claude-docs/testing/fixture-factories.md, "Fixture factories").

export interface SupportTimeoutFixture {
  /** A Postgres interval from now, such as `'2 days'`; negative for a time-out that has run out. */
  endsIn?: string | null;
  lifted?: boolean;
  address?: string;
}

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
