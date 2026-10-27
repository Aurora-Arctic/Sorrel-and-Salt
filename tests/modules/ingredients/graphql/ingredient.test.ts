import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { curatedFormId } from '../../../support/db/curated-ids';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { liveFolkNames } from '../../../support/db/folk-names';
import {
  insertIngredient,
  insertSubstituteLink,
  insertVariant,
} from '../../../support/db/insert-ingredient';
import { insertReference, insertVariantReferenceLink } from '../../../support/db/insert-reference';
import { run as runOperation } from '../../../support/graphql/run';
import { makeIngredient } from '../../../support/fixtures';
import type { IngredientNode, IngredientVariantNode } from './types';

// The `ingredient` detail query: a compendium entry for anyone, and a coven's
// own entry for its members when they name the coven. Non-null: a miss is
// `NOT_FOUND`, as every lookup here answers one. Which callers are refused at
// which rows is services/compendium.test.ts's; this file holds the
// transport's half — the coven forwarded, and one refusal per code on the wire.

let sql: ReturnType<typeof postgres>;
let compendiumId: string;
let localId: string;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  compendiumId = await insertIngredient(
    sql,
    makeIngredient({
      name: 'Fixture Compendial',
      nomenclature: 'none',
      folkNames: ['Fixture Folk'],
      categories: ['Protection'],
    }),
    A.id,
  );
  localId = await insertIngredient(
    sql,
    makeIngredient({ name: 'Fixture Local', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
    A.id,
  );
});

const run = (session: Session | null, variables: { id: string; workspaceId?: string }) =>
  runOperation<{ ingredient: IngredientNode }>(
    session,
    `query ($id: ID!, $workspaceId: ID) {
      ingredient(id: $id, workspaceId: $workspaceId) {
        id name nomenclature canonicalName isGlobal folkNames { id name } categories { name }
      }
    }`,
    variables,
  );

