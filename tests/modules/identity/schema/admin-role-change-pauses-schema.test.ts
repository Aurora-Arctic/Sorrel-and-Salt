import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, E, asUser } from '../../../support/as-user';
import { findOpenAdminRoleChangePause, withAudit, type AuditWriter } from '@/db/repository';
import { assertSiteAdmin } from '@/modules/identity';
import { adminRoleChangePauses } from '@/modules/identity/schema/admin-role-change-pauses';
import { users } from '@/modules/identity/schema/users';
import type { NamedWrites } from '@/db/types';
import type { PauseRow } from './types';

// MB.62: M2.9's pause switch, table half. One row per pause rather than one
// row of settings, so no migration has to seed a row it has no user to stamp
// with, and every pause keeps who began it and who ended it. The table task:
// MB.63's service is the first to write it
// (claude-docs/design-decisions/mb.62-pause-ledger.md).

const ENDED_BY_FK = 'admin_role_change_pauses_ended_by_users_id_fk';
const ENDED_TOGETHER = 'admin_role_change_pauses_ended_together';
const ONE_OPEN = 'admin_role_change_pauses_one_open';

describe('admin_role_change_pauses schema', () => {
  const { byName, byIndexName, foreignKeyByColumn, nonAuditForeignKeys, checks } =
    tableFacts(adminRoleChangePauses);

  it('has the ended pair and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'ended_at', 'ended_by', ...AUDIT_COLUMNS].sort(),
    );
  });

  // `created_by` and `created_at` are who paused and when; the ended pair is
  // who resumed and when, null while the pause holds.
  it('leaves the ended pair optional, ended_by pointing at users and nothing else of its own', () => {
    expect(byName.ended_at.getSQLType()).toBe('timestamp');
    expect(byName.ended_at.notNull).toBe(false);
    expect(byName.ended_by.notNull).toBe(false);
    expect(foreignKeyByColumn.ended_by.foreignTable).toBe(users);
    expect(foreignKeyByColumn.ended_by.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.ended_by.name).toBe(ENDED_BY_FK);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['ended_by']);
  });

  it('declares the pair check and the one-open index, and no other index', () => {
    expect(checks.map((check) => check.name)).toEqual([ENDED_TOGETHER]);
    expect(Object.keys(byIndexName)).toEqual([ONE_OPEN]);
  });
});

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

const ADMIN = E.id;

async function everyPause(): Promise<PauseRow[]> {
  return sql<PauseRow[]>`
    select created_by, updated_by, ended_by, ended_at is not null as ended
    from admin_role_change_pauses
    order by created_at, ended_at nulls last
  `;
}

function openPause() {
  return sql`
    insert into admin_role_change_pauses (created_by, updated_by)
    values (${ADMIN}, ${ADMIN})
  `;
}

function endedPause() {
  return sql`
    insert into admin_role_change_pauses (ended_at, ended_by, created_by, updated_by)
    values (now(), ${ADMIN}, ${ADMIN}, ${ADMIN})
  `;
}

async function emptied(): Promise<void> {
  await sql`truncate admin_role_change_pauses`;
}

// Before any block below empties the table, so it reads the template as cloned.
describe('the seeded database', () => {
  it('holds no pause: the migration seeds none, and nothing is paused until someone pauses', async () => {
    expect(await everyPause()).toEqual([]);
  });
});

