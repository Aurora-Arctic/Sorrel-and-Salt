import type postgres from 'postgres';

// The one way a test seeds a refused card open it is not testing the writing of: raw, as `insertStock` is,
// so setup does not depend on the attempts service (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** One account's refused opens of one card, for one reason. */
export interface CardAttemptFixture {
  invitationId: string;
  userId: string;
  reason?: string;
  attempts?: number;
  /** Written already soft-deleted, by `author`. */
  deleted?: boolean;
}

/** Writes `attempt`'s row stamped by `author` and returns its id. */
export async function insertCardAttempt(
  sql: postgres.Sql,
  attempt: CardAttemptFixture,
  author: string,
): Promise<string> {
  const { invitationId, userId, reason = 'revoked', attempts = 1, deleted = false } = attempt;
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx`
      insert into card_invitation_attempts ${tx({
        invitation_id: invitationId,
        user_id: userId,
        reason,
        attempts,
        created_by: author,
        updated_by: author,
        ...(deleted ? { deleted_at: new Date(), deleted_by: author } : {}),
      })}
      returning id
    `;
    return row.id as string;
  });
}
