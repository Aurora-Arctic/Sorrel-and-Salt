import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import {
  liftUserAccessPause,
  listUserAccessPauses,
  pauseAdminRoleChanges,
  pauseUserAccess,
  standingAccessPause,
  standingAccessPausesOf,
} from '@/modules/identity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import { noPauseNotifier } from '../../../support/email-verification';

// An admin pauses a user's access, dated or open-ended, and lifts it early (claude-docs/auth/admin-bootstrap.md, "Pausing a user's
// access"). The sign-in refusal itself is tests/db/access-pause-sign-in.test.ts.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@access-pause.test';
const PRIMARY = '00000000-0000-0000-0000-0000000000b1';
const OTHER_ADMIN = '00000000-0000-0000-0000-0000000000b2';
const PRIMARY_EMAIL = `primary${DOMAIN}`;
const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };
const AS_OTHER_ADMIN = { id: OTHER_ADMIN, role: 'admin' as const };
const NOWHERE = '00000000-0000-0000-0000-00000000dead';
const TOKEN_PREFIX = 'access-pause-test-';

const inADay = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function insertAdmin(id: string, local: string): Promise<void> {
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${id}, 'Fixture Person', ${`${local}${DOMAIN}`}, true, 'admin', true, ${id}, ${id})
    `;
  });
}

async function giveSession(userId: string, suffix: string): Promise<void> {
  await sql`
    insert into sessions (token, user_id, expires_at, updated_at)
    values (${`${TOKEN_PREFIX}${suffix}`}, ${userId}, now() + interval '1 day', now())
  `;
}

async function sessionCount(userId: string): Promise<number> {
  const [{ count }] = await sql`
    select count(*)::int as count from sessions
    where user_id = ${userId} and token like ${`${TOKEN_PREFIX}%`}
  `;
  return count as number;
}

async function pauseRows(userId: string) {
  return sql`
    select until, note, created_by, updated_by, lifted_at, lifted_by
    from user_access_pauses where user_id = ${userId} order by created_at
  `;
}

beforeEach(async () => {
  await sql`truncate user_access_pauses`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from sessions where token like ${`${TOKEN_PREFIX}%`}`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
  });
  await insertAdmin(PRIMARY, 'primary');
  await insertAdmin(OTHER_ADMIN, 'other');
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** The error a call rejects with, so a test can read its class and message together. */
async function refusalOf(call: Promise<unknown>): Promise<Error> {
  const error = await call.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  if (!(error instanceof Error)) throw new Error('expected the call to be refused');
  return error;
}

const issuesOf = (error: Error) => (error as ValidationError).issues;

