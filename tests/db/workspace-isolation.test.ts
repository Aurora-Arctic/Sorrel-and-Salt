import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { findManyInSpell, findOneInWorkspace, findOneSpell, withAudit } from '@/db/repository';
import { ingredients } from '@/db/schema/ingredients';
import { spellCategories } from '@/db/schema/spell-categories';
import { spellIngredients } from '@/db/schema/spell-ingredients';
import { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertMembership } from '@/services/membership';
import { setSpellVisibility } from '@/services/spell-visibility';
import { A, D, E, asUser } from '../support/as-user';
import { makeIngredient, makeSpell } from '../support/fixtures';

// Story 19 — an outsider and a site admin both refused a coven's ingredients
// and grimoire, by direct id and on every write, with a refusal that hands
// neither of them the one bit rule 4 already withholds: whether the row is
// even there. `tests/acceptance/README.md` names this file rather than a
// `describe('Story 19: …')` block — that naming convention is
// `tests/acceptance/`'s own (story-naming.test.ts), and ingredients and the
// grimoire have no GraphQL surface yet for that harness to drive (Waves 8 and
// 13); this suite reaches the same services and finders directly instead.
//
// M6.3 and repository.test.ts's "the Membership proof" section already prove
// the *mechanism* — a proof for one workspace cannot reach another's row by
// id — against a scratch table. TASKS.md asks this task to prove it "per
// entity rather than a sample", so this file repeats that proof against the
// real `ingredients` and grimoire tables, and names the two actors the
// generic proof does not: **D**, a genuine member of a workspace that is not
// W, and **E**, a site admin who belongs to none.
//
// Every actor below reaches for **W**, owned by A and worked in by B and C.
// D's own workspace is X — a real membership, just the wrong one — and E's
// site role is real too; neither buys a byte of W.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  // `ingredients` also holds the compendium (`workspace_id is null`), which
  // the last describe block needs intact — so only this file's own
  // workspace-scoped rows are cleared, never the whole table.
  await sql`delete from ingredients where workspace_id is not null`;
  await sql`truncate spells cascade`;
});

/** A workspace-local ingredient in W, cast the way a future service will. */
async function castIngredient(): Promise<string> {
  const session = asUser(A);
  const membership = await assertMembership(session, WORKSPACE_W_ID, { ingredient: ['create'] });
  const {
    workspaceId: _workspaceId,
    folkNames: _folkNames,
    categories: _categories,
    ...row
  } = makeIngredient({ workspaceId: WORKSPACE_W_ID });

  return withAudit(session, async (write) => {
    const [ingredient] = await write.insertInWorkspace(membership, ingredients, row);
    return ingredient.id;
  });
}

/** A shared spell in W, one layer and one assigned category, cast the way spell-visibility.test.ts does. */
async function castSpell(): Promise<{ spellId: string; categoryId: string }> {
  const [{ id: categoryId }] = await sql`select id from categories order by name limit 1`;
  const session = asUser(A);
  const membership = await assertMembership(session, WORKSPACE_W_ID, { spell: ['create'] });
  const {
    workspaceId: _workspaceId,
    categories: _categories,
    layers: _layers,
    ...row
  } = makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace' });

  const spellId = await withAudit(session, async (write) => {
    const [spell] = await write.insertInWorkspace(membership, spells, row);
    await write.insert(spellIngredients, {
      spellId: spell.id,
      name: 'Fixture Ash',
      form: 'ash',
      layerOrder: 1,
    });
    await write.insert(spellCategories, { spellId: spell.id, categoryId: categoryId as string });
    return spell.id;
  });

  return { spellId, categoryId: categoryId as string };
}

