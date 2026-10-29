import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findManyInSpell, findOneSpell } from '@/db/repository';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { assertMembership, membershipsOf } from '@/modules/coven';
import { setSpellVisibility } from '@/modules/grimoire';
import {
  getStock,
  getWorkspaceIngredient,
  updateStock,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, D, E, F, asUser } from '../support/as-user';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertSpell } from '../support/db/insert-spell';
import { insertStock } from '../support/db/insert-stock';
import { variantIdOf } from '../support/db/read-variants';
import { makeIngredient, makeSpell, variantInput } from '../support/fixtures';

// An outsider and a site admin are both refused a coven's ingredients and grimoire, by direct id and on
// every write, with a refusal that hands neither the one bit rule 4 already withholds: whether the row
// is even there. This is the per-entity sweep: each entity a coven holds is reached the way a caller
// reaches it (the ingredients, stock and recipe services, and the repository's finders under a real
// Membership). Each rule behind a refusal is its service's, proved there by direct id for every role,
// and the Membership mechanism is tests/db/repository/finders.test.ts's; this file holds the sweep
// itself, and the refusal that is the same for a real id and a made-up one.
//
// Every actor reaches for **W**, owned by A and worked in by B and C. **D**'s own workspace is X, a real
// membership, just the wrong one, and **E** is a site admin who belongs to none; neither buys a byte of W.

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
  // are cleared, never the whole table. Stock first: a jar names its form.
  await sql`delete from inventory_items`;
  await sql`
    delete from ingredient_variants
    where ingredient_id in (select id from ingredients where workspace_id is not null)
  `;
  await sql`delete from ingredients where workspace_id is not null`;
  await sql`truncate spells cascade`;
});

const FABRICATED_ID = '00000000-0000-0000-0000-00000000dead';

/** W's own ingredient, seeded through the shared inserter and stamped by A. */
const seedIngredient = () =>
  insertIngredient(sql, makeIngredient({ workspaceId: WORKSPACE_W_ID }), A.id);

/** W's jar of the ingredient's one form, stamped by A. */
async function seedStock(ingredientId: string) {
  const variantId = await variantIdOf(sql, ingredientId, 'Testform');
  return insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId, variantId, quantityOnHand: '5', unit: 'g' },
    A.id,
  );
}

const quantityOf = async (stockId: string) =>
  Number(
    (await sql`select quantity_on_hand from inventory_items where id = ${stockId}`)[0]
      .quantity_on_hand,
  );

/** A shared spell in W, one layer and one assigned category, stamped by A. */
const seedSpell = () =>
  insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility: 'workspace', categories: ['Protection'] }),
    A.id,
  );

