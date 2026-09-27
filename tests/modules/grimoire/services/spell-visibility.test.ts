import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findOneSpell, withAudit } from '@/db/repository';
import { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { assertMembership } from '@/services/membership';
import { setSpellVisibility } from '@/services/spell-visibility';
import { A, B, C, D, asUser } from '../support/as-user';
import { makeSpell } from '../support/fixtures';

// DESIGN.md §5's one-way rule: `private` may be widened to `workspace`, and
// `workspace` may never be narrowed back. Once the coven has read a spell and
// built on it, hiding it retracts something they were relying on — so the
// service refuses, and says that rather than answering `Forbidden` and leaving
// the caller to guess at a permission they do hold.
//
// B, a plain member, authors throughout; A, the owner, is the one refused.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type Visibility = 'private' | 'workspace';

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

  const [spell] = await withAudit(session, (write) =>
    write.insertInWorkspace(membership, spells, row),
  );
  return spell.id;
}

async function visibilityOf(spellId: string): Promise<string> {
  const [row] = await sql`select visibility::text from spells where id = ${spellId}`;
  return row.visibility as string;
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
      expect(error.message).not.toBe('Forbidden');
      expect(error.message).toMatch(/shared/i);
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

  describe('restating the visibility a spell already has', () => {
    for (const visibility of ['private', 'workspace'] as Visibility[]) {
      it(`leaves a ${visibility} spell ${visibility}`, async () => {
        const spellId = await cast(B, visibility);

        await expect(
          setSpellVisibility(asUser(B), WORKSPACE_W_ID, spellId, visibility),
        ).resolves.toMatchObject({ visibility });

        expect(await visibilityOf(spellId)).toBe(visibility);
      });
    }
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
