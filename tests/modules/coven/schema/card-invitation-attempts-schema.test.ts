import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertCardAttempt } from '../../../support/db/insert-card-attempt';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { cardInvitationAttempts } from '@/modules/coven/schema/card-invitation-attempts';

// A refused open of a card link is one row per card, account and reason, with a count.

const OWN_COLUMNS = ['id', 'invitation_id', 'user_id', 'reason', 'attempts', 'last_attempted_at'];

const UNIQUE_INDEX = 'card_invitation_attempts_card_user_reason_unique';
const CARD_INDEX = 'card_invitation_attempts_invitation_idx';
const REASON_CHECK = 'card_invitation_attempts_reason_known';
const COUNT_CHECK = 'card_invitation_attempts_count_positive';

const ADMIN = FIXTURE_USERS.E.id;
const VISITOR = FIXTURE_USERS.D.id;
const OTHER = FIXTURE_USERS.B.id;

describe('card_invitation_attempts schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(cardInvitationAttempts);

  it('has its columns and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('declares both indexes partial on deleted_at', () => {
    expect(Object.keys(byIndexName).sort()).toEqual([UNIQUE_INDEX, CARD_INDEX]);
    expect(byIndexName[UNIQUE_INDEX].config.unique).toBe(true);
    expect(byIndexName[CARD_INDEX].config.unique).toBe(false);
    for (const name of Object.keys(byIndexName))
      expect(byIndexName[name].config.where).toBeDefined();
  });

  it('has foreign keys to the card and to the account', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([
      ['invitation_id', 'invitations'],
      ['user_id', 'users'],
    ]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A card, by the admin: no address, coven or role. */
async function card(hash = 'a'.repeat(64)): Promise<string> {
  const [row] = await sql`
    insert into invitations (kind, token_hash, created_by, updated_by)
    values ('card', ${hash}, ${ADMIN}, ${ADMIN})
    returning id
  `;
  return row.id as string;
}

describe('card_invitation_attempts table', () => {
  beforeEach(async () => {
    await sql`truncate card_invitation_attempts`;
    await sql`truncate invitations cascade`;
  });

  describe('the unique index', () => {
    it('refuses a second live row for the same card, account and reason', async () => {
      const invitationId = await card();
      await insertCardAttempt(sql, { invitationId, userId: VISITOR }, ADMIN);

      const error = await failureOf(
        insertCardAttempt(sql, { invitationId, userId: VISITOR }, ADMIN),
      );

      // 23505 is unique_violation, named: this index refused.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    // Why the refusal above could have been a blanket one: each of these differs in one key column and is let through.
    it('allows a different reason, account or card', async () => {
      const invitationId = await card();
      await insertCardAttempt(sql, { invitationId, userId: VISITOR }, ADMIN);

      await expect(
        insertCardAttempt(sql, { invitationId, userId: VISITOR, reason: 'expired' }, ADMIN),
      ).resolves.toBeDefined();
      await expect(
        insertCardAttempt(sql, { invitationId, userId: OTHER }, ADMIN),
      ).resolves.toBeDefined();
      await expect(
        insertCardAttempt(
          sql,
          { invitationId: await card('b'.repeat(64)), userId: VISITOR },
          ADMIN,
        ),
      ).resolves.toBeDefined();
    });

    it('allows a new row once the first is soft-deleted', async () => {
      const invitationId = await card();
      await insertCardAttempt(sql, { invitationId, userId: VISITOR, deleted: true }, ADMIN);

      await expect(
        insertCardAttempt(sql, { invitationId, userId: VISITOR }, ADMIN),
      ).resolves.toBeDefined();
    });
  });

  describe('the checks', () => {
    it('refuses an unknown reason', async () => {
      const invitationId = await card();

      const error = await failureOf(
        insertCardAttempt(sql, { invitationId, userId: VISITOR, reason: 'pending' }, ADMIN),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(REASON_CHECK);
    });

    it.each(['revoked', 'expired', 'accepted'])('accepts the reason %s', async (reason) => {
      const invitationId = await card();
      await expect(
        insertCardAttempt(sql, { invitationId, userId: VISITOR, reason }, ADMIN),
      ).resolves.toBeDefined();
    });

    it('refuses an attempts count below 1', async () => {
      const invitationId = await card();

      const error = await failureOf(
        insertCardAttempt(sql, { invitationId, userId: VISITOR, attempts: 0 }, ADMIN),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(COUNT_CHECK);
    });
  });
});
