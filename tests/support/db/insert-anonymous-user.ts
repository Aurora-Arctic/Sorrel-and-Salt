import { randomBytes, randomUUID } from 'node:crypto';
import type postgres from 'postgres';

// The one way a test seeds the provisional account a signed-out send mints, without minting it: raw, as Better Auth's
// anonymous plugin would leave the row, so setup does not depend on the send or on the plugin
// (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** An anonymous account as the plugin writes it, created `createdAgo` before now. */
export interface AnonymousUserFixture {
  /** A Postgres interval, `'8 days'`; the account is created now when absent. */
  createdAgo?: string;
  /** Written as a normal account instead, as one that linked would be. */
  anonymous?: boolean;
  /** Also writes one live session for it. */
  withSession?: boolean;
}

/** Writes the account, stamped by itself, and returns its id. */
export async function insertAnonymousUser(
  sql: postgres.Sql,
  { createdAgo = '0 seconds', anonymous = true, withSession = false }: AnonymousUserFixture = {},
): Promise<string> {
  const id = randomUUID();
  await sql`
    insert into users (id, name, email, email_verified, is_anonymous, created_at, updated_at, created_by, updated_by)
    values (${id}, 'Anonymous', ${`temp-${id}@anonymous.test`}, false, ${anonymous},
      now() - ${createdAgo}::interval, now() - ${createdAgo}::interval, ${id}, ${id})
  `;
  if (withSession) {
    await sql`
      insert into sessions (expires_at, token, updated_at, user_id)
      values (now() + interval '7 days', ${randomBytes(16).toString('hex')}, now(), ${id})
    `;
  }
  return id;
}

/** A stand-in for the minter a signed-out send is given, writing the row Better Auth's plugin would; `minted` lists its ids. */
export function anonymousMinter(sql: postgres.Sql): {
  mint: () => Promise<string>;
  minted: string[];
} {
  const minted: string[] = [];
  return {
    minted,
    mint: async () => {
      const id = await insertAnonymousUser(sql);
      minted.push(id);
      return id;
    },
  };
}