describe('admin_role_change_pauses table', () => {
  beforeEach(emptied);

  it('carries the one-open index, unique and partial, and the pair check, in the catalogue', async () => {
    const index = await catalogue.indexRow('admin_role_change_pauses', ONE_OPEN);
    expect(index?.unique).toBe(true);
    expect(index?.predicate).toBe('((ended_at IS NULL) AND (deleted_at IS NULL))');

    const [check] = await sql<{ definition: string }[]>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid = 'admin_role_change_pauses'::regclass and conname = ${ENDED_TOGETHER}
    `;
    expect(check?.definition).toBe('CHECK (((ended_at IS NULL) = (ended_by IS NULL)))');
  });

  it('refuses a second open pause', async () => {
    await openPause();

    const second = await failureOf(openPause());

    // 23505 is unique_violation: the one-open index.
    expect(second.code).toBe('23505');
    expect(second.constraint_name).toBe(ONE_OPEN);
  });

  // The index's reach is the open pause alone: the history beside it is
  // unbounded, which is what makes it a ledger.
  it('takes any number of ended pauses beside the one open', async () => {
    await endedPause();
    await endedPause();
    await openPause();

    expect(await everyPause()).toHaveLength(3);
  });

  it('refuses an ended_at without ended_by, and an ended_by without ended_at', async () => {
    const noBy = await failureOf(sql`
      insert into admin_role_change_pauses (ended_at, created_by, updated_by)
      values (now(), ${ADMIN}, ${ADMIN})
    `);
    const noAt = await failureOf(sql`
      insert into admin_role_change_pauses (ended_by, created_by, updated_by)
      values (${ADMIN}, ${ADMIN}, ${ADMIN})
    `);

    // 23514 is check_violation.
    expect([noBy.code, noAt.code]).toEqual(['23514', '23514']);
    expect([noBy.constraint_name, noAt.constraint_name]).toEqual([ENDED_TOGETHER, ENDED_TOGETHER]);
  });

  it('refuses an ended_by naming no user', async () => {
    const nobody = await failureOf(sql`
      insert into admin_role_change_pauses (ended_at, ended_by, created_by, updated_by)
      values (now(), '00000000-0000-0000-0000-0000000000ff', ${ADMIN}, ${ADMIN})
    `);

    expect(nobody.code).toBe('23503');
  });
});

// The repository's surface is three named calls under the `SiteAdmin` proof:
// the open pause, opening one, and ending it. The table is marked
// `namedWrites` (MB.198), so every generic write is refused it at compile
// time: a pause cannot be backdated, reopened or deleted, and its ended pair
// is stamped from the session rather than passed.
describe('the repository', () => {
  const admin = assertSiteAdmin(asUser(E));

  beforeEach(emptied);

  it('reads no open pause, then the one opened, stamped from the session', async () => {
    expect(await findOpenAdminRoleChangePause(admin)).toBeUndefined();

    const opened = await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ createdBy: ADMIN, updatedBy: ADMIN, endedAt: null });
    expect(await findOpenAdminRoleChangePause(admin)).toEqual(opened[0]);
  });

  it('opens nothing while a pause is open, and returns no row to say so', async () => {
    await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    const again = await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    expect(again).toEqual([]);
    expect(await everyPause()).toHaveLength(1);
  });

  // A is no admin, but the writer stamps whoever the session names: the
  // stamps below can only have come from the session, not from E's proof.
  it('ends the open pause, stamping ended_by and updated_by from the session', async () => {
    const [opened] = await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    const ended = await withAudit(asUser(A), (write) => write.resumeAdminRoleChanges(admin));

    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({
      id: opened?.id,
      createdBy: ADMIN,
      updatedBy: A.id,
      endedBy: A.id,
    });
    expect(ended[0]?.endedAt).toBeInstanceOf(Date);
    expect(await findOpenAdminRoleChangePause(admin)).toBeUndefined();
  });

  it('ends nothing when no pause is open, and leaves an ended one as it was', async () => {
    await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));
    await withAudit(asUser(E), (write) => write.resumeAdminRoleChanges(admin));

    const again = await withAudit(asUser(A), (write) => write.resumeAdminRoleChanges(admin));

    expect(again).toEqual([]);
    expect(await everyPause()).toEqual([
      { created_by: ADMIN, updated_by: ADMIN, ended_by: ADMIN, ended: true },
    ]);
  });

  it('opens a fresh pause after one has ended, keeping the ended one', async () => {
    await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));
    await withAudit(asUser(E), (write) => write.resumeAdminRoleChanges(admin));

    await withAudit(asUser(E), (write) => write.pauseAdminRoleChanges(admin));

    expect((await everyPause()).map((row) => row.ended)).toEqual([true, false]);
  });

  // No body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('carries the namedWrites mark, and so is refused every generic write at compile time', () => {
    // The mark itself, as a type: a table that lost it fails this assignment.
    const marked: NamedWrites = adminRoleChangePauses;
    const id = ADMIN;
    const where = eq(adminRoleChangePauses.createdBy, id);

    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no generic insert, so a pause cannot open already ended.
        write.insert(adminRoleChangePauses, { endedAt: new Date(), endedBy: id }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no generic update, so the ended pair is the resume's to stamp.
        write.update(adminRoleChangePauses, { endedAt: null }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.updateById(adminRoleChangePauses, id, { endedBy: id }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no soft delete, though the table carries deleted_at.
        write.softDelete(adminRoleChangePauses, where),
      (write: AuditWriter) =>
        // @ts-expect-error — nor by id.
        write.softDeleteByIds(adminRoleChangePauses, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no hard delete, which deleted_at alone refuses too.
        write.delete(adminRoleChangePauses, where),
    ];

    // And nothing at runtime: the cast adds no property for drizzle-kit to see.
    expect(marked.$writes).toBeUndefined();
    expect(writes).toHaveLength(6);
  });
});
