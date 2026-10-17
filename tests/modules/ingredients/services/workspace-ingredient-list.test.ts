import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { listWorkspaceIngredients } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../../support/fixtures';
import type { Overrides } from '../../../support/fixtures';

// Story 14's list (M9.4): a coven's ingredients are its own entries and the
// compendium entries it holds a live jar of, the compendium half through the
// local-beats-compendium anti-join, filtered as the compendium is but under
// the coven's proof. The ingredient tables are emptied per test, so every row
// a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** An entry, compendium by default, with no formal name unless stated. */
function add(name: string, overrides: Overrides<IngredientFixture> = {}): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

/** A jar in `workspaceId` of the ingredient's form `form`, written raw. */
async function stock(
  ingredientId: string,
  workspaceId = WORKSPACE_W_ID,
  form = 'Testform',
  deleted = false,
): Promise<string> {
  const variantId = await variantIdOf(sql, ingredientId, form);
  return insertStock(sql, { workspaceId, ingredientId, variantId, deleted }, A.id);
}

/** Every label `session` is listed in `workspaceId` under `filter`, in the list's order. */
async function listed(
  session: Session,
  workspaceId = WORKSPACE_W_ID,
  filter: Parameters<typeof listWorkspaceIngredients>[2] = {},
): Promise<string[]> {
  const page = await resolvePage({ first: 100 }, (request) =>
    listWorkspaceIngredients(session, workspaceId, filter, request),
  );
  return page.edges.map(({ node }) => node.name);
}

