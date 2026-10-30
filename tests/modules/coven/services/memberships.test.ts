import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '@/db/bootstrap';
import { DEMO_COVEN_NAME } from '@/db/seed/demo-coven';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership, firstCovenSlugOf, membershipsOf } from '@/modules/coven';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Whose covens a caller may list: their own, and for a site admin anyone's, by workspace and role alone, since an admin still reaches nothing a coven holds.
// There is one answer per key, in key order, as a DataLoader batch needs; a refused key is an Error in its slot rather than a rejection of the whole batch.

const summary = (answer: Awaited<ReturnType<typeof membershipsOf>>[number]) =>
  answer instanceof Error
    ? answer
    : answer.map(({ role, workspace }) => ({ role, workspaceId: workspace.id }));

describe('membershipsOf', () => {
  it("answers the caller's own memberships, each with its workspace", async () => {
    const [own] = await membershipsOf(asUser(A), [A.id]);

    expect(summary(own)).toEqual([{ role: 'owner', workspaceId: WORKSPACE_W_ID }]);
    expect(own).toEqual([
      expect.objectContaining({ workspace: expect.objectContaining({ slug: expect.any(String) }) }),
    ]);
  });

  it("refuses another member's key in its own slot, leaving the caller's answered", async () => {
    // Why B's key could have been answered: B holds a membership, and B's own
    // call finds it.
    const [bOwn] = await membershipsOf(asUser(B), [B.id]);
    expect(summary(bOwn)).toEqual([{ role: 'member', workspaceId: WORKSPACE_W_ID }]);

    const [own, other] = await membershipsOf(asUser(A), [A.id, B.id]);

    expect(summary(own)).toEqual([{ role: 'owner', workspaceId: WORKSPACE_W_ID }]);
    expect(other).toBeInstanceOf(Forbidden);
  });

  it('answers a site admin asking after anyone, each with its workspace', async () => {
    // Why this is the admin branch and not a membership: E's session carries
    // the admin role, D holds a membership D's own call finds, and E is not a
    // member of that workspace.
    expect(asUser(E).role).toBe('admin');
    const [dOwn] = await membershipsOf(asUser(D), [D.id]);
    expect(summary(dOwn)).toEqual([{ role: 'member', workspaceId: WORKSPACE_X_ID }]);
    await expect(
      assertMembership(asUser(E), WORKSPACE_X_ID, { ingredient: ['read'] }),
    ).rejects.toBeInstanceOf(Forbidden);

    const [answer] = await membershipsOf(asUser(E), [D.id]);

    expect(summary(answer)).toEqual([{ role: 'member', workspaceId: WORKSPACE_X_ID }]);
    expect(answer).toEqual([
      expect.objectContaining({
        workspace: expect.objectContaining({ name: expect.any(String), slug: expect.any(String) }),
      }),
    ]);
  });

  it('answers a site admin a mixed batch of their own key and another’s', async () => {
    const [other, own] = await membershipsOf(asUser(E), [D.id, E.id]);

    expect(summary(other)).toEqual([{ role: 'member', workspaceId: WORKSPACE_X_ID }]);
    expect(own).toEqual([]);
  });

  it('answers an empty list for a user in no workspace', async () => {
    await expect(membershipsOf(asUser(E), [E.id])).resolves.toEqual([[]]);
  });
});

describe('firstCovenSlugOf', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  // The demo coven's name sorts ahead of "Whitethorn Coven" (W's name), so a plain name order would land A in the demo coven; this is what makes the first case prove the rule.
  async function seatInDemo(userId: string, role: 'viewer' | 'member') {
    await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}`;
    await sql`delete from workspaces where id = ${DEMO_WORKSPACE_ID}`;
    await sql`
      insert into workspaces (id, name, slug, demo, created_by, updated_by)
      values (${DEMO_WORKSPACE_ID}, ${DEMO_COVEN_NAME}, 'sorrel-salt-demo', true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    `;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${DEMO_WORKSPACE_ID}, ${userId}, ${role}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    `;
  }

  it("answers the user's own coven, not the demo coven that sorts ahead of it", async () => {
    await seatInDemo(A.id, 'viewer');
    const [own] = await membershipsOf(asUser(A), [A.id]);
    const names = (own as { workspace: { name: string } }[]).map(({ workspace }) => workspace.name);
    expect(names).toHaveLength(2);
    expect(
      DEMO_COVEN_NAME.localeCompare(names.find((name) => name !== DEMO_COVEN_NAME) as string),
    ).toBeLessThan(0);

    expect(await firstCovenSlugOf(asUser(A))).toBe(await slugOf(WORKSPACE_W_ID));
  });

  it('answers the demo coven when it is the only one', async () => {
    await seatInDemo(E.id, 'viewer');

    expect(await firstCovenSlugOf(asUser(E))).toBe('sorrel-salt-demo');
  });

  async function slugOf(id: string): Promise<string> {
    const [row] = await sql<{ slug: string }[]>`select slug from workspaces where id = ${id}`;
    return row.slug;
  }
});
