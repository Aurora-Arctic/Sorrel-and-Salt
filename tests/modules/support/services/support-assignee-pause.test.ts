import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { readAssignees } from '@/app/(shell)/keepers/support/reads';
import { ValidationError } from '@/lib/errors';
import { liftUserAccessPause, standingAccessPause } from '@/modules/identity';
import { assignSupportRequest } from '@/modules/support';
import { C, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import { insertSupportRequest } from '../../../support/db/insert-support-request';

// A curator or keeper whose site access is paused takes no support request, by id or from the picker, and does again once
// the pause ends (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const ROLES = [
  { role: 'curator', title: 'curator' },
  { role: 'admin', title: 'keeper' },
] as const;

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`truncate user_access_pauses`;
});

afterEach(async () => {
  await sql`truncate user_access_pauses`;
  await setRoleOfF('curator');
});

// F is the seed's curator; as a keeper they are the case of a second keeper, whom E may pause.
async function setRoleOfF(role: (typeof ROLES)[number]['role']): Promise<void> {
  await asManualFix(sql, (tx) => tx`update users set role = ${role} where id = ${F.id}`);
}

async function roleOfF(): Promise<string> {
  const [row] = await sql`select role from users where id = ${F.id} and deleted_at is null`;
  return row!.role as string;
}

// Raw, as setup: the pause service would also end F's sessions and start a mail, neither of which is under test.
async function pauseF(): Promise<void> {
  await sql`
    insert into user_access_pauses (user_id, until, note, created_by, updated_by)
    values (${F.id}, null, 'Fixture pause note', ${E.id}, ${E.id})
  `;
}

async function assignedTo(requestId: string): Promise<string | null> {
  const [row] = await sql`select assigned_to from support_requests where id = ${requestId}`;
  return row!.assigned_to as string | null;
}

const assigneeIds = async () => (await readAssignees(asUser(E))).map((person) => person.id);

describe('assignSupportRequest to a paused curator or keeper', () => {
  it.each(ROLES)(
    'refuses by id to assign a request to a paused $title, on the assignee, and assigns them once the pause is lifted',
    async ({ role }) => {
      await setRoleOfF(role);
      const requestId = await insertSupportRequest(sql, { createdBy: C.id });
      await pauseF();

      // The preconditions: F holds a role a request may be assigned to, and the pause stands on them.
      expect(await roleOfF()).toBe(role);
      expect(await standingAccessPause(F.id)).toMatchObject({ userId: F.id, liftedAt: null });

      const refusal = await assignSupportRequest(asUser(E), requestId, F.id).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(refusal).toBeInstanceOf(ValidationError);
      expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([
        ['assigneeId'],
      ]);
      expect(await assignedTo(requestId)).toBeNull();

      await liftUserAccessPause(asUser(E), F.id);
      expect(await standingAccessPause(F.id)).toBeUndefined();

      expect((await assignSupportRequest(asUser(E), requestId, F.id)).assignedTo).toBe(F.id);
      expect(await assignedTo(requestId)).toBe(F.id);
    },
  );
});

describe('the support assignee picker', () => {
  it.each(ROLES)(
    'offers no paused $title, while it still offers the unpaused keeper, and offers them again once the pause is lifted',
    async ({ role }) => {
      await setRoleOfF(role);
      // The precondition: unpaused, F is offered beside E, so the list is not empty for some other reason.
      expect(await roleOfF()).toBe(role);
      expect(await assigneeIds()).toEqual(expect.arrayContaining([E.id, F.id]));

      await pauseF();
      expect(await standingAccessPause(F.id)).toMatchObject({ userId: F.id, liftedAt: null });

      const offered = await assigneeIds();
      expect(offered).not.toContain(F.id);
      expect(offered).toContain(E.id);

      await liftUserAccessPause(asUser(E), F.id);
      expect(await assigneeIds()).toEqual(expect.arrayContaining([E.id, F.id]));
    },
  );
});
