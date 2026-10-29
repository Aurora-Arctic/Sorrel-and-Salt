import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership, membershipsOf } from '@/modules/coven';
import { A, B, D, E, asUser } from '../../../support/as-user';

// Whose covens a caller may list: their own, and for a site admin anyone's, by
// workspace and role alone — an admin still reaches nothing a coven
// holds. One answer per key, in key order, as a DataLoader batch needs; a
// refused key is an Error in its slot rather than a rejection of the whole batch.

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
