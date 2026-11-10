import { beforeAll, describe, expect, it } from 'vitest';
import { findWorkspaceRole } from '@/db/repository';
import { CovenMoved, Forbidden } from '@/lib/errors';
import { membershipBySlug, renameWorkspace } from '@/modules/coven';
import { A, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

// An old address answers a member with where the coven is now, and a non-member with the bare refusal an address that
// never existed earns: whether a coven exists, or ever existed, is private to its members.

useRawClient();

const OLD_NAME = 'Fixture Oldname Coven';
const OLD_SLUG = 'fixture-oldname-coven';
const NEW_NAME = 'Fixture Newname Coven';
const NEW_SLUG = 'fixture-newname-coven';

let covenId: string;

beforeAll(async () => {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: OLD_NAME })), created_by: A.id, updated_by: A.id })}
    returning id`;
  covenId = row.id as string;
  await sql`
    insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
    values (${covenId}, ${OLD_SLUG}, ${A.id}, ${A.id})`;
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${covenId}, ${A.id}, 'owner', ${A.id}, ${A.id}), (${covenId}, ${C.id}, 'viewer', ${A.id}, ${A.id})`;
  await renameWorkspace(asUser(A), covenId, { name: NEW_NAME });
});

const failureOf = (promise: Promise<unknown>) => promise.catch((error: unknown) => error);

describe('membershipBySlug at an old address', () => {
  it('admits a member at the current address, as before', async () => {
    const { workspace } = await membershipBySlug(asUser(C), NEW_SLUG);

    expect(workspace.id).toBe(covenId);
  });

  it('tells a member, the least privileged seat among them, where the coven is now', async () => {
    // Precondition: the coven moved, so the old address is no coven's current one.
    expect((await sql`select slug from workspaces where id = ${covenId}`)[0]?.slug).toBe(NEW_SLUG);
    await expect(findWorkspaceRole(C.id, covenId)).resolves.toBe('viewer');

    const moved = await failureOf(membershipBySlug(asUser(C), OLD_SLUG));

    expect(moved).toBeInstanceOf(CovenMoved);
    expect(moved).not.toBeInstanceOf(Forbidden);
    expect((moved as CovenMoved).slug).toBe(NEW_SLUG);
  });

  it.each([
    ['a member of another coven', D],
    ['a site keeper with no seat', E],
  ])('refuses %s with the very refusal an address that never existed earns', async (_who, user) => {
    // Why the caller could have been told: the old address names a live coven, and a member is told where it went.
    await expect(findWorkspaceRole(user.id, covenId)).resolves.toBeUndefined();
    expect(await failureOf(membershipBySlug(asUser(A), OLD_SLUG))).toBeInstanceOf(CovenMoved);

    const stranger = await failureOf(membershipBySlug(asUser(user), OLD_SLUG));
    const unknown = await failureOf(membershipBySlug(asUser(user), 'fixture-never-a-coven'));

    expect(stranger).toBeInstanceOf(Forbidden);
    expect(stranger).not.toBeInstanceOf(CovenMoved);
    expect(stranger).toEqual(unknown);
  });

  it('refuses everyone at an old address once the coven is deleted', async () => {
    const [row] = await sql`
      insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Doomed Coven' })), created_by: A.id, updated_by: A.id })}
      returning id`;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${A.id}, 'owner', ${A.id}, ${A.id})`;
    await renameWorkspace(asUser(A), row.id, { name: 'Fixture Doomed Later' });
    expect(await failureOf(membershipBySlug(asUser(A), 'fixture-doomed-coven'))).toBeInstanceOf(
      CovenMoved,
    );
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${row.id}`;

    expect(await failureOf(membershipBySlug(asUser(A), 'fixture-doomed-coven'))).toBeInstanceOf(
      Forbidden,
    );
  });
});

const token = () => crypto.randomUUID().slice(0, 8);

