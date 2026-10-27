import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findManyInSpell, findOneSpell, withAudit } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import type { SpellVisibility } from '@/modules/grimoire';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import { spells } from '@/modules/grimoire/schema/spells';
import { A, B, C, D, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertSpell } from '../../support/db/insert-spell';
import { makeSpell } from '../../support/fixtures';

// M10.6: who may read which spell, as one matrix of relationship × visibility
// (DESIGN.md §5; claude-docs/db/spell-visibility.md, "Reading"). Every finder
// that reads a spell or its rows goes through `readableSpells`, so for each
// cell the direct-id read and both of the spell's child tables must give the
// same answer. A finder that disagreed with the others would be a
// second rule.
//
// Every refusal first proves the read could have succeeded: the row is there,
// live, in the coven, and its author reads it through all three reads.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type User = typeof A;

const proofFor = (user: User, workspaceId: string = WORKSPACE_W_ID): Promise<Membership> =>
  assertMembership(asUser(user), workspaceId, { spell: ['read'] });

/** A spell in W with one step and one assigned category, so both child tables hold a row. */
const spellBy = (author: User, visibility: SpellVisibility): Promise<string> =>
  insertSpell(sql, makeSpell({ visibility, categories: ['Protection'] }), author.id);

/** What each of the three reads says about the spell, for this proof. */
async function reads(membership: Membership, spellId: string) {
  const [one, steps, categories] = await Promise.all([
    findOneSpell(membership, spellId),
    findManyInSpell(membership, spellSteps, spellId),
    findManyInSpell(membership, spellCategories, spellId),
  ]);
  return {
    findOneSpell: one?.id === spellId,
    stepsOfSpell: steps.length > 0,
    categoriesOfSpell: categories.length > 0,
  };
}

const all = (readable: boolean) => ({
  findOneSpell: readable,
  stepsOfSpell: readable,
  categoriesOfSpell: readable,
});

const liveInCoven = async (spellId: string, workspaceId: string = WORKSPACE_W_ID) => {
  const rows = await sql`
    select 1 from spells
    where id = ${spellId} and workspace_id = ${workspaceId} and deleted_at is null`;
  return rows.length === 1;
};

interface Cell {
  relationship: string;
  author: User;
  reader: User;
  /** The coven the reader's proof is for: X for D, who belongs to no other. */
  readerWorkspace?: string;
  /** Soft-delete the spell, after its author has read it, before the reader tries. */
  softDeleted?: boolean;
  readable: Record<SpellVisibility, boolean>;
}

const matrix: Cell[] = [
  {
    relationship: 'the author, a member',
    author: B,
    reader: B,
    readable: { workspace: true, private: true },
  },
  {
    relationship: 'the owner, not the author',
    author: B,
    reader: A,
    readable: { workspace: true, private: false },
  },
  {
    relationship: 'another member, not the author',
    author: A,
    reader: B,
    readable: { workspace: true, private: false },
  },
  {
    relationship: 'a viewer, not the author',
    author: B,
    reader: C,
    readable: { workspace: true, private: false },
  },
  {
    // A viewer's own spell is what a member demoted after writing it leaves
    // behind: `created_by` is still theirs, and §5 ties a private spell to its
    // author, not to a role.
    relationship: 'the author after demotion to viewer',
    author: C,
    reader: C,
    readable: { workspace: true, private: true },
  },
  {
    relationship: 'a member of another coven, by direct id',
    author: B,
    reader: D,
    readerWorkspace: WORKSPACE_X_ID,
    readable: { workspace: false, private: false },
  },
  {
    relationship: 'the author, once the spell is soft-deleted',
    author: B,
    reader: B,
    softDeleted: true,
    readable: { workspace: false, private: false },
  },
];

describe('readableSpells, through every finder that reads a spell', () => {
  describe.each(matrix)('$relationship', (cell) => {
    it.each(['workspace', 'private'] as const)('a %s spell', async (visibility) => {
      const spellId = await spellBy(cell.author, visibility);
      const expected = cell.readable[visibility];

      if (!expected) {
        // The precondition: the row is there, and its author reads it.
        expect(await liveInCoven(spellId)).toBe(true);
        expect(await reads(await proofFor(cell.author), spellId)).toEqual(all(true));
      }

      if (cell.softDeleted) {
        await sql`
          update spells set deleted_at = now(), deleted_by = ${cell.author.id}
          where id = ${spellId}`;
      }

      const reader = await proofFor(cell.reader, cell.readerWorkspace);
      expect(await reads(reader, spellId)).toEqual(all(expected));
    });
  });
});

describe('deleting a shared spell', () => {
  // §5's one-way rule governs visibility, not existence: a `workspace` spell
  // can still be deleted. The service that does it is M13.11's `deleteSpell`;
  // this is the repository half, through the audited writer that service will
  // call, so the delete is the write path and not a fixture.
  it('soft-deletes a workspace spell through withAudit, after which no finder returns it to anyone', async () => {
    const spellId = await spellBy(B, 'workspace');
    for (const user of [A, B, C]) {
      expect(await reads(await proofFor(user), spellId)).toEqual(all(true));
    }

    const session = asUser(B);
    const membership = await assertMembership(session, WORKSPACE_W_ID, { spell: ['delete'] });
    const deleted = await withAudit(session, (write) =>
      write.softDeleteByIdInWorkspace(membership, spells, spellId),
    );
    expect(deleted.map((row) => row.id)).toEqual([spellId]);

    const [row] = await sql`select deleted_at, deleted_by from spells where id = ${spellId}`;
    expect(row.deleted_at).not.toBeNull();
    expect(row.deleted_by).toBe(B.id);
    for (const user of [A, B, C]) {
      expect(await reads(await proofFor(user), spellId)).toEqual(all(false));
    }
  });
});
