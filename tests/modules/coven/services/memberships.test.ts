import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { membershipsOf } from '@/modules/coven';
import { A, B, D, E, asUser } from '../../../support/as-user';

// Whose covens a caller may list: their own, and nobody else's — a site admin
// included, since an admin reaches no workspace (CLAUDE.md's invariants). One
// answer per key, in key order, as a DataLoader batch needs; a refused key is
// an Error in its slot rather than a rejection of the whole batch.

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

  it('refuses a site admin asking after anyone else', async () => {
    // Why this could have succeeded: E's session carries the admin role, and D
    // holds a membership D's own call finds.
    expect(asUser(E).role).toBe('admin');
    const [dOwn] = await membershipsOf(asUser(D), [D.id]);
    expect(summary(dOwn)).toEqual([{ role: 'member', workspaceId: WORKSPACE_X_ID }]);

    const [answer] = await membershipsOf(asUser(E), [D.id]);

    expect(answer).toBeInstanceOf(Forbidden);
  });

  it('answers an empty list for a user in no workspace', async () => {
    await expect(membershipsOf(asUser(E), [E.id])).resolves.toEqual([[]]);
  });
});