async function covenWith(name: string, members: [string, string][]): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id, slug`;
  await sql`
    insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
    values (${row.id}, ${row.slug}, ${A.id}, ${A.id})`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

// Another coven may take an old address, and the redirect it gave ends (claude-docs/tasks/v1/m17.md, M17.23).
describe('membershipBySlug once another coven takes the old address', () => {
  it("refuses the old coven's member there as an unknown address, and admits the new holder's member", async () => {
    const t = token();
    const oldSlug = `fixture-left-${t}`;
    const moved = await covenWith(`Fixture Left ${t}`, [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);
    await renameWorkspace(asUser(A), moved, { name: `Fixture Gone On ${t}` });
    const claimer = await covenWith(`Fixture Arriving ${t}`, [[D.id, 'owner']]);
    // Precondition: before the claim the old address took C to the moved coven, and C holds no seat in the claimer.
    expect(await failureOf(membershipBySlug(asUser(C), oldSlug))).toBeInstanceOf(CovenMoved);
    await expect(findWorkspaceRole(C.id, claimer)).resolves.toBeUndefined();
    await expect(findWorkspaceRole(D.id, moved)).resolves.toBeUndefined();

    const claimed = await renameWorkspace(asUser(D), claimer, { name: `Fixture Left ${t}` });
    expect(claimed.slug).toBe(oldSlug);

    const refused = await failureOf(membershipBySlug(asUser(C), oldSlug));
    const unknown = await failureOf(membershipBySlug(asUser(C), `fixture-never-${t}`));
    expect(refused).toBeInstanceOf(Forbidden);
    expect(refused).not.toBeInstanceOf(CovenMoved);
    expect(refused).toEqual(unknown);
    expect((await membershipBySlug(asUser(D), oldSlug)).workspace.id).toBe(claimer);
  });

  it("keeps the old coven's member out after the new holder moves on, and sends the new holder's member on", async () => {
    const t = token();
    const oldSlug = `fixture-passed-${t}`;
    const moved = await covenWith(`Fixture Passed ${t}`, [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);
    await renameWorkspace(asUser(A), moved, { name: `Fixture Passed On ${t}` });
    expect(await failureOf(membershipBySlug(asUser(C), oldSlug))).toBeInstanceOf(CovenMoved);
    const claimer = await covenWith(`Fixture Borrower ${t}`, [[D.id, 'owner']]);
    expect((await renameWorkspace(asUser(D), claimer, { name: `Fixture Passed ${t}` })).slug).toBe(
      oldSlug,
    );

    const away = await renameWorkspace(asUser(D), claimer, { name: `Fixture Borrower Again ${t}` });

    const refused = await failureOf(membershipBySlug(asUser(C), oldSlug));
    expect(refused).toBeInstanceOf(Forbidden);
    expect(refused).not.toBeInstanceOf(CovenMoved);
    const sent = await failureOf(membershipBySlug(asUser(D), oldSlug));
    expect(sent).toBeInstanceOf(CovenMoved);
    expect((sent as CovenMoved).slug).toBe(away.slug);
  });
});

// A coven keeps one old address: the one it held just before its latest rename (claude-docs/tasks/v1/m17.md, M17.23).
describe('membershipBySlug after a second rename', () => {
  it('refuses a member at the first address as an unknown address, and still sends them on from the second', async () => {
    const t = token();
    const first = `fixture-first-${t}`;
    const second = `fixture-second-${t}`;
    const coven = await covenWith(`Fixture First ${t}`, [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);
    await renameWorkspace(asUser(A), coven, { name: `Fixture Second ${t}` });
    // Precondition: after one rename the first address took the member to the coven.
    expect(await failureOf(membershipBySlug(asUser(C), first))).toBeInstanceOf(CovenMoved);

    const third = await renameWorkspace(asUser(A), coven, { name: `Fixture Third ${t}` });

    const refused = await failureOf(membershipBySlug(asUser(C), first));
    const unknown = await failureOf(membershipBySlug(asUser(C), `fixture-never-${t}`));
    expect(refused).toBeInstanceOf(Forbidden);
    expect(refused).not.toBeInstanceOf(CovenMoved);
    expect(refused).toEqual(unknown);
    const sent = await failureOf(membershipBySlug(asUser(C), second));
    expect(sent).toBeInstanceOf(CovenMoved);
    expect((sent as CovenMoved).slug).toBe(third.slug);
  });
});