/** An update attempted the way a future ingredient service will: proof first, write second. */
async function attemptIngredientUpdate(
  actor: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<unknown> {
  const membership = await assertMembership(actor, workspaceId, { ingredient: ['update'] });
  return withAudit(actor, (write) =>
    write.updateByIdInWorkspace(membership, ingredients, ingredientId, { name: 'Hijacked' }),
  );
}

describe('Ingredients — a workspace’s own stock', () => {
  describe('direct-id reads', () => {
    it('withholds W’s ingredient from D’s own, valid proof of a different workspace', async () => {
      const ingredientId = await castIngredient();

      // Why this could have succeeded: the row is really in the database, and
      // D really holds a live membership — just of X, not W.
      const [{ count }] =
        await sql`select count(*)::int as count from ingredients where id = ${ingredientId}`;
      expect(count).toBe(1);
      const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });
      expect(inX.workspaceId).toBe(WORKSPACE_X_ID);

      await expect(
        findOneInWorkspace(inX, ingredients, eq(ingredients.id, ingredientId)),
      ).resolves.toBeUndefined();
    });

    it('gives E no proof of W to even attempt the read with', async () => {
      await castIngredient();

      await expect(
        assertMembership(asUser(E), WORKSPACE_W_ID, { ingredient: ['read'] }),
      ).rejects.toBeInstanceOf(Forbidden);
    });
  });

  describe('writes', () => {
    it('throws Forbidden for D rather than updating the row', async () => {
      const ingredientId = await castIngredient();

      await expect(
        attemptIngredientUpdate(asUser(D), WORKSPACE_W_ID, ingredientId),
      ).rejects.toBeInstanceOf(Forbidden);

      const [row] = await sql`select name from ingredients where id = ${ingredientId}`;
      expect(row.name).not.toBe('Hijacked');
    });

    it('throws Forbidden for E rather than updating the row', async () => {
      const ingredientId = await castIngredient();

      await expect(
        attemptIngredientUpdate(asUser(E), WORKSPACE_W_ID, ingredientId),
      ).rejects.toBeInstanceOf(Forbidden);

      const [row] = await sql`select name from ingredients where id = ${ingredientId}`;
      expect(row.name).not.toBe('Hijacked');
    });

    it('leaves the row unmodified even under D’s own valid proof of X', async () => {
      const ingredientId = await castIngredient();
      const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['update'] });

      const updated = await withAudit(asUser(D), (write) =>
        write.updateByIdInWorkspace(inX, ingredients, ingredientId, { name: 'Hijacked' }),
      );

      expect(updated).toEqual([]);
      const [row] = await sql`select name from ingredients where id = ${ingredientId}`;
      expect(row.name).not.toBe('Hijacked');
    });

    it('throws the identical Forbidden whether the ingredient id is real or fabricated', async () => {
      const ingredientId = await castIngredient();
      const bogusId = '00000000-0000-0000-0000-00000000dead';

      const real: unknown = await attemptIngredientUpdate(
        asUser(D),
        WORKSPACE_W_ID,
        ingredientId,
      ).catch((error: unknown) => error);
      const bogus: unknown = await attemptIngredientUpdate(
        asUser(D),
        WORKSPACE_W_ID,
        bogusId,
      ).catch((error: unknown) => error);

      expect(real).toBeInstanceOf(Forbidden);
      expect(bogus).toBeInstanceOf(Forbidden);
      expect((real as Error).message).toBe((bogus as Error).message);
    });
  });
});

