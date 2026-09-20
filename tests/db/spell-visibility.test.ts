import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findManyInSpell, findManySpells, findOneSpell, withAudit } from '@/db/repository';
import { spellCategories } from '@/db/schema/spell-categories';
import { spellIngredients } from '@/db/schema/spell-ingredients';
import { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/services/membership';
import { A, B, C, D, asUser } from '../support/as-user';
import { makeSpell } from '../support/fixtures';

// DESIGN.md §5: a `workspace` spell is readable by every member, viewers
// included; a `private` one by its author alone, owners not excepted. The
// filtering is the finder's (rule 7), so a private spell never reaches a
// caller to be filtered out there.
//
// The author of every private spell below is **B, a plain member**, and the
// reader denied is **A, the owner**. A private spell held against the person
// who could delete the whole coven is the case a rank comparison would get
// wrong.

let sql: ReturnType<typeof postgres>;
let CATEGORY_ID: string;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  const [row] = await sql`select id from categories order by name limit 1`;
  CATEGORY_ID = row.id as string;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type Visibility = 'private' | 'workspace';

/**
 * A spell with one layer and one assigned category, written the way a service
 * writes one: the author's own session stamps `created_by`, which is what
 * `private` is resolved against.
 */
async function cast(
  author: typeof A,
  visibility: Visibility,
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> {
  const session = asUser(author);
  const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
  const {
    workspaceId: _workspaceId,
    categories: _categories,
    layers: _layers,
    ...row
  } = makeSpell({ visibility });

  return withAudit(session, async (write) => {
    const [spell] = await write.insertInWorkspace(membership, spells, row);

    await write.insert(spellIngredients, {
      spellId: spell.id,
      name: 'Fixture Ash',
      form: 'ash',
      layerOrder: 1,
    });
    await write.insert(spellCategories, { spellId: spell.id, categoryId: CATEGORY_ID });

    return spell.id;
  });
}

function proofFor(user: typeof A, workspaceId: string = WORKSPACE_W_ID) {
  return assertMembership(asUser(user), workspaceId, { spell: ['read'] });
}

/** The row is there, whatever a finder says — the precondition every denial below needs. */
async function rowExists(spellId: string): Promise<boolean> {
  const rows = await sql`select 1 from spells where id = ${spellId} and deleted_at is null`;
  return rows.length === 1;
}

describe('findManySpells', () => {
  it('lists a workspace spell to every member, the viewer included', async () => {
    const spellId = await cast(B, 'workspace');

    for (const reader of [A, B, C]) {
      const found = await findManySpells(await proofFor(reader));

      expect(found.map((spell) => spell.id)).toEqual([spellId]);
    }
  });

  it('lists a private spell to its author', async () => {
    const spellId = await cast(B, 'private');

    const found = await findManySpells(await proofFor(B));

    expect(found.map((spell) => spell.id)).toEqual([spellId]);
  });

  it('withholds a private spell from every other member, the owner included', async () => {
    const spellId = await cast(B, 'private');

    // Why this could have succeeded: the row is in the database, both readers
    // hold a live membership of the coven it is in, and the same finder hands
    // it to its author.
    expect(await rowExists(spellId)).toBe(true);
    expect(await findManySpells(await proofFor(B))).toHaveLength(1);

    for (const reader of [A, C]) {
      await expect(findManySpells(await proofFor(reader))).resolves.toEqual([]);
    }
  });

  it('withholds another coven’s spell at either visibility', async () => {
    const shared = await cast(D, 'workspace', WORKSPACE_X_ID);
    const secret = await cast(D, 'private', WORKSPACE_X_ID);

    // Why this could have succeeded: both rows exist, and D — who is a member
    // of X and of nowhere else — is handed both by the same finder.
    expect(await rowExists(shared)).toBe(true);
    expect(await rowExists(secret)).toBe(true);
    expect(await findManySpells(await proofFor(D, WORKSPACE_X_ID))).toHaveLength(2);

    await expect(findManySpells(await proofFor(A))).resolves.toEqual([]);
  });

  it('withholds a soft-deleted spell from its own author', async () => {
    const spellId = await cast(B, 'private');
    await sql`update spells set deleted_at = now(), deleted_by = ${B.id} where id = ${spellId}`;

    await expect(findManySpells(await proofFor(B))).resolves.toEqual([]);
  });
});

describe('findOneSpell', () => {
  it('hands a private spell to its author by id', async () => {
    const spellId = await cast(B, 'private');

    await expect(findOneSpell(await proofFor(B), spellId)).resolves.toMatchObject({
      id: spellId,
      visibility: 'private',
    });
  });

  // By direct id, not merely absent from a list: the id is the one thing a
  // caller who has seen the spell elsewhere would still hold.
  it('refuses a private spell to another member by direct id, the owner included', async () => {
    const spellId = await cast(B, 'private');

    expect(await rowExists(spellId)).toBe(true);
    await expect(findOneSpell(await proofFor(B), spellId)).resolves.toBeDefined();

    for (const reader of [A, C]) {
      await expect(findOneSpell(await proofFor(reader), spellId)).resolves.toBeUndefined();
    }
  });

  it('refuses another coven’s spell by direct id at either visibility', async () => {
    for (const visibility of ['private', 'workspace'] as Visibility[]) {
      const spellId = await cast(D, visibility, WORKSPACE_X_ID);

      expect(await rowExists(spellId)).toBe(true);
      await expect(findOneSpell(await proofFor(D, WORKSPACE_X_ID), spellId)).resolves.toBeDefined();

      await expect(findOneSpell(await proofFor(A), spellId)).resolves.toBeUndefined();
    }
  });

  it('hands a workspace spell to a viewer by id', async () => {
    const spellId = await cast(B, 'workspace');

    await expect(findOneSpell(await proofFor(C), spellId)).resolves.toMatchObject({ id: spellId });
  });
});

// The gap CLAUDE.md rule 5 names: neither join table carries a `workspace_id`,
// so neither can scope itself. Both derive their scope — and their
// visibility — from the spell they hang off.
describe('findManyInSpell', () => {
  const JOIN_TABLES = [
    { label: 'spell_ingredients', table: spellIngredients },
    { label: 'spell_categories', table: spellCategories },
  ] as const;

  for (const { label, table } of JOIN_TABLES) {
    describe(label, () => {
      it('hands a workspace spell’s rows to every member', async () => {
        const spellId = await cast(B, 'workspace');

        for (const reader of [A, B, C]) {
          await expect(
            findManyInSpell(await proofFor(reader), table, spellId),
          ).resolves.toHaveLength(1);
        }
      });

      it('refuses a private spell’s rows to another member by direct id', async () => {
        const spellId = await cast(B, 'private');

        // Why this could have succeeded: the join row is in the table, and the
        // same call as the author returns it.
        const [{ count }] = await sql`
          select count(*)::int as count from ${sql(label)} where spell_id = ${spellId}
        `;
        expect(count).toBe(1);
        await expect(findManyInSpell(await proofFor(B), table, spellId)).resolves.toHaveLength(1);

        for (const reader of [A, C]) {
          await expect(findManyInSpell(await proofFor(reader), table, spellId)).resolves.toEqual(
            [],
          );
        }
      });

      it('refuses another coven’s rows by direct id, even for a shared spell', async () => {
        const spellId = await cast(D, 'workspace', WORKSPACE_X_ID);

        await expect(
          findManyInSpell(await proofFor(D, WORKSPACE_X_ID), table, spellId),
        ).resolves.toHaveLength(1);

        await expect(findManyInSpell(await proofFor(A), table, spellId)).resolves.toEqual([]);
      });

      it('refuses a soft-deleted spell’s rows to its own author', async () => {
        const spellId = await cast(B, 'workspace');
        await sql`update spells set deleted_at = now(), deleted_by = ${B.id} where id = ${spellId}`;

        await expect(findManyInSpell(await proofFor(B), table, spellId)).resolves.toEqual([]);
      });
    });
  }
});
