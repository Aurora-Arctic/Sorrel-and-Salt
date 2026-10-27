import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { editorNamesForCurator } from '@/modules/identity';
import { A, B, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// M11.20: the names behind an admin list's Updated column, read by a curator
// as well as an admin, and by no one else. Called by direct id, as a forged
// request would, so the page hiding it is not what refuses.

useTestDatabase(() => {});

const NOWHERE = '00000000-0000-0000-0000-0000000000f9';

describe('editorNamesForCurator', () => {
  it('answers a curator each live user by id and name, in the order asked, null for no one', async () => {
    expect(asUser(F).role).toBe('curator');

    const names = await editorNamesForCurator(asUser(F), [B.id, NOWHERE, A.id, B.id]);

    expect(names).toEqual([
      { id: B.id, name: B.name },
      null,
      { id: A.id, name: A.name },
      { id: B.id, name: B.name },
    ]);
  });

  it('exposes no ledger field: only the id and the name', async () => {
    const [row] = await editorNamesForCurator(asUser(F), [A.id]);
    expect(Object.keys(row ?? {}).sort()).toEqual(['id', 'name']);
  });

  it('refuses a coven owner, whose same ids a curator is answered', async () => {
    expect(asUser(A).role).toBe('user');
    const [answered] = await editorNamesForCurator(asUser(F), [B.id]);
    expect(answered).toMatchObject({ id: B.id });

    await expect(editorNamesForCurator(asUser(A), [B.id])).rejects.toThrow(Forbidden);
    await expect(editorNamesForCurator(asUser(A), [A.id])).rejects.toThrow(Forbidden);
  });
});