/** A rewrite of the ingredient as the coven's own form would send it. */
function hijack(): Parameters<typeof updateWorkspaceIngredient>[3] {
  const {
    workspaceId: _tier,
    categories: _categories,
    substitutes,
    deities,
    variants,
    ...input
  } = makeIngredient({ name: 'Hijacked' });
  return {
    ...input,
    variants: variants.map((variant) => variantInput(variant)),
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

    it('withholds W’s jar from D’s own, valid proof of a different workspace', async () => {
      const stockId = await seedStock(await seedIngredient());
      // Why this could have succeeded: the jar is W's and W's owner reads it,
      // and D really may read stock — in X.
      await expect(getStock(asUser(A), WORKSPACE_W_ID, stockId)).resolves.toMatchObject({
        id: stockId,
      });
      await assertMembership(asUser(D), WORKSPACE_X_ID, { inventory: ['read'] });

      await expect(getStock(asUser(D), WORKSPACE_X_ID, stockId)).rejects.toBeInstanceOf(NotFound);
      await expect(getStock(asUser(D), WORKSPACE_W_ID, stockId)).rejects.toBeInstanceOf(Forbidden);
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

    it('leaves W’s jar unchanged under D’s own valid proof of X', async () => {
      const stockId = await seedStock(await seedIngredient());
      // Why this could have succeeded: D may change stock — in X.
      await assertMembership(asUser(D), WORKSPACE_X_ID, { inventory: ['update'] });

      await expect(
        updateStock(asUser(D), WORKSPACE_X_ID, stockId, { quantityOnHand: 0 }),
      ).rejects.toBeInstanceOf(NotFound);

      expect(await quantityOf(stockId)).toBe(5);
    });

    it('throws the identical Forbidden whether the jar id is real or fabricated', async () => {
      const stockId = await seedStock(await seedIngredient());

      const real = await refusalOf(
        updateStock(asUser(D), WORKSPACE_W_ID, stockId, { quantityOnHand: 0 }),
      );
      const bogus = await refusalOf(
        updateStock(asUser(D), WORKSPACE_W_ID, FABRICATED_ID, { quantityOnHand: 0 }),
      );

      expect(real).toBeInstanceOf(Forbidden);
      expect(bogus).toBeInstanceOf(Forbidden);
      expect(real.message).toBe(bogus.message);
      expect(await quantityOf(stockId)).toBe(5);
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

  describe('spell_steps and spell_categories, by direct spell id', () => {
    const JOIN_TABLES = [
      { label: 'spell_steps', table: spellSteps },
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

  // One grimoire write stands for the rest here; each grimoire service's own
  // cross-coven refusals are in tests/modules/grimoire/services/.
  describe('writes, through a grimoire service (setSpellVisibility)', () => {
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
// F, the curator, is held to the same: curating buys no coven either.
describe('E’s and F’s site roles carry no bypass and no penalty from the membership check', () => {
  const stranger = asUser({ id: '00000000-0000-0000-0000-0000000000fe', role: 'user' });

  type Seeded = { ingredientId: string; stockId: string; spellId: string };
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
    ['W’s jar, read by id', (session, { stockId }) => getStock(session, WORKSPACE_W_ID, stockId)],
    [
      'W’s jar, changed',
      (session, { stockId }) =>
        updateStock(session, WORKSPACE_W_ID, stockId, { quantityOnHand: 0 }),
    ],
    // The proof the grimoire's reads take; readSpell and listGrimoire refuse D
    // themselves in tests/modules/grimoire/services/spell-reads.test.ts.
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
    'refuses E and F %s, exactly as a stranger with no membership row would be, leaving it as it was',
    async (_attempt, attempt) => {
      const ingredientId = await seedIngredient();
      const seeded = {
        ingredientId,
        stockId: await seedStock(ingredientId),
        spellId: await seedSpell(),
      };
      // Why E and F could have been let through: the site roles are real, and
      // the rows are W's own, read by W's owner.
      expect(asUser(E).role).toBe('admin');
      expect(asUser(F).role).toBe('curator');
      await expect(
        getWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, seeded.ingredientId),
      ).resolves.toMatchObject({ id: seeded.ingredientId });
      await expect(getStock(asUser(A), WORKSPACE_W_ID, seeded.stockId)).resolves.toMatchObject({
        id: seeded.stockId,
      });
      const inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { spell: ['read'] });
      await expect(findOneSpell(inW, seeded.spellId)).resolves.toMatchObject({
        id: seeded.spellId,
      });

      const admin = await refusalOf(attempt(asUser(E), seeded));
      const curator = await refusalOf(attempt(asUser(F), seeded));
      const outsider = await refusalOf(attempt(stranger, seeded));

      expect(admin).toBeInstanceOf(Forbidden);
      expect(curator).toBeInstanceOf(Forbidden);
      expect(outsider).toBeInstanceOf(Forbidden);
      expect(admin.message).toBe(outsider.message);
      expect(curator.message).toBe(outsider.message);
      expect(await nameOf(seeded.ingredientId)).not.toBe('Hijacked');
      expect(await quantityOf(seeded.stockId)).toBe(5);
      expect(await visibilityOf(seeded.spellId)).toBe('workspace');
    },
  );

  // Both halves sit in one test, so it fails if either changes: the admin may read which covens a user
  // is in, and may still not read what those covens hold.
  it('lets E list D’s covens by name and role while refusing X’s ingredients by direct id', async () => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_X_ID }),
      D.id,
    );
    // Why E could have been let through: the site role is real, and the row is
    // X's, read by X's own member.
    expect(asUser(E).role).toBe('admin');
    await expect(
      getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, ingredientId),
    ).resolves.toMatchObject({ id: ingredientId });

    const [answer] = await membershipsOf(asUser(E), [D.id]);
    expect(answer).toEqual([
      expect.objectContaining({
        role: 'member',
        workspace: expect.objectContaining({ id: WORKSPACE_X_ID, name: expect.any(String) }),
      }),
    ]);
    await expect(
      getWorkspaceIngredient(asUser(E), WORKSPACE_X_ID, ingredientId),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  // The precondition the sweep above stands on: F is seeded a curator in no coven.
  it('seeds F a curator holding the creation flag, with no membership row', async () => {
    const [row] = await sql`
      select role::text as role, can_create_workspace from users where id = ${F.id}
    `;
    expect(row).toEqual({ role: 'curator', can_create_workspace: true });
    expect(await sql`select 1 from workspace_members where user_id = ${F.id}`).toHaveLength(0);
  });

  it('leaves the compendium itself untouched by the refusal', async () => {
    await assertMembership(asUser(E), WORKSPACE_W_ID, { spell: ['read'] }).catch(() => {});

    expect(asUser(E).role).toBe('admin');
    const [{ count }] =
      await sql`select count(*)::int as count from ingredients where workspace_id is null`;
    expect(count).toBeGreaterThan(0);
  });
});
