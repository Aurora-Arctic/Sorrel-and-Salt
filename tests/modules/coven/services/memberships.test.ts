import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '@/db/bootstrap';
import { DEMO_COVEN_NAME } from '@/db/seed/demo-coven';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership, firstCovenSlugOf, membershipsOf } from '@/modules/coven';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

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
    // Why B's key could have been answered: B holds a membership, and B's own call finds it.
    const [bOwn] = await membershipsOf(asUser(B), [B.id]);
    expect(summary(bOwn)).toEqual([{ role: 'member', workspaceId: WORKSPACE_W_ID }]);

    const [own, other] = await membershipsOf(asUser(A), [A.id, B.id]);

    expect(summary(own)).toEqual([{ role: 'owner', workspaceId: WORKSPACE_W_ID }]);
    expect(other).toBeInstanceOf(Forbidden);
  });

  it('answers a site keeper asking after anyone, each with its workspace', async () => {
    // Why this is the admin branch: E's session carries the admin role, and D's membership is one E is not a member of.
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

  it('answers a site keeper a mixed batch of their own key and another’s', async () => {
    const [other, own] = await membershipsOf(asUser(E), [D.id, E.id]);

    expect(summary(other)).toEqual([{ role: 'member', workspaceId: WORKSPACE_X_ID }]);
    expect(own).toEqual([]);
  });

  it('answers an empty list for a user in no workspace', async () => {
    await expect(membershipsOf(asUser(E), [E.id])).resolves.toEqual([[]]);
  });
});

describe('membershipsOf: the pause on each seat', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  // The shell marks a paused coven and hides its writes from this answer, so each membership carries the pause standing on it.
  it("carries a standing pause on the caller's own seat, and none where none stands", async () => {
    const [before] = await membershipsOf(asUser(B), [B.id]);
    expect(before).toEqual([expect.objectContaining({ workspaceId: WORKSPACE_W_ID, pause: null })]);

    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${B.id}, '2099-01-01T00:00:00Z', ${A.id}, ${A.id})
    `;
    try {
      const [paused] = await membershipsOf(asUser(B), [B.id]);
      expect(paused).toEqual([
        expect.objectContaining({
          workspaceId: WORKSPACE_W_ID,
          pause: { until: new Date('2099-01-01T00:00:00Z') },
        }),
      ]);
    } finally {
      await sql`delete from workspace_member_pauses where user_id = ${B.id}`;
    }
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

  it('passes over a coven whose access is paused, for the next one the user can open', async () => {
    await seatInDemo(B.id, 'viewer');
    // Why W could have been the answer: W is B's own coven, and the demo coven sorts last.
    expect(await firstCovenSlugOf(asUser(B))).toBe(await slugOf(WORKSPACE_W_ID));
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${B.id}, null, ${A.id}, ${A.id})
    `;

    expect(await firstCovenSlugOf(asUser(B))).toBe('sorrel-salt-demo');
  });

  it('answers the paused coven when it is the only one, whose paused page offers Leave', async () => {
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
      values (${WORKSPACE_X_ID}, ${D.id}, null, ${D.id}, ${D.id})
    `;

    expect(await firstCovenSlugOf(asUser(D))).toBe(await slugOf(WORKSPACE_X_ID));
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
