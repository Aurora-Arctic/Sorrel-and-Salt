import { describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// The Updated column's names. Who may read them is `editorNamesForCurator`'s, asserted against a database in tests/modules/identity/services/editor-names.test.ts.
// This file holds what the page adds: the stamp each row gets, from the editor that made the latest edit.

const editorNamesForCurator = vi.fn();
const SEED = '00000000-0000-0000-0000-000000000001';
vi.mock('@/modules/identity', () => ({
  editorNamesForCurator,
  listedOnUserList: (id: string) => id !== SEED,
}));

const { editorStamps } = await import('@/app/(shell)/admin/editors');

const ADMIN = { userId: 'admin-1', role: 'admin' } as const;
const FIRST = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';
const SECOND = '7a2d3e5f-0c9b-4d4e-9f80-1b2c3d4e5f60';
const GONE = '8b3e4f60-1dac-4e5f-8091-2c3d4e5f6071';
const AT = new Date('2026-05-06T10:00:00Z');

describe('editorStamps', () => {
  it("names each row's last editor, not its creator, and reads every name in one lookup", async () => {
    editorNamesForCurator.mockResolvedValueOnce([
      { name: 'Fixture Second' },
      { name: 'Fixture First' },
    ]);

    // The first row was created by FIRST and last edited by SECOND.
    const stamps = await editorStamps(ADMIN, [
      { updatedBy: SECOND, updatedAt: AT },
      { updatedBy: FIRST, updatedAt: AT },
    ]);

    expect(editorNamesForCurator).toHaveBeenCalledTimes(1);
    expect(editorNamesForCurator).toHaveBeenCalledWith(ADMIN, [SECOND, FIRST]);
    expect(stamps).toEqual([
      { updatedBy: 'Fixture Second', updatedAt: AT },
      { updatedBy: 'Fixture First', updatedAt: AT },
    ]);
  });

  it('reads an editor whose account is gone as Unknown, never as their id', async () => {
    editorNamesForCurator.mockResolvedValueOnce([null]);

    const [stamp] = await editorStamps(ADMIN, [{ updatedBy: GONE, updatedAt: AT }]);

    expect(stamp.updatedBy).toBe('Unknown');
    expect(JSON.stringify(stamp)).not.toContain(GONE);
  });

  it('leaves a row last written by the seed system user unstamped', async () => {
    editorNamesForCurator.mockResolvedValueOnce([
      { name: 'Seed System User' },
      { name: 'Fixture First' },
    ]);

    const stamps = await editorStamps(ADMIN, [
      { updatedBy: SEED, updatedAt: AT },
      { updatedBy: FIRST, updatedAt: AT },
    ]);

    expect(stamps).toEqual([
      { updatedBy: null, updatedAt: null },
      { updatedBy: 'Fixture First', updatedAt: AT },
    ]);
  });

  it('passes on the refusal a non-admin session gets', async () => {
    editorNamesForCurator.mockRejectedValueOnce(
      new Forbidden('Only a curator may read editor names'),
    );

    await expect(
      editorStamps({ userId: 'owner-1', role: 'user' }, [{ updatedBy: FIRST, updatedAt: AT }]),
    ).rejects.toThrow(Forbidden);
  });
});
