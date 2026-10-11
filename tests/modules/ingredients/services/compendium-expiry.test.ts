import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { Forbidden, ValidationError } from '@/lib/errors';
import { createReference, deleteCompendiumEntry, updateReference } from '@/modules/ingredients';
import { createCategory, deleteDeityTradition } from '@/modules/vocabulary';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// M8.7: an admin's compendium-tier write expires the `compendium` tag, with
// `{ expire: 0 }` so the admin's next read is a miss rather than a stale
// answer (DESIGN.md §7). Under Vitest `revalidateTag` is the recorder
// tests/support/next-cache.ts aliases in, so a write's call is asserted here
// and Next's handling of it in tests/e2e/compendium-cache.spec.ts. This file
// and that spec own the behaviour since MB.224 retired the guard that held
// every admin write to the call: these show what the call does and when it
// does not happen (claude-docs/db/compendium-cache.md, "Expiring the tag").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const expired = vi.mocked(revalidateTag);

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
  await sql`delete from categories where name like 'Testcraft%'`;
  expired.mockClear();
});

const BOOK = {
  kind: 'book' as const,
  authors: 'Testwort, Fixtura',
  title: 'A Herbal of Fixture Covens',
  published: '1988',
};

const groupId = async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 1`;
  return row.id;
};

describe('M8.7: an admin write expires the compendium tag', () => {
  it('expires it once, with { expire: 0 }, after a vocabulary write', async () => {
    const category = {
      name: 'Testcraft',
      description: 'A fixture category',
      groupId: await groupId(),
    };
    await createCategory(asUser(E), category);

    expect(expired.mock.calls).toEqual([[COMPENDIUM_TAG, { expire: 0 }]]);
  });

  it('expires it after a compendium entry is deleted', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Expiring', nomenclature: 'none' }),
      A.id,
    );
    await deleteCompendiumEntry(asUser(E), id);

    expect(expired.mock.calls).toEqual([[COMPENDIUM_TAG, { expire: 0 }]]);
  });

  it('expires it after a compendium reference is written or edited, and not a coven’s', async () => {
    const compendium = await createReference(asUser(E), null, BOOK);
    await updateReference(asUser(E), null, compendium.id, { ...BOOK, published: '1989' });
    expect(expired).toHaveBeenCalledTimes(2);

    expired.mockClear();
    // B is a member of W, so the coven's write succeeds: what it leaves alone
    // is the tag, not the write.
    const coven = await createReference(asUser(B), WORKSPACE_W_ID, BOOK);
    await updateReference(asUser(B), WORKSPACE_W_ID, coven.id, { ...BOOK, published: '1989' });
    expect(coven.workspaceId).toBe(WORKSPACE_W_ID);
    expect(expired).not.toHaveBeenCalled();
  });

  it('leaves it alone when the write is refused', async () => {
    const category = {
      name: 'Testcraft',
      description: 'A fixture category',
      groupId: await groupId(),
    };

    await expect(createCategory(asUser(A), category)).rejects.toBeInstanceOf(Forbidden);
    await expect(createCategory(asUser(E), { ...category, name: '' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      deleteDeityTradition(asUser(E), '00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow();

    expect(expired).not.toHaveBeenCalled();
  });
});
