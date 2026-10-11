import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findManyInSpell, findOneSpell } from '@/db/repository';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertMembership } from '@/modules/coven';
import { setSpellVisibility } from '@/modules/grimoire';
import { getWorkspaceIngredient, updateWorkspaceIngredient } from '@/modules/ingredients';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, D, E, asUser } from '../support/as-user';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertSpell } from '../support/db/insert-spell';
import { makeIngredient, makeSpell } from '../support/fixtures';

// Story 19 — an outsider and a site admin both refused a coven's ingredients
// and grimoire, by direct id and on every write, with a refusal that hands
// neither of them the one bit rule 4 already withholds: whether the row is
// even there. `tests/acceptance/README.md` names this file rather than a
// `describe('Story 19: …')` block, that naming convention being
// `tests/acceptance/`'s own.
//
// This is the per-entity sweep: every entity a coven holds, reached the way a
// caller reaches it — an ingredient through the ingredients service
// (getWorkspaceIngredient, updateWorkspaceIngredient), a spell's one write
// through setSpellVisibility, and the grimoire's reads, which have no service
// yet, through the repository's finders under a real Membership. The rule
// behind each refusal is its service's, proved there by direct id for every
// role (tests/modules/*/services/), and the Membership mechanism is
// tests/db/repository/finders.test.ts's, once per finder family; what only
// this file holds is the sweep itself, and the refusal that is the same for a
// real id and a made-up one.
//
// Every actor below reaches for **W**, owned by A and worked in by B and C.
// **D**'s own workspace is X — a real membership, just the wrong one — and
// **E** is a site admin who belongs to none; neither buys a byte of W.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  // `ingredients` also holds the compendium (`workspace_id is null`), which
  // the last describe block needs intact — so only the workspace-scoped rows
  // are cleared, never the whole table.
  await sql`delete from ingredients where workspace_id is not null`;
  await sql`truncate spells cascade`;
});

const FABRICATED_ID = '00000000-0000-0000-0000-00000000dead';

/** W's own ingredient, seeded through the shared inserter and stamped by A. */
const seedIngredient = () =>
  insertIngredient(sql, makeIngredient({ workspaceId: WORKSPACE_W_ID }), A.id);

/** A shared spell in W, one layer and one assigned category, stamped by A. */
const seedSpell = () =>
  insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace', categories: ['Protection'] }),
    A.id,
  );

/** A rewrite of the ingredient as the coven's own form would send it. */
function hijack(): LocalIngredientInput {
  const {
    workspaceId: _tier,
    categories: _categories,
    substitutes,
    deities,
    ...input
  } = makeIngredient({ name: 'Hijacked' });
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

const nameOf = async (ingredientId: string) =>
  (await sql`select name from ingredients where id = ${ingredientId}`)[0].name as string;

const visibilityOf = async (spellId: string) =>
  (await sql`select visibility from spells where id = ${spellId}`)[0].visibility as string;

/** What a refused call threw, or the test fails because it went through. */
const refusalOf = (attempt: Promise<unknown>) =>
  attempt.then(
    () => expect.fail('the call was not refused'),
    (error: unknown) => error as Error,
  );

describe('Ingredients — a workspace’s own stock', () => {
  describe('direct-id reads', () => {
    it('withholds W’s ingredient from D’s own, valid proof of a different workspace', async () => {
      const ingredientId = await seedIngredient();
      // Why this could have succeeded: the row is W's and W's owner reads it,
      // and D really holds a live membership — just of X, not W.
      await expect(
        getWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, ingredientId),
      ).resolves.toMatchObject({ id: ingredientId });
      const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });
      expect(inX.workspaceId).toBe(WORKSPACE_X_ID);

      await expect(
        getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, ingredientId),
      ).rejects.toBeInstanceOf(NotFound);
      await expect(
        getWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, ingredientId),
      ).rejects.toBeInstanceOf(Forbidden);
    });
  });

  describe('writes', () => {
    it('throws Forbidden for D rather than updating the row', async () => {
      const ingredientId = await seedIngredient();

      await expect(
        updateWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, ingredientId, hijack()),
      ).rejects.toBeInstanceOf(Forbidden);

      expect(await nameOf(ingredientId)).not.toBe('Hijacked');
    });

    it('leaves the row unmodified even under D’s own valid proof of X', async () => {
      const ingredientId = await seedIngredient();
      // Why this could have succeeded: D may rewrite an ingredient — in X.
      await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['update'] });

      await expect(
        updateWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, ingredientId, hijack()),
      ).rejects.toBeInstanceOf(NotFound);

      expect(await nameOf(ingredientId)).not.toBe('Hijacked');
    });

    it('throws the identical Forbidden whether the ingredient id is real or fabricated', async () => {
      const ingredientId = await seedIngredient();

      const real = await refusalOf(
        updateWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, ingredientId, hijack()),
      );
      const bogus = await refusalOf(
        updateWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, FABRICATED_ID, hijack()),
      );

      expect(real).toBeInstanceOf(Forbidden);
      expect(bogus).toBeInstanceOf(Forbidden);
      expect(real.message).toBe(bogus.message);
    });
  });
});

