import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import { membershipBySlug } from '@/modules/coven';
import { A, B, C, D, E, asUser } from '../../../support/as-user';

// The address names a workspace by a guess at its slug, so a stranger and a
// wrong slug must earn the same bare refusal: whether a coven exists is
// private (CLAUDE.md's domain invariants).

const W_SLUG = slugify('Whitethorn Coven');

describe('membershipBySlug', () => {
  it.each([
    ['owner', A],
    ['member', B],
    ['viewer', C],
  ] as const)('admits a %s with the workspace and their proof', async (role, user) => {
    const { workspace, membership } = await membershipBySlug(asUser(user), W_SLUG);

    expect(workspace.id).toBe(WORKSPACE_W_ID);
    expect(membership).toMatchObject({ workspaceId: WORKSPACE_W_ID, userId: user.id, role });
  });

  it('refuses a non-member of a workspace that exists', async () => {
    // Why D could have been admitted: the slug names a live workspace, and A's
    // own call finds it.
    await expect(membershipBySlug(asUser(A), W_SLUG)).resolves.toBeDefined();

    await expect(membershipBySlug(asUser(D), W_SLUG)).rejects.toThrow(Forbidden);
  });

  it('refuses a site admin who is in no workspace', async () => {
    expect(asUser(E).role).toBe('admin');
    await expect(membershipBySlug(asUser(E), W_SLUG)).rejects.toThrow(Forbidden);
  });

  it('refuses an unknown slug with the very refusal a non-member earns', async () => {
    const stranger = await membershipBySlug(asUser(D), W_SLUG).catch((error: unknown) => error);
    const unknown = await membershipBySlug(asUser(A), 'no-such-coven').catch(
      (error: unknown) => error,
    );

    expect(unknown).toBeInstanceOf(Forbidden);
    expect(unknown).toEqual(stranger);
  });
});