describe('ingredient', () => {
  it('answers a compendium entry to a signed-out visitor, children included', async () => {
    const result = await run(null, { id: compendiumId });

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient?.folkNames).toEqual([
      { id: expect.any(String), name: 'Fixture Folk' },
    ]);
    expect(result.data?.ingredient).toEqual({
      id: compendiumId,
      name: 'Fixture Compendial',
      nomenclature: 'none',
      canonicalName: null,
      isGlobal: true,
      folkNames: await liveFolkNames(sql, compendiumId),
      categories: [{ name: 'Protection' }],
    });
  });

  // Which roles read the entry is services/compendium.test.ts's; a viewer, the
  // narrowest reader, stands for them here.
  it("answers a coven's own entry to a member who names the coven", async () => {
    const result = await run(asUser(C), { id: localId, workspaceId: WORKSPACE_W_ID });

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient).toMatchObject({ id: localId, isGlobal: false });
  });

  // The transport's half of M12.24: `retired` reaches the wire. Who reads a
  // retired entry is services/retired-entry.test.ts's.
  it('marks a retired entry retired to a coven whose cupboard names it', async () => {
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: compendiumId },
      A.id,
    );
    const retired = () =>
      runOperation<{ ingredient: { retired: boolean } }>(
        asUser(B),
        `query ($id: ID!, $workspaceId: ID) { ingredient(id: $id, workspaceId: $workspaceId) { retired } }`,
        { id: compendiumId, workspaceId: WORKSPACE_W_ID },
      );
    expect((await retired()).data?.ingredient).toEqual({ retired: false });

    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${E.id}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${compendiumId}`;
    });

    const result = await retired();
    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient).toEqual({ retired: true });
  });

  describe("refuses a coven's entry to everyone else", () => {
    // Why the refusals could have passed wrongly: the row is there, and its
    // coven's member reaches it by this id.
    beforeEach(async () => {
      const result = await run(asUser(B), { id: localId, workspaceId: WORKSPACE_W_ID });
      expect(result.data?.ingredient).toMatchObject({ id: localId });
    });

    it('as NOT_FOUND without a coven', async () => {
      const result = await run(asUser(B), { id: localId });

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        path: ['ingredient'],
        extensions: { code: 'NOT_FOUND' },
      });
    });

    it('as FORBIDDEN under a coven the caller is not in', async () => {
      // D is signed in and a member elsewhere.
      expect(asUser(D).userId).toBe(D.id);

      const result = await run(asUser(D), { id: localId, workspaceId: WORKSPACE_W_ID });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]).toMatchObject({
        path: ['ingredient'],
        extensions: { code: 'FORBIDDEN' },
      });
    });
  });

  // The transport's half of `variants` (MB.218): each field reaches the wire,
  // in form order, a form's own children through its loaders. Who may read
  // them is the loader matrix's
  // (tests/modules/ingredients/loaders/ingredient-children.test.ts).
  it('answers its variants in form order, each with its fields and children', async () => {
    const barkId = await curatedFormId(sql, 'Bark');
    const linkedId = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Linked', nomenclature: 'none' }),
      A.id,
    );
    const [{ id: linkedForm }] = await sql<{ id: string }[]>`
      select id from ingredient_variants where ingredient_id = ${linkedId}`;
    // Written after the fixture's own `Testform`, and sorting before it.
    const variantId = await insertVariant(
      sql,
      compendiumId,
      {
        form: 'Bark',
        formId: barkId,
        description: 'Fixture shavings',
        safetyNotes: 'Fixture caution',
        elements: ['earth', 'fire'],
        celestialBodies: ['Fixture Star'],
        zodiacSigns: ['Fixture Sign'],
        colors: ['Fixture Grey'],
        categories: ['Protection'],
        substitutes: ['Testbane'],
      },
      A.id,
    );
    // The bark stands in for the linked ingredient's form, and cites a book.
    await insertSubstituteLink(sql, compendiumId, linkedId, A.id, {
      variantId,
      substituteVariantId: linkedForm,
    });
    const book = await insertReference(sql, { title: 'Fixture Barks' }, E.id);
    await insertVariantReferenceLink(sql, variantId, book, A.id, 'p. 3');

    const result = await runOperation<{ ingredient: { variants: IngredientVariantNode[] } }>(
      null,
      `query ($id: ID!) {
        ingredient(id: $id) {
          variants {
            id form formChoice { id } description safetyNotes elements celestialBodies zodiacSigns colors
            categories { name }
            substitutes { name ingredient { id } variant { id form } }
            references { reference { title } locator }
            audit { createdBy updatedBy }
          }
        }
      }`,
      { id: compendiumId },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.ingredient.variants).toEqual([
      {
        id: variantId,
        form: 'Bark',
        formChoice: { id: barkId },
        description: 'Fixture shavings',
        safetyNotes: 'Fixture caution',
        elements: ['earth', 'fire'],
        celestialBodies: ['Fixture Star'],
        zodiacSigns: ['Fixture Sign'],
        colors: ['Fixture Grey'],
        categories: [{ name: 'Protection' }],
        substitutes: [
          {
            name: 'Fixture Linked',
            ingredient: { id: linkedId },
            variant: { id: linkedForm, form: 'Testform' },
          },
          { name: 'Testbane', ingredient: null, variant: null },
        ],
        references: [{ reference: { title: 'Fixture Barks' }, locator: 'p. 3' }],
        audit: { createdBy: A.id, updatedBy: A.id },
      },
      // The ingredient's own Testform, which owns none of the bark's children.
      expect.objectContaining({
        form: 'Testform',
        formChoice: null,
        description: null,
        categories: [],
        substitutes: [],
        references: [],
      }),
    ]);
  });

  // `Substitute.variant` is the resolver's own: the linked ingredient's form,
  // found among that ingredient's variants (MB.218).
  it("answers a substitute's form, null without one and once that form is deleted", async () => {
    const formed = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Formed', nomenclature: 'none' }),
      A.id,
    );
    const bare = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Bare', nomenclature: 'none' }),
      A.id,
    );
    const [{ id: formedForm }] = await sql<{ id: string }[]>`
      select id from ingredient_variants where ingredient_id = ${formed}`;
    await insertSubstituteLink(sql, compendiumId, formed, A.id, {
      substituteVariantId: formedForm,
    });
    await insertSubstituteLink(sql, compendiumId, bare, A.id);
    const read = async () =>
      (
        await runOperation<{
          ingredient: { substitutes: { name: string; variant: { id: string } | null }[] };
        }>(
          null,
          `query ($id: ID!) { ingredient(id: $id) { substitutes { name variant { id } } } }`,
          { id: compendiumId },
        )
      ).data?.ingredient.substitutes;

    expect(await read()).toEqual([
      { name: 'Fixture Bare', variant: null },
      { name: 'Fixture Formed', variant: { id: formedForm } },
    ]);

    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${formedForm}`;

    expect(await read()).toEqual([
      { name: 'Fixture Bare', variant: null },
      { name: 'Fixture Formed', variant: null },
    ]);
  });
});