describe('pauseUserAccess', () => {
  it('pauses a user until a time, with a note, stamped from the session, and ends every session they hold', async () => {
    await giveSession(A.id, 'a-1');
    await giveSession(A.id, 'a-2');
    await giveSession(B.id, 'b');
    const until = inADay();

    const row = await pauseUserAccess(asUser(E), A.id, until, '  Testnote  ', noPauseNotifier);

    expect(row).toMatchObject({ userId: A.id, until, note: 'Testnote', liftedAt: null });
    expect(await pauseRows(A.id)).toEqual([
      {
        until,
        note: 'Testnote',
        created_by: E.id,
        updated_by: E.id,
        lifted_at: null,
        lifted_by: null,
      },
    ]);
    expect(await standingAccessPause(A.id)).toEqual(row);
    expect(await sessionCount(A.id)).toBe(0);
    expect(await sessionCount(B.id)).toBe(1);
  });

  it('pauses with no end date when until is left out', async () => {
    const row = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);

    expect(row).toMatchObject({ userId: A.id, until: null, note: 'Testnote' });
    expect(await standingAccessPause(A.id)).toEqual(row);
  });

  it.each([
    ['a dated', inADay],
    ['an open-ended', () => null],
  ])(
    'refuses %s pause with a missing or blank note, saying why, writing nothing',
    async (_kind, until) => {
      await giveSession(A.id, 'a');

      for (const note of [undefined, null, '', '  \n  ']) {
        const error = await refusalOf(
          pauseUserAccess(asUser(E), A.id, until(), note, noPauseNotifier),
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect(issuesOf(error)).toEqual([{ path: ['note'], message: 'Write a note saying why' }]);
        expect(error.message).toBe('Write a note saying why');
      }
      expect(await pauseRows(A.id)).toEqual([]);
      expect(await sessionCount(A.id)).toBe(1);
      // The precondition: the same pause with a note is set.
      await pauseUserAccess(asUser(E), A.id, until(), 'Testnote', noPauseNotifier);
      expect(await pauseRows(A.id)).toHaveLength(1);
    },
  );

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])(
    'refuses %s with Forbidden, by the paused user’s id, writing nothing',
    async (_who, caller) => {
      await giveSession(A.id, 'a');

      const error = await refusalOf(
        pauseUserAccess(asUser(caller), A.id, inADay(), 'Testnote', noPauseNotifier),
      );

      expect(error).toBeInstanceOf(Forbidden);
      expect(await pauseRows(A.id)).toEqual([]);
      expect(await sessionCount(A.id)).toBe(1);
      // The precondition: the same call by an admin pauses A, so the role is what refused it.
      await pauseUserAccess(asUser(E), A.id, inADay(), 'Testnote', noPauseNotifier);
      expect(await pauseRows(A.id)).toHaveLength(1);
    },
  );

  it('refuses to pause the primary admin, saying why', async () => {
    const error = await refusalOf(
      pauseUserAccess(asUser(E), PRIMARY, null, 'Testnote', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.message).toBe('The primary admin’s access cannot be paused');
    expect(await pauseRows(PRIMARY)).toEqual([]);
    // The precondition: once ADMIN_BOOTSTRAP_EMAIL names another address, the same admin is pausable.
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `elsewhere${DOMAIN}`);
    await pauseUserAccess(asUser(E), PRIMARY, null, 'Testnote', noPauseNotifier);
    expect(await pauseRows(PRIMARY)).toHaveLength(1);
  });

  it.each([
    ['the System account', SYSTEM_ACTOR_ID],
    ['the signed-out sender account', SIGNED_OUT_SENDER_ID],
  ])('refuses to pause %s, which is not a person, saying why', async (_label, accountId) => {
    // Why this could have succeeded: the account is a live user, which an admin may pause, and the call is the same one that pauses a person.
    expect(
      await sql`select id from users where id = ${accountId} and deleted_at is null`,
    ).toHaveLength(1);
    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);
    expect(await pauseRows(A.id)).toHaveLength(1);

    const error = await refusalOf(
      pauseUserAccess(asUser(E), accountId, null, 'Testnote', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.message).toBe('This account is not a person, so its access cannot be paused');
    expect(await pauseRows(accountId)).toEqual([]);
  });

  it('refuses an admin pausing themselves, saying why', async () => {
    const error = await refusalOf(
      pauseUserAccess(asUser(E), E.id, null, 'Testnote', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.message).toBe('You cannot pause your own access');
    expect(await pauseRows(E.id)).toEqual([]);
    // The precondition: another admin may pause the same account.
    await pauseUserAccess(asUser(AS_OTHER_ADMIN), E.id, null, 'Testnote', noPauseNotifier);
    expect(await pauseRows(E.id)).toHaveLength(1);
  });

  it('refuses a time that has passed, and accepts one ahead', async () => {
    const error = await refusalOf(
      pauseUserAccess(asUser(E), A.id, new Date(Date.now() - 1000), 'Testnote', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(issuesOf(error)).toEqual([{ path: ['until'], message: 'Choose a time in the future' }]);
    // The sentence the browser shows: the admin's form names no field, so it says the error's message.
    expect(error.message).toBe('Choose a time in the future');
    expect(await pauseRows(A.id)).toEqual([]);
    await pauseUserAccess(asUser(E), A.id, inADay(), 'Testnote', noPauseNotifier);
    expect(await pauseRows(A.id)).toHaveLength(1);
  });

  it('accepts a note of 500 characters and refuses one of 501', async () => {
    const error = await refusalOf(
      pauseUserAccess(asUser(E), A.id, null, 'n'.repeat(501), noPauseNotifier),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(issuesOf(error)).toEqual([
      { path: ['note'], message: 'Keep the note to 500 characters' },
    ]);
    expect(error.message).toBe('Keep the note to 500 characters');
    expect(await pauseRows(A.id)).toEqual([]);
    const row = await pauseUserAccess(asUser(E), A.id, null, 'n'.repeat(500), noPauseNotifier);
    expect(row.note).toHaveLength(500);
  });

  it('answers NotFound for an id that names no user, and refuses a malformed id', async () => {
    expect(
      await refusalOf(pauseUserAccess(asUser(E), NOWHERE, null, 'Testnote', noPauseNotifier)),
    ).toBeInstanceOf(NotFound);
    expect(
      await refusalOf(pauseUserAccess(asUser(E), 'not-an-id', null, 'Testnote', noPauseNotifier)),
    ).toBeInstanceOf(ValidationError);
  });

  it('refuses a user already paused, saying to lift the pause first, and pauses again once it is lifted', async () => {
    const first = await pauseUserAccess(asUser(E), A.id, inADay(), 'First', noPauseNotifier);

    const error = await refusalOf(
      pauseUserAccess(asUser(E), A.id, null, 'Second', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(issuesOf(error)).toEqual([
      { path: ['userId'], message: 'This user is already paused; lift the pause first' },
    ]);
    expect(error.message).toBe('This user is already paused; lift the pause first');
    expect(await standingAccessPause(A.id)).toEqual(first);
    await liftUserAccessPause(asUser(E), A.id);
    const second = await pauseUserAccess(asUser(E), A.id, null, 'Second', noPauseNotifier);
    expect(await standingAccessPause(A.id)).toEqual(second);
  });

  it('pauses again over a dated pause that has run out, closing the old row', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${A.id}, 'Testnote', now() - interval '1 minute', ${E.id}, ${E.id})
    `;
    // The precondition: the old row is live, holding the one live slot, but no longer stands.
    expect(await standingAccessPause(A.id)).toBeUndefined();

    const row = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);

    expect(await standingAccessPause(A.id)).toEqual(row);
    const rows = await pauseRows(A.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.lifted_by).toBe(E.id);
  });

  it('refuses pausing another admin while admin changes are paused, and lets the primary admin', async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));

    const error = await refusalOf(
      pauseUserAccess(asUser(E), OTHER_ADMIN, null, 'Testnote', noPauseNotifier),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.message).toBe(
      'The primary admin has paused admin changes. Ask them to resume changes.',
    );
    expect(await pauseRows(OTHER_ADMIN)).toEqual([]);
    // A plain user is not an admin change, so the switch leaves pausing them open.
    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);
    await pauseUserAccess(asUser(AS_PRIMARY), OTHER_ADMIN, null, 'Testnote', noPauseNotifier);
    expect(await pauseRows(OTHER_ADMIN)).toHaveLength(1);
  });
});

describe('liftUserAccessPause', () => {
  it('lifts the standing pause, stamping who lifted it, after which none stands', async () => {
    const set = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);

    const lifted = await liftUserAccessPause(asUser(AS_OTHER_ADMIN), A.id);

    expect(lifted).toMatchObject({ id: set.id, liftedBy: OTHER_ADMIN, updatedBy: OTHER_ADMIN });
    expect(lifted?.liftedAt).toBeInstanceOf(Date);
    expect(await standingAccessPause(A.id)).toBeUndefined();
  });

  it('answers NotFound when no pause stands, a run-out one included, and changes nothing', async () => {
    await sql`
      insert into user_access_pauses (user_id, note, until, created_by, updated_by)
      values (${A.id}, 'Testnote', now() - interval '1 minute', ${E.id}, ${E.id})
    `;

    const error = await refusalOf(liftUserAccessPause(asUser(E), A.id));

    expect(error).toBeInstanceOf(NotFound);
    expect(error.message).toBe('No pause stands on this user');
    expect((await pauseRows(A.id))[0]?.lifted_at).toBeNull();
  });

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])(
    'refuses %s with Forbidden, by the paused user’s id, leaving the pause standing',
    async (_who, caller) => {
      const set = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);

      const error = await refusalOf(liftUserAccessPause(asUser(caller), A.id));

      expect(error).toBeInstanceOf(Forbidden);
      expect(await standingAccessPause(A.id)).toEqual(set);
      // The precondition: the same call by an admin lifts it.
      expect(await liftUserAccessPause(asUser(E), A.id)).toMatchObject({ id: set.id });
    },
  );

  it('answers NotFound for an id that names no user', async () => {
    expect(await refusalOf(liftUserAccessPause(asUser(E), NOWHERE))).toBeInstanceOf(NotFound);
  });
});

describe('listUserAccessPauses', () => {
  const firstPage = { limit: 25, inverted: false };
  const nodes = async (caller: Parameters<typeof asUser>[0], limit = 25) =>
    (await listUserAccessPauses(asUser(caller), A.id, { ...firstPage, limit })).map(
      (entry) => entry.node,
    );

  it('pages a user’s pauses newest first, lifted and standing alike, and no other user’s', async () => {
    const lifted = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);
    await liftUserAccessPause(asUser(E), A.id);
    const standing = await pauseUserAccess(asUser(E), A.id, inADay(), 'Testnote', noPauseNotifier);
    await pauseUserAccess(asUser(E), B.id, null, 'Testnote', noPauseNotifier);

    expect((await nodes(E)).map((row) => row.id)).toEqual([standing.id, lifted.id]);
    expect((await nodes(E, 1)).map((row) => row.id)).toEqual([standing.id]);
    const [, after] = await listUserAccessPauses(asUser(E), A.id, firstPage);
    const next = await listUserAccessPauses(asUser(E), A.id, {
      ...firstPage,
      after: after?.cursor,
    });
    expect(next).toEqual([]);
  });

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])('refuses %s with Forbidden, by the paused user’s id', async (_who, caller) => {
    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);
    // The precondition: the same read by an admin answers the pause.
    expect(await nodes(E)).toHaveLength(1);

    expect(await refusalOf(listUserAccessPauses(asUser(caller), A.id, firstPage))).toBeInstanceOf(
      Forbidden,
    );
  });

  it('refuses a malformed id', async () => {
    expect(await refusalOf(listUserAccessPauses(asUser(E), 'not-an-id', firstPage))).toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('standingAccessPausesOf', () => {
  it('answers each user’s standing pause in the order asked, and none where none stands', async () => {
    const standing = await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);

    const answered = await standingAccessPausesOf(asUser(E), [B.id, A.id]);

    expect(answered.map((row) => row?.id)).toEqual([undefined, standing.id]);
  });

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])('refuses %s with Forbidden', async (_who, caller) => {
    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', noPauseNotifier);
    // The precondition: the same read by an admin answers the pause.
    expect((await standingAccessPausesOf(asUser(E), [A.id]))[0]).toBeDefined();

    expect(await refusalOf(standingAccessPausesOf(asUser(caller), [A.id]))).toBeInstanceOf(
      Forbidden,
    );
  });
});
