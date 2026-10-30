import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import { membershipBySlug } from '@/modules/coven';
import { A, C, D, asUser } from '../../../support/as-user';

// The address names a workspace by a guess at its slug, so a stranger and a
// wrong slug must earn the same bare refusal: whether a coven exists is
// private (CLAUDE.md's domain invariants).

const W_SLUG = slugify('Whitethorn Coven');

describe('membershipBySlug', () => {
  // The least privileged seat; membership.test.ts proves the role on the proof for the others.
  it('admits a viewer with the workspace and their proof', async () => {
    const { workspace, membership } = await membershipBySlug(asUser(C), W_SLUG);

    expect(workspace.id).toBe(WORKSPACE_W_ID);
    expect(membership).toMatchObject({ workspaceId: WORKSPACE_W_ID, userId: C.id, role: 'viewer' });
  });

  it('refuses a non-member of a workspace that exists', async () => {
    // Why D could have been admitted: the slug names a live workspace, and A's
    // own call finds it.
    await expect(membershipBySlug(asUser(A), W_SLUG)).resolves.toBeDefined();

    await expect(membershipBySlug(asUser(D), W_SLUG)).rejects.toThrow(Forbidden);
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
