import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findOneSpell, withAudit } from '@/db/repository';
import { spells } from '@/modules/grimoire/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { setSpellVisibility } from '@/modules/grimoire';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { makeSpell } from '../../../support/fixtures';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

// DESIGN.md §5's one-way rule: `private` may be widened to `workspace`, and `workspace` may never be narrowed back, because the coven may already be building on the spell.
// The service refuses and says so, rather than answering `Forbidden` for a permission the caller holds. B, a plain member, authors throughout; A, the owner, is the one refused.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

async function cast(
  author: typeof A,
  visibility: SpellVisibility,
  workspaceId: string = WORKSPACE_W_ID,
  // Complete by default: the one-way rule binds a complete spell.
  status: SpellStatus = 'complete',
): Promise<string> {
  const session = asUser(author);
  const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
  const {
    workspaceId: _workspaceId,
    categories: _categories,
    steps: _steps,
    ...row
  } = makeSpell({ visibility, status });

  const [spell] = await withAudit(session, (write) =>
    write.insertInWorkspace(membership, spells, row),
  );
  return spell.id;
}

async function visibilityOf(spellId: string): Promise<string> {
  const [row] = await sql`select visibility::text from spells where id = ${spellId}`;
  return row.visibility as string;
}

async function statusOf(spellId: string): Promise<string> {
  const [row] = await sql`select status::text from spells where id = ${spellId}`;
  return row.status as string;
}

describe('setSpellVisibility', () => {
  describe('widening private → workspace', () => {
    it('is permitted to the author', async () => {
      const spellId = await cast(B, 'private');

      await expect(
        setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'workspace'),
      ).resolves.toMatchObject({ id: spellId, visibility: 'workspace' });

      expect(await visibilityOf(spellId)).toBe('workspace');
    });

    it('hands the spell to the rest of the coven', async () => {
      const spellId = await cast(B, 'private');
      const owner = await assertMembership(asUser(A), WORKSPACE_W_ID, { spell: ['read'] });

      // Why the read below could have succeeded all along: it did not. The
      // owner is refused the same spell by the same finder a line earlier.
      await expect(findOneSpell(owner, spellId)).resolves.toBeUndefined();

      await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'workspace');

      await expect(findOneSpell(owner, spellId)).resolves.toMatchObject({ id: spellId });
    });

    it('stamps the widening on the row', async () => {
      const spellId = await cast(B, 'private');

      await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'workspace');

      const [row] = await sql`select created_by, updated_by from spells where id = ${spellId}`;
      expect(row.created_by).toBe(B.id);
      expect(row.updated_by).toBe(B.id);
    });
  });

  describe('narrowing workspace → private', () => {
    it('is refused with an error that says why, not a bare Forbidden', async () => {
      const spellId = await cast(B, 'workspace');
      expect(await statusOf(spellId)).toBe('complete');

      // Why this could have succeeded: B authored this spell and may widen the
      // private one in the same coven, so the refusal is the rule rather than a
      // permission B lacks.
      const other = await cast(B, 'private');
      await expect(
        setSpellVisibility(asUser(B), WORKSPACE_W_ID, other, 'workspace'),
      ).resolves.toBeDefined();

      const error = await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'private').then(
        () => {
          throw new Error('expected the narrowing to be refused, but it succeeded');
        },
        (thrown: Error) => thrown,
      );

      expect(error).toBeInstanceOf(Forbidden);
      // Not the bare default: the caller holds the permission and is being
      // told about the rule, which a `Forbidden` on its own does not say.
      expect(error.message).not.toBe(new Forbidden().message);
    });

    it('leaves the spell shared', async () => {
      const spellId = await cast(B, 'workspace');

      await expect(
        setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'private'),
      ).rejects.toBeInstanceOf(Forbidden);

      expect(await visibilityOf(spellId)).toBe('workspace');
    });

    it('is refused to the owner too, who cannot retract another member’s gift', async () => {
      const spellId = await cast(B, 'workspace');

      await expect(
        setSpellVisibility(asUser(A), WORKSPACE_W_ID, spellId, 'private'),
      ).rejects.toBeInstanceOf(Forbidden);

      expect(await visibilityOf(spellId)).toBe('workspace');
    });
  });

  describe('a draft', () => {
    it('narrows and widens as often as its author likes', async () => {
      const spellId = await cast(B, 'workspace', WORKSPACE_W_ID, 'draft');
      // Preconditions: it is a shared draft, the very row a complete one would refuse.
      expect(await visibilityOf(spellId)).toBe('workspace');
      expect(await statusOf(spellId)).toBe('draft');

      await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'private');
      expect(await visibilityOf(spellId)).toBe('private');
      await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'workspace');
      expect(await visibilityOf(spellId)).toBe('workspace');
      await setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'private');
      expect(await visibilityOf(spellId)).toBe('private');
    });
  });

  describe('restating the visibility a spell already has', () => {
    // Only workspace → workspace: it sits beside the refused narrowing. A
    // private → private restate takes the same write as widening.
    it('leaves a workspace spell workspace', async () => {
      const spellId = await cast(B, 'workspace');

      await expect(
        setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, 'workspace'),
      ).resolves.toMatchObject({ visibility: 'workspace' });

      expect(await visibilityOf(spellId)).toBe('workspace');
    });
  });

  describe('who may reach the call at all', () => {
    it('refuses a viewer, who writes nothing', async () => {
      const spellId = await cast(B, 'workspace');

      // Why this could have succeeded: C is a live member of W and may read
      // this very spell, so the refusal is the viewer rule and not a missing row.
      const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] });
      await expect(findOneSpell(viewer, spellId)).resolves.toBeDefined();

      await expect(
        setSpellVisibility(asUser(C), WORKSPACE_W_ID, spellId, 'private'),
      ).rejects.toBeInstanceOf(Forbidden);
    });

    it('refuses a member of another coven by direct id', async () => {
      const spellId = await cast(B, 'private');

      // Why this could have succeeded: D holds a live membership — of X — and
      // widening a private spell of X's succeeds for D in the same breath.
      const ownSpell = await cast(D, 'private', WORKSPACE_X_ID);
      await expect(
        setSpellVisibility(asUser(D), WORKSPACE_X_ID, ownSpell, 'workspace'),
      ).resolves.toBeDefined();

      await expect(
        setSpellVisibility(asUser(D), WORKSPACE_W_ID, spellId, 'workspace'),
      ).rejects.toBeInstanceOf(Forbidden);
    });

    // The author rule needs no clause of its own: a private spell is not
    // readable by anyone else, so the finder has already refused the row.
    it('tells another member the private spell is not there', async () => {
      const spellId = await cast(B, 'private');

      await expect(
        setSpellVisibility(asUser(A), WORKSPACE_W_ID, spellId, 'workspace'),
      ).rejects.toBeInstanceOf(NotFound);

      expect(await visibilityOf(spellId)).toBe('private');
    });

    it('tells a member a spell that is not there is not there', async () => {
      await expect(
        setSpellVisibility(
          asUser(B),
          WORKSPACE_W_ID,
          '99999999-9999-9999-9999-999999999999',
          'workspace',
        ),
      ).rejects.toBeInstanceOf(NotFound);
    });
  });
});
