import { beforeAll, describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership, listMembers, memberEmails, type WorkspaceRow } from '@/modules/coven';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

// A coven's members list (M6.11): its live seats, in the order they joined,
// each carrying the coven, to the roles holding `member: read` — owners and
// members, since M6.13. Every refusal names the coven
// directly, so it is a `Forbidden` rather than a row missing from a list.

const FIRST_PAGE = { limit: 26, inverted: false };

let coven: WorkspaceRow;

/** The coven as the parent field hands it over: the whole row. */
async function covenRow(id: string): Promise<WorkspaceRow> {
  const [row] = await sql<WorkspaceRow[]>`
    select id, name, slug,
      created_at as "createdAt", created_by as "createdBy",
      updated_at as "updatedAt", updated_by as "updatedBy",
      deleted_at as "deletedAt", deleted_by as "deletedBy"
    from workspaces where id = ${id}`;
  return row;
}

beforeAll(async () => {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Roll Coven' })), created_by: A.id, updated_by: A.id })}
    returning id`;
  // Joined out of id order, so the list's order is the joining date's: C
  // first, then A, then B. D held a seat and was removed.
  const seats: [string, string, string][] = [
    [C.id, 'viewer', '2026-01-01T00:00:00Z'],
    [A.id, 'owner', '2026-02-01T00:00:00Z'],
    [B.id, 'member', '2026-03-01T00:00:00Z'],
    [D.id, 'member', '2026-01-15T00:00:00Z'],
  ];
  for (const [userId, role, joinedAt] of seats) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, joined_at, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${joinedAt}, ${A.id}, ${A.id})`;
  }
  await sql`
    update workspace_members set deleted_at = now(), deleted_by = ${A.id}
    where workspace_id = ${row.id} and user_id = ${D.id}`;
  coven = await covenRow(row.id as string);
});

const summary = (entries: Awaited<ReturnType<typeof listMembers>>) =>
  entries.map(({ node }) => ({ userId: node.userId, role: node.role }));

describe('listMembers', () => {
  it("answers an owner the coven's live members in the order they joined", async () => {
    const entries = await listMembers(asUser(A), coven, FIRST_PAGE);

    expect(summary(entries)).toEqual([
      { userId: C.id, role: 'viewer' },
      { userId: A.id, role: 'owner' },
      { userId: B.id, role: 'member' },
    ]);
    // Each member carries the coven it is of, as `WorkspaceMember.workspace` reads it.
    expect(entries.every(({ node }) => node.workspace.id === coven.id)).toBe(true);
  });

  it('leaves out a removed member, whose seat is a tombstone', async () => {
    const [seat] = await sql`
      select deleted_at from workspace_members
      where workspace_id = ${coven.id} and user_id = ${D.id}`;
    expect(seat.deleted_at).not.toBeNull();

    const entries = await listMembers(asUser(A), coven, FIRST_PAGE);

    expect(entries.map(({ node }) => node.userId)).not.toContain(D.id);
  });

  it('walks the list a page at a time, each member once', async () => {
    const first = await listMembers(asUser(A), coven, { limit: 2, inverted: false });
    const rest = await listMembers(asUser(A), coven, {
      after: first[1].cursor,
      limit: 2,
      inverted: false,
    });

    expect([...first, ...rest].map(({ node }) => node.userId)).toEqual([C.id, A.id, B.id]);
  });

  it('lists the members to a member, who holds `member: read`', async () => {
    await expect(
      assertMembership(asUser(B), coven.id, { member: ['read'] }),
    ).resolves.toMatchObject({ role: 'member' });

    const entries = await listMembers(asUser(B), coven, FIRST_PAGE);

    expect(entries.map(({ node }) => node.userId)).toEqual([C.id, A.id, B.id]);
  });

  it('refuses a viewer, who does sit in the coven', async () => {
    // Why the refusal is the permission's: C holds a live seat, which admits
    // them to the coven's reads.
    await expect(
      assertMembership(asUser(C), coven.id, { workspace: ['read'] }),
    ).resolves.toMatchObject({ role: 'viewer' });

    await expect(listMembers(asUser(C), coven, FIRST_PAGE)).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a removed member, and an owner of another coven', async () => {
    // Why either could have been answered: D's seat is still a row here, and
    // A, who owns W, is answered W's members.
    const [seat] = await sql`
      select role from workspace_members where workspace_id = ${coven.id} and user_id = ${D.id}`;
    expect(seat.role).toBe('member');
    const w = await covenRow(WORKSPACE_W_ID);
    await expect(listMembers(asUser(A), w, FIRST_PAGE)).resolves.not.toHaveLength(0);

    await expect(listMembers(asUser(D), coven, FIRST_PAGE)).rejects.toBeInstanceOf(Forbidden);
    await expect(listMembers(asUser(D), w, FIRST_PAGE)).rejects.toBeInstanceOf(Forbidden);
  });
});