describe('Grimoire — the spell and what it is made of', () => {
  describe('the spell itself, by direct id', () => {
    it('withholds W’s spell from D’s own, valid proof of X', async () => {
      const spellId = await seedSpell();

      const [{ count }] =
        await sql`select count(*)::int as count from spells where id = ${spellId}`;
      expect(count).toBe(1);
      const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { spell: ['read'] });

      await expect(findOneSpell(inX, spellId)).resolves.toBeUndefined();
    });
  });

  describe('spell_ingredients and spell_categories, by direct spell id', () => {
    const JOIN_TABLES = [
      { label: 'spell_ingredients', table: spellIngredients },
      { label: 'spell_categories', table: spellCategories },
    ] as const;

    for (const { label, table } of JOIN_TABLES) {
      it(`withholds ${label}’s rows from D’s own, valid proof of X`, async () => {
        const spellId = await seedSpell();

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
      const spellId = await seedSpell();

      await expect(
        setSpellVisibility(asUser(D), WORKSPACE_W_ID, spellId, 'workspace'),
      ).rejects.toBeInstanceOf(Forbidden);

      expect(await visibilityOf(spellId)).toBe('workspace');
    });

    it('throws the identical Forbidden whether the spell id is real or fabricated', async () => {
      const spellId = await seedSpell();

      const real = await refusalOf(
        setSpellVisibility(asUser(D), WORKSPACE_W_ID, spellId, 'workspace'),
      );
      const bogus = await refusalOf(
        setSpellVisibility(asUser(D), WORKSPACE_W_ID, FABRICATED_ID, 'workspace'),
      );

      expect(real).toBeInstanceOf(Forbidden);
      expect(bogus).toBeInstanceOf(Forbidden);
      expect(real.message).toBe(bogus.message);
    });
  });
});

// The compendium's writes check the site role alone (`assertSiteAdmin`), so
// what has to hold beside them is that `assertMembership` neither
// special-cases nor penalizes the admin role (membership.ts, "A site admin
// gets no bypass"): E's refusal of each entity is the ordinary stranger's
// refusal, and nothing about it can regress a capability checked on
// `session.role`. Each service proves E's refusal once too; this is the sweep.
describe('E’s site role carries no bypass and no penalty from the membership check', () => {
  const stranger = asUser({ id: '00000000-0000-0000-0000-0000000000fe', role: 'user' });

  type Seeded = { ingredientId: string; spellId: string };
  const ATTEMPTS: [string, (session: Session, seeded: Seeded) => Promise<unknown>][] = [
    [
      'W’s ingredient, read by id',
      (session, { ingredientId }) => getWorkspaceIngredient(session, WORKSPACE_W_ID, ingredientId),
    ],
    [
      'W’s ingredient, rewritten',
      (session, { ingredientId }) =>
        updateWorkspaceIngredient(session, WORKSPACE_W_ID, ingredientId, hijack()),
    ],
    // The grimoire's reads have no service yet: the proof is what they take.
    [
      'the proof W’s spells are read under',
      (session) => assertMembership(session, WORKSPACE_W_ID, { spell: ['read'] }),
    ],
    [
      'W’s spell, narrowed',
      (session, { spellId }) => setSpellVisibility(session, WORKSPACE_W_ID, spellId, 'private'),
    ],
  ];

  it.each(ATTEMPTS)(
    'is refused %s, exactly as a stranger with no membership row would be, leaving it as it was',
    async (_attempt, attempt) => {
      const seeded = { ingredientId: await seedIngredient(), spellId: await seedSpell() };
      // Why E could have been let through: the site role is real, and the rows
      // are W's own, read by W's owner.
      expect(asUser(E).role).toBe('admin');
      await expect(
        getWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, seeded.ingredientId),
      ).resolves.toMatchObject({ id: seeded.ingredientId });
      const inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { spell: ['read'] });
      await expect(findOneSpell(inW, seeded.spellId)).resolves.toMatchObject({
        id: seeded.spellId,
      });

      const admin = await refusalOf(attempt(asUser(E), seeded));
      const outsider = await refusalOf(attempt(stranger, seeded));

      expect(admin).toBeInstanceOf(Forbidden);
      expect(outsider).toBeInstanceOf(Forbidden);
      expect(admin.message).toBe(outsider.message);
      expect(await nameOf(seeded.ingredientId)).not.toBe('Hijacked');
      expect(await visibilityOf(seeded.spellId)).toBe('workspace');
    },
  );

  it('leaves the compendium itself untouched by the refusal', async () => {
    await assertMembership(asUser(E), WORKSPACE_W_ID, { spell: ['read'] }).catch(() => {});

    expect(asUser(E).role).toBe('admin');
    const [{ count }] =
      await sql`select count(*)::int as count from ingredients where workspace_id is null`;
    expect(count).toBeGreaterThan(0);
  });
});
