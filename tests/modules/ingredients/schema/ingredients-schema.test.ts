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
import { workspaces } from '@/modules/coven/schema/workspaces';
import { ingredientForms } from '@/modules/vocabulary/schema/ingredient-forms';
import type { IngredientOverrides } from './types';

// §5's columns and the six audit ones.
const COLUMNS = [
  'id',
  'workspace_id',
  'name',
  'canonical_name',
  'nomenclature',
  'canonical_key',
  'form',
  'form_id',
  'description',
  'elements',
  'planets',
  'zodiac_signs',
  'colors',
  'safety_notes',
  'slug',
  ...AUDIT_COLUMNS,
].sort();

describe('ingredients schema', () => {
  const { byName, nonAuditForeignKeys } = tableFacts(ingredients);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(COLUMNS);
  });

  // Text, not a foreign key, is what keeps an uncurated value writable: the
  // form, the astrology lists and a deity's name (ingredient_deities) are text
  // over their vocabularies, and the curated form a member picked is `form_id`,
  // a key beside the text and never instead of it (MB.165;
  // claude-docs/db/identity-model.md, "The ingredient identity model").
  it('keys its workspace and the form it picked, and no vocabulary its text names', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, fk.foreignTable]).sort()).toEqual([
      ['form_id', ingredientForms],
      ['workspace_id', workspaces],
    ]);
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
    insert into ingredients ${sql(row(overrides))} returning id, canonical_key
  `;
  return inserted.id as string;
}

async function canonicalKeyOf(id: string): Promise<string> {
  const [found] = await sql`select canonical_key from ingredients where id = ${id}`;
  return found.canonical_key as string;
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

  // Three cases (MB.161): none takes no formal name, a named kind takes one,
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

  describe('the non-blank checks', () => {
    it('rejects a blank-but-present formal name', async () => {
      const error = await failureOf(insert({ canonicalName: '   ' }));
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_canonical_name_not_blank');
    });

    it('rejects a blank-but-present form', async () => {
      const error = await failureOf(insert({ form: '   ' }));
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_form_not_blank');
    });

    // A blank form is rejected; an *absent* one is not — form is optional.
    it('accepts a null form', async () => {
      const id = await insert({ form: null, canonicalName: 'Artemisia vulgaris' });
      expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris');
    });

    // The vocabulary is an autofill, not a constraint: `rhizome` is writable uncurated.
    it('accepts a form absent from the curated vocabulary', async () => {
      const id = await insert({ form: 'rhizome', canonicalName: 'Artemisia vulgaris' });
      expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris :: rhizome');
    });
  });

  describe('canonical_key', () => {
    it('is refused by Postgres on insert and on update', async () => {
      const inserting = await failureOf(sql`
        insert into ingredients (name, nomenclature, canonical_name, slug, canonical_key, created_by, updated_by)
        values ('Testwort', 'botanical', 'Fixtura testalis', 'testwort', 'forged', ${AUTHOR}, ${AUTHOR})
      `);
      const id = await insert();
      const updating = await failureOf(
        sql`update ingredients set canonical_key = 'forged' where id = ${id}`,
      );

      // 428C9 is ERRCODE_GENERATED_ALWAYS — the column refusing the write itself.
      expect(inserting.code).toBe('428C9');
      expect(updating.code).toBe('428C9');
    });

    it('folds case and surrounding space, so Root Bark and root bark are one key', async () => {
      const shouted = await insert({ form: 'Root Bark', canonicalName: 'Artemisia vulgaris' });
      const muttered = await insert({
        form: '  root bark  ',
        name: 'Mugwort (second jar)',
        canonicalName: 'Artemisia vulgaris',
        workspaceId: WORKSPACE,
      });

      expect(await canonicalKeyOf(shouted)).toBe('artemisia vulgaris :: root bark');
      expect(await canonicalKeyOf(muttered)).toBe(await canonicalKeyOf(shouted));
    });

    it('falls back to the display label when the row declares no formal name', async () => {
      const id = await insert({
        nomenclature: 'none',
        canonicalName: null,
        name: 'Graveyard Dirt',
        form: null,
      });
      expect(await canonicalKeyOf(id)).toBe('graveyard dirt');
    });

    // Identity is the formal name plus the form: valerian root and leaf are two.
    it('separates two rows sharing a formal name but not a form', async () => {
      const root = await insert({
        name: 'Valerian root',
        canonicalName: 'Valeriana officinalis',
        form: 'root',
      });
      const leaf = await insert({
        name: 'Valerian leaf',
        canonicalName: 'Valeriana officinalis',
        form: 'leaf',
      });

      expect(await canonicalKeyOf(root)).toBe('valeriana officinalis :: root');
      expect(await canonicalKeyOf(leaf)).toBe('valeriana officinalis :: leaf');
    });

    describe('recomputation', () => {
      it('leaves the key unchanged when a row carrying a formal name is relabelled', async () => {
        const id = await insert({
          name: 'Mugwort',
          canonicalName: 'Artemisia vulgaris',
          form: 'herb',
        });
        expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris :: herb');

        await sql`update ingredients set name = 'Cronewort' where id = ${id}`;

        // Pinned to the value: an ungenerated column would also survive a relabel.
        expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris :: herb');
        // And the relabel happened, so a silent no-op update cannot pass either.
        const [{ name }] = await sql`select name from ingredients where id = ${id}`;
        expect(name).toBe('Cronewort');
      });

      it('recomputes the key when a row carrying no formal name is relabelled', async () => {
        const id = await insert({
          nomenclature: 'none',
          canonicalName: null,
          name: 'Moon water',
          form: null,
        });
        expect(await canonicalKeyOf(id)).toBe('moon water');

        await sql`update ingredients set name = 'Full moon water' where id = ${id}`;

        expect(await canonicalKeyOf(id)).toBe('full moon water');
      });

      it('recomputes the key whenever the form changes, formal name or not', async () => {
        const named = await insert({ form: 'herb', canonicalName: 'Artemisia vulgaris' });
        await sql`update ingredients set form = 'leaf' where id = ${named}`;
        expect(await canonicalKeyOf(named)).toBe('artemisia vulgaris :: leaf');

        const unnamed = await insert({
          nomenclature: 'none',
          canonicalName: null,
          name: 'Coffin nail',
          form: 'curio',
        });
        await sql`update ingredients set form = 'whole' where id = ${unnamed}`;
        expect(await canonicalKeyOf(unnamed)).toBe('coffin nail :: whole');
      });
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

  // MB.165: `form_id` records the curated row a pick named, and only beside
  // the text it names — a link with no text would key identity on nothing.
  describe('form_id', () => {
    async function aForm(): Promise<string> {
      const t = crypto.randomUUID().slice(0, 8);
      const [group] = await sql`
        insert into ingredient_form_groups ${sql({
          name: `Testformgroup ${t}`,
          slug: `testformgroup-${t}`,
          description: 'A group kept only by fixtures.',
          created_by: AUTHOR,
          updated_by: AUTHOR,
        })}
        returning id
      `;
      const [form] = await sql`
        insert into ingredient_forms ${sql({
          name: `Testform ${t}`,
          slug: `testform-${t}`,
          description: 'A form kept only by fixtures.',
          group_id: group.id as string,
          created_by: AUTHOR,
          updated_by: AUTHOR,
        })}
        returning id
      `;
      return form.id as string;
    }

    // Why the refusal could have been a success: the same id links beside a form.
    it('refuses a link with no form beside it', async () => {
      const form = await aForm();
      const named = await insert({ form: 'Testform' });
      await sql`update ingredients set form_id = ${form} where id = ${named}`;
      const unnamed = await insert({
        form: null,
        name: 'Testroot',
        canonicalName: 'Fixtura radix',
      });

      const error = await failureOf(
        sql`update ingredients set form_id = ${form} where id = ${unnamed}`,
      );

      // 23514 is check_violation, named: the refusal is this CHECK's.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredients_form_id_has_form');
    });
  });
});