// The roll's addresses (M11.19): read from each member's own user row, so a
// changed address shows at once, and to owners alone, through a statement
// only they hold. Each refusal names the coven directly.
describe('memberEmails', () => {
  const ROLL = () => [A.id, B.id, C.id];

  it("answers an owner each member's address", async () => {
    const emails = await memberEmails(asUser(A), coven.id, ROLL());

    expect(emails).toEqual(
      expect.arrayContaining([
        { userId: A.id, address: A.email },
        { userId: B.id, address: B.email },
        { userId: C.id, address: C.email },
      ]),
    );
    expect(emails).toHaveLength(3);
  });

  it('reads the address off the user row as it stands now', async () => {
    await sql`update users set email = ${'changed-' + C.email} where id = ${C.id}`;
    try {
      const emails = await memberEmails(asUser(A), coven.id, [C.id]);
      expect(emails.map(({ address }) => address)).toEqual([`changed-${C.email}`]);
    } finally {
      await sql`update users set email = ${C.email} where id = ${C.id}`;
    }
  });

  it('answers no address for anyone outside the coven, or removed from it', async () => {
    // Why either could have been answered: E holds a user row with an
    // address, and D held a seat here, which is still a row.
    const [seat] = await sql`
      select role from workspace_members where workspace_id = ${coven.id} and user_id = ${D.id}`;
    expect(seat.role).toBe('member');

    const emails = await memberEmails(asUser(A), coven.id, [A.id, D.id, E.id]);

    expect(emails.map(({ userId }) => userId)).toEqual([A.id]);
  });

  it('asks nothing of the database for no ids', async () => {
    await expect(memberEmails(asUser(A), coven.id, [])).resolves.toEqual([]);
  });

  it('refuses a member, who may read the roll itself', async () => {
    // Why this could have been answered: B holds `member: read` and is
    // listed the roll, so only the owner-only statement refuses it.
    await expect(
      assertMembership(asUser(B), coven.id, { member: ['read'] }),
    ).resolves.toMatchObject({ role: 'member' });
    await expect(listMembers(asUser(B), coven, FIRST_PAGE)).resolves.toHaveLength(3);

    await expect(memberEmails(asUser(B), coven.id, ROLL())).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a viewer, a member of another coven, and a site admin in none', async () => {
    // Why each could have been answered: C sits here, D is a member of X,
    // and E's session carries the site role.
    await expect(
      assertMembership(asUser(C), coven.id, { workspace: ['read'] }),
    ).resolves.toMatchObject({ role: 'viewer' });
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { member: ['read'] }),
    ).resolves.toMatchObject({ role: 'member' });
    expect(asUser(E).role).toBe('admin');

    for (const caller of [C, D, E])
      await expect(memberEmails(asUser(caller), coven.id, ROLL())).rejects.toBeInstanceOf(
        Forbidden,
      );
  });

  it("gives an owner no other coven's addresses, under either coven's id", async () => {
    // Why this could have been answered: A owns W, and D is a live member of X.
    await expect(memberEmails(asUser(A), WORKSPACE_W_ID, [A.id])).resolves.toHaveLength(1);

    await expect(memberEmails(asUser(A), WORKSPACE_X_ID, [D.id])).rejects.toBeInstanceOf(Forbidden);
    await expect(memberEmails(asUser(A), WORKSPACE_W_ID, [D.id])).resolves.toEqual([]);
  });
});