describe('listWorkspaceIngredients', () => {
  it("lists the coven's own entries and the compendium entries it holds, and nothing else", async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    await stock(await add('Heldwort'));
    await add('Unheldwort');
    await add('Elsewort', { workspaceId: WORKSPACE_X_ID });
    // X's jar of a compendium entry does not put it in W's list.
    await stock(await add('Xheldwort'), WORKSPACE_X_ID);

    expect(await listed(asUser(B))).toEqual(['Covenwort', 'Heldwort']);
    // Why W's list could have held the rest: they are live, and X lists its own.
    expect(await listed(asUser(D), WORKSPACE_X_ID)).toEqual(['Elsewort', 'Xheldwort']);
  });

  it('lists a held entry once, however many of its forms the coven holds', async () => {
    const held = await add('Heldwort', {
      variants: [makeVariant({ form: 'Herb' }), makeVariant({ form: 'Oil' })],
    });
    await stock(held, WORKSPACE_W_ID, 'Herb');
    await stock(held, WORKSPACE_W_ID, 'Oil');

    expect(await listed(asUser(B))).toEqual(['Heldwort']);
  });

  it('leaves out an entry whose only jar is deleted, or is of a deleted form', async () => {
    await stock(await add('Thrownwort'), WORKSPACE_W_ID, 'Testform', true);
    const formGone = await add('Formgonewort');
    await stock(formGone);
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${formGone}`;
    // Why they could have been listed: a live jar of either put it there.
    await stock(await add('Heldwort'));

    expect(await listed(asUser(B))).toEqual(['Heldwort']);
  });

  it("leaves out the coven's deleted entry, and a deleted compendium entry it holds", async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    const deleted = await add('Deletedwort', { workspaceId: WORKSPACE_W_ID });
    const retired = await add('Retiredwort');
    await stock(retired);
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id}
      where id in ${sql([deleted, retired])}`;

    expect(await listed(asUser(B))).toEqual(['Covenwort']);
  });

  it('shows the local entry in place of a held compendium entry it matches, keeping the jar', async () => {
    const entry = await add('Fixturewort', {
      canonicalName: 'Fixtura vulgaris',
      nomenclature: 'botanical',
    });
    const jar = await stock(entry);
    // Why the entry could have been listed: until the local exists, it is.
    expect(await listed(asUser(B))).toEqual(['Fixturewort']);

    await add('Cronefixture', {
      canonicalName: 'Fixtura vulgaris',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await listed(asUser(B))).toEqual(['Cronefixture']);
    // Nothing is moved or deleted behind the member's back (M9.4).
    const [row] = await sql`select deleted_at from inventory_items where id = ${jar}`;
    expect(row.deleted_at).toBeNull();
  });

  it("filters by search, category and forms, under the coven's proof", async () => {
    await add('Mugfixture', {
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Cronefixture'],
      categories: ['Protection'],
    });
    await stock(
      await add('Oilfixture', {
        variants: [makeVariant({ form: 'Oil' })],
        categories: ['Protection'],
      }),
      WORKSPACE_W_ID,
      'Oil',
    );
    await add('Plainfixture', { workspaceId: WORKSPACE_W_ID });
    // X's entry matches every filter below, so a filter reading past the
    // proof would list it.
    await add('Elsefixture', {
      workspaceId: WORKSPACE_X_ID,
      folkNames: ['Cronefixture'],
      categories: ['Protection'],
      variants: [makeVariant({ form: 'Oil' })],
    });
    const [protection] = await sql`
      select id from categories where name = 'Protection' and deleted_at is null`;

    expect(await listed(asUser(B), WORKSPACE_W_ID, { query: 'cronefixture' })).toEqual([
      'Mugfixture',
    ]);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { categoryIds: [protection.id] })).toEqual([
      'Mugfixture',
      'Oilfixture',
    ]);
    expect(await listed(asUser(B), WORKSPACE_W_ID, { forms: ['oil'] })).toEqual(['Oilfixture']);
  });

  it.each([
    ['A, the owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
  ])('lists W to %s', async (_label, user) => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });

    expect(await listed(asUser(user))).toEqual(['Covenwort']);
  });

  it('refuses D, who belongs to X, naming W', async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    // Why it could have answered: D is admitted to a coven, and W has a row.
    expect(await listed(asUser(B))).toEqual(['Covenwort']);
    await expect(listed(asUser(D), WORKSPACE_X_ID)).resolves.toEqual([]);

    await expect(listed(asUser(D))).rejects.toThrow(Forbidden);
  });

  it('refuses the site admin, who belongs to no coven', async () => {
    await add('Covenwort', { workspaceId: WORKSPACE_W_ID });
    expect(await listed(asUser(B))).toEqual(['Covenwort']);

    await expect(listed(asUser(E))).rejects.toThrow(Forbidden);
  });

  /** The ids `session` is listed in `workspaceId` under `filter`. */
  async function idsListed(
    session: Session,
    workspaceId: string,
    filter: Parameters<typeof listWorkspaceIngredients>[2],
  ): Promise<string[]> {
    const page = await resolvePage({ first: 100 }, (request) =>
      listWorkspaceIngredients(session, workspaceId, filter, request),
    );
    return page.edges.map(({ node }) => node.id);
  }

  // M11.22's five facets each sit under the coven's proof: the row in W
  // matches every one of them, and so does X's, so a facet read past the
  // proof would list W's row to D, or X's row to B. Each coven also holds a
  // row matching none, so a facet the read ignored would list it.
  describe('under each facet', () => {
    let hecate: string;
    let covenRow: string;
    let elseRow: string;

    beforeEach(async () => {
      const [deity] = await sql`
        select id from deities where name = 'Hecate' and deleted_at is null`;
      hecate = deity.id as string;
      const matching = {
        toxic: true,
        celestialBodies: ['Fixture Sun'],
        zodiacSigns: ['Fixture Ram'],
        elements: ['fire', 'air'] as ('fire' | 'air')[],
        variants: [makeVariant({ form: 'Fixture Oil' })],
      };
      covenRow = await add('Facetfixture', { ...matching, workspaceId: WORKSPACE_W_ID });
      await insertDeityLink(sql, covenRow, hecate, 0, A.id);
      elseRow = await add('Elsefixture', { ...matching, workspaceId: WORKSPACE_X_ID });
      await insertDeityLink(sql, elseRow, hecate, 0, A.id);
      for (const workspaceId of [WORKSPACE_W_ID, WORKSPACE_X_ID]) {
        await add('Plainfixture', {
          workspaceId,
          variants: [makeVariant({ form: 'Fixture Root' })],
        });
      }
    });

    const facets: [string, () => Parameters<typeof listWorkspaceIngredients>[2]][] = [
      ['forms', () => ({ forms: ['fixture oil'] })],
      ['deityIds', () => ({ deityIds: [hecate] })],
      ['zodiacSigns', () => ({ zodiacSigns: ['fixture ram'] })],
      ['celestialBodies', () => ({ celestialBodies: ['fixture sun'] })],
      ['elements', () => ({ elements: ['air', 'water'] })],
      ['toxic', () => ({ toxic: 'toxic' })],
    ];

    it.each(facets)(
      'under %s, lists the row to B by its id and refuses D naming W',
      async (_facet, facet) => {
        // Unfiltered, W lists both its rows, so the facet is what narrows.
        expect(await idsListed(asUser(B), WORKSPACE_W_ID, {})).toHaveLength(2);
        // Why the read could have answered D: the facet matches W's row, D is
        // admitted to a coven, and the same facet lists X's row to D there.
        expect(await idsListed(asUser(B), WORKSPACE_W_ID, facet())).toEqual([covenRow]);
        expect(await idsListed(asUser(D), WORKSPACE_X_ID, facet())).toEqual([elseRow]);

        await expect(idsListed(asUser(D), WORKSPACE_W_ID, facet())).rejects.toThrow(Forbidden);
      },
    );
  });
});