describe('Grimoire — the spell and what it is made of', () => {
  describe('the spell itself, by direct id', () => {
    it('withholds W’s spell from D’s own, valid proof of X', async () => {
      const { spellId } = await castSpell();

      const [{ count }] =
        await sql`select count(*)::int as count from spells where id = ${spellId}`;
      expect(count).toBe(1);
      const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { spell: ['read'] });

      await expect(findOneSpell(inX, spellId)).resolves.toBeUndefined();
    });

    it('gives E no proof of W to even attempt the read with', async () => {
      await castSpell();

      await expect(
        assertMembership(asUser(E), WORKSPACE_W_ID, { spell: ['read'] }),
      ).rejects.toBeInstanceOf(Forbidden);
    });
  });

  describe('spell_ingredients and spell_categories, by direct spell id', () => {
    const JOIN_TABLES = [
      { label: 'spell_ingredients', table: spellIngredients },
      { label: 'spell_categories', table: spellCategories },
    ] as const;

    for (const { label, table } of JOIN_TABLES) {
      it(`withholds ${label}’s rows from D’s own, valid proof of X`, async () => {
        const { spellId } = await castSpell();

        const [{ count }] = await sql`
          select count(*)::int as count from ${sql(label)} where spell_id = ${spellId}
        `;
        expect(count).toBe(1);
        const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { spell: ['read'] });

        await expect(findManyInSpell(inX, table, spellId)).resolves.toEqual([]);
      });
    }
  });

  describe('writes, through the one grimoire service that exists (setSpellVisibility)', () => {
    it('throws Forbidden for D rather than widening the spell', async () => {
      const { spellId } = await castSpell();

      await expect(
        setSpellVisibility(asUser(D), WORKSPACE_W_ID, spellId, 'workspace'),
      ).rejects.toBeInstanceOf(Forbidden);

      const [row] = await sql`select visibility from spells where id = ${spellId}`;
      expect(row.visibility).toBe('workspace');
    });

    it('throws Forbidden for E rather than narrowing the spell', async () => {
      const { spellId } = await castSpell();

      await expect(
        setSpellVisibility(asUser(E), WORKSPACE_W_ID, spellId, 'private'),
      ).rejects.toBeInstanceOf(Forbidden);

      const [row] = await sql`select visibility from spells where id = ${spellId}`;
      expect(row.visibility).toBe('workspace');
    });

    it('throws the identical Forbidden whether the spell id is real or fabricated', async () => {
      const { spellId } = await castSpell();
      const bogusId = '00000000-0000-0000-0000-00000000dead';

      const real: unknown = await setSpellVisibility(
        asUser(D),
        WORKSPACE_W_ID,
        spellId,
        'workspace',
      ).catch((error: unknown) => error);
      const bogus: unknown = await setSpellVisibility(
        asUser(D),
        WORKSPACE_W_ID,
        bogusId,
        'workspace',
      ).catch((error: unknown) => error);

      expect(real).toBeInstanceOf(Forbidden);
      expect(bogus).toBeInstanceOf(Forbidden);
      expect((real as Error).message).toBe((bogus as Error).message);
    });
  });
});

// M5.2's admin curation service (Wave 8) is what will actually read and write
// the compendium; nothing that far ahead exists yet to call. What this proves
// instead is the invariant that has to hold for it to work when it lands:
// `assertMembership` neither special-cases nor penalizes the admin role
// (membership.ts, "A site admin gets no bypass"), so E's refusal above is the
// ordinary stranger's refusal and nothing about it can regress a capability
// that is checked on `session.role` alone.
describe('E’s site role carries no bypass and no penalty from the membership check', () => {
  it('is refused W exactly as a non-admin stranger with no membership row would be', async () => {
    const stranger = { id: '00000000-0000-0000-0000-0000000000fe', role: 'user' as const };

    const adminAttempt: unknown = await assertMembership(asUser(E), WORKSPACE_W_ID, {
      spell: ['read'],
    }).catch((error: unknown) => error);
    const strangerAttempt: unknown = await assertMembership(asUser(stranger), WORKSPACE_W_ID, {
      spell: ['read'],
    }).catch((error: unknown) => error);

    expect(adminAttempt).toBeInstanceOf(Forbidden);
    expect(strangerAttempt).toBeInstanceOf(Forbidden);
    expect((adminAttempt as Error).message).toBe((strangerAttempt as Error).message);
  });

  it('leaves the compendium itself untouched by the refusal', async () => {
    await assertMembership(asUser(E), WORKSPACE_W_ID, { spell: ['read'] }).catch(() => {});

    expect(asUser(E).role).toBe('admin');
    const [{ count }] =
      await sql`select count(*)::int as count from ingredients where workspace_id is null`;
    expect(count).toBeGreaterThan(0);
  });
});
