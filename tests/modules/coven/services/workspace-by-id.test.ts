import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { workspaceById } from '@/modules/coven';
import { A, C, D, asUser } from '../../../support/as-user';

// The browser names a coven by id, so a stranger and an id no coven holds
// must earn the same bare refusal: whether a coven exists is private.

const NO_SUCH_COVEN = '00000000-0000-4000-8000-00000000dead';

describe('workspaceById', () => {
  // The least privileged seat: every role may read its coven.
  it('gives a viewer the coven they sit in', async () => {
    const workspace = await workspaceById(asUser(C), WORKSPACE_W_ID);

    expect(workspace).toMatchObject({ id: WORKSPACE_W_ID, name: 'Whitethorn Coven' });
  });

  it('refuses a non-member the coven by its id', async () => {
    // Why D could have been given it: the id names a live coven, and A's own call reads it.
    await expect(workspaceById(asUser(A), WORKSPACE_W_ID)).resolves.toBeDefined();

    await expect(workspaceById(asUser(D), WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
  });

  it('refuses an unknown id with the very refusal a non-member earns', async () => {
    const stranger = await workspaceById(asUser(D), WORKSPACE_W_ID).catch(
      (error: unknown) => error,
    );
    const unknown = await workspaceById(asUser(A), NO_SUCH_COVEN).catch((error: unknown) => error);

    expect(unknown).toBeInstanceOf(Forbidden);
    expect(unknown).toEqual(stranger);
  });
});
