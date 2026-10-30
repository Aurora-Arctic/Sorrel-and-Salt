import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import {
  type IngredientFixture,
  ingredientColumns,
  makeIngredient,
} from '../../../support/fixtures';
import {
  ingredientElement,
  ingredients,
  nomenclatureKind,
} from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { IngredientOverrides } from './types';

// §5's columns and the six audit ones.
const COLUMNS = [
  'id',
  'workspace_id',
  'name',
  'canonical_name',
  'nomenclature',
  'identity_key',
  'description',
  'elements',
  'celestial_bodies',
  'zodiac_signs',
  'colors',
  'safety_notes',
  'toxic',
  'seed_content_hash',
  'curator_reviewed_at',
  'curator_reviewed_by',
  'slug',
  'seed_key',
  'revision',
  ...AUDIT_COLUMNS,
].sort();

describe('ingredients schema', () => {
  const { byName } = tableFacts(ingredients);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(COLUMNS);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const WORKSPACE = WORKSPACE_W_ID;

// The shared factory plus this file's author. `makeIngredient` re-derives
// `canonicalName` when `nomenclature` alone is overridden, so only a test
// naming both writes a row the kind↔name CHECK rejects.
function row(overrides: IngredientOverrides = {}): Record<string, unknown> {
  return {
    ...ingredientColumns(makeIngredient(overrides)),
    created_by: AUTHOR,
    updated_by: AUTHOR,
  };
}

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function insert(overrides: IngredientOverrides = {}): Promise<string> {
  const [inserted] = await sql`
    insert into ingredients ${sql(row(overrides))} returning id
  `;
  return inserted.id as string;
}

async function identityKeyOf(id: string): Promise<string> {
  const [found] = await sql`select identity_key from ingredients where id = ${id}`;
  return found.identity_key as string;
}

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('ingredients table', () => {
  // A closed list is the database's and the code's alike (DESIGN.md §5).
  it('holds the nomenclature kinds and the elements the code declares', async () => {
    const [row] = await sql`
      select enum_range(null::nomenclature_kind)::text[] as kinds,
             enum_range(null::ingredient_element)::text[] as elements
    `;

    expect(row.kinds).toEqual(nomenclatureKind.enumValues);
    expect(row.elements).toEqual(ingredientElement.enumValues);
  });

  // "No DEFAULT, deliberately": the compendium's Zod variant asks rather than guesses.
  it('rejects an insert that omits nomenclature, since the column has no default', async () => {
    const error = await failureOf(sql`
      insert into ingredients (name, canonical_name, slug, created_by, updated_by)
      values ('Mugwort', 'Artemisia vulgaris', 'mugwort', ${AUTHOR}, ${AUTHOR})
    `);

    // 23502 is not_null_violation: the column was reached and found no default.
    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('nomenclature');
  });

  it('accepts a row in each tier: compendium (workspace_id null) and workspace-local', async () => {
    await insert();
    await insert({
      workspaceId: WORKSPACE,
      name: 'Mugwort',
      canonicalName: null,
      nomenclature: 'none',
    });

    const rows = await sql`select workspace_id from ingredients order by workspace_id nulls first`;
    expect(rows.map((r) => r.workspace_id)).toEqual([null, WORKSPACE]);
  });

  // Three cases: none takes no formal name, a named kind takes one,
  // and unknown takes either.
  describe('the nomenclature/canonicalName CHECK', () => {
    // Both directions: a one-directional CHECK would let exactly one of these through.
    it('rejects none carrying a formal name', async () => {
      const error = await failureOf(
        insert({ nomenclature: 'none', canonicalName: 'Fixtura testalis' }),
      );
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_nomenclature_declares_canonical_name');
    });

    it('rejects any other kind carrying no formal name', async () => {
      const error = await failureOf(insert({ nomenclature: 'fungal', canonicalName: null }));
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_nomenclature_declares_canonical_name');
    });

    // Without these, a CHECK that rejected everything would pass the tests
    // above; unknown with a formal name is the row the old biconditional refused.
    it('accepts none without a formal name, a named kind with one, and unknown either way', async () => {
      await insert({ nomenclature: 'none', canonicalName: null, name: 'Testdust' });
      await insert({ nomenclature: 'mineral', canonicalName: 'Fixturite var. test' });
      await insert({
        nomenclature: 'unknown',
        canonicalName: 'Fixtura testalis',
        name: 'Testleaf',
      });
      await insert({ nomenclature: 'unknown', canonicalName: null, name: 'Testroot' });

      const rows = await sql`
        select nomenclature, canonical_name from ingredients
        order by nomenclature, canonical_name nulls last
      `;
      expect(rows.map((r) => [r.nomenclature, r.canonical_name])).toEqual([
        ['mineral', 'Fixturite var. test'],
        ['unknown', 'Fixtura testalis'],
        ['unknown', null],
        ['none', null],
      ]);
    });
  });

  describe('the non-blank check', () => {
    it('rejects a blank-but-present formal name', async () => {
      const error = await failureOf(insert({ canonicalName: '   ' }));
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_canonical_name_not_blank');
    });
  });

  // Identity is the formal name alone, falling back to the
  // label; the form is a variant's and no part of it.
  describe('identity_key', () => {
    it('is refused by Postgres on insert and on update', async () => {
      const inserting = await failureOf(sql`
        insert into ingredients (name, nomenclature, canonical_name, slug, identity_key, created_by, updated_by)
        values ('Testwort', 'botanical', 'Fixtura testalis', 'testwort', 'forged', ${AUTHOR}, ${AUTHOR})
      `);
      const id = await insert();
      const updating = await failureOf(
        sql`update ingredients set identity_key = 'forged' where id = ${id}`,
      );

      // 428C9 is ERRCODE_GENERATED_ALWAYS — the column refusing the write itself.
      expect(inserting.code).toBe('428C9');
      expect(updating.code).toBe('428C9');
    });

    it('folds the formal name, and falls back to the label', async () => {
      const named = await insert({ canonicalName: 'Valeriana Officinalis' });
      const unnamed = await insert({
        nomenclature: 'none',
        canonicalName: null,
        name: 'Graveyard Dirt',
      });

      expect(await identityKeyOf(named)).toBe('valeriana officinalis');
      expect(await identityKeyOf(unnamed)).toBe('graveyard dirt');
    });

    // Valerian root and leaf are one identity, so one entry with two forms
    // . Two tiers, since the index holds a formal name once per tier.
    it('keys two rows of one formal name alike whatever their labels', async () => {
      const root = await insert({ name: 'Valerian root', canonicalName: 'Valeriana officinalis' });
      const leaf = await insert({
        name: 'Valerian leaf',
        canonicalName: 'Valeriana officinalis',
        workspaceId: WORKSPACE,
      });

      expect(await identityKeyOf(leaf)).toBe(await identityKeyOf(root));
    });

    it('follows a relabel only where the row declares no formal name', async () => {
      const named = await insert({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      const unnamed = await insert({
        nomenclature: 'none',
        canonicalName: null,
        name: 'Moon water',
      });

      await sql`update ingredients set name = 'Cronewort' where id = ${named}`;
      await sql`update ingredients set name = 'Full moon water' where id = ${unnamed}`;

      expect(await identityKeyOf(named)).toBe('artemisia vulgaris');
      expect(await identityKeyOf(unnamed)).toBe('full moon water');
      // And the write happened, so a silent no-op update cannot pass.
      const [{ name }] = await sql`select name from ingredients where id = ${named}`;
      expect(name).toBe('Cronewort');
    });
  });

  describe('elements', () => {
    it('accepts all five documented values in one list, in the order given', async () => {
      const elements = [...ingredientElement.enumValues].reverse();
      const id = await insert({ elements, workspaceId: WORKSPACE });

      const [row] = await sql`select elements from ingredients where id = ${id}`;
      expect(row.elements).toEqual(elements);
    });

    it('rejects a value outside that set', async () => {
      // Cast: the fixture is typed against the column; the database must refuse it.
      const elements = ['fire', 'aether'] as IngredientFixture['elements'];
      const error = await failureOf(insert({ elements }));
      // 22P02 is invalid_text_representation: the enum cast refusing the value.
      expect(error.code).toBe('22P02');
    });
  });
});
