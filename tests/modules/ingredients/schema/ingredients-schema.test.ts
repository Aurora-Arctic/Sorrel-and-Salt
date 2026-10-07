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

// DESIGN.md §5's seven values, in the order the design doc's table lists them.
const NOMENCLATURE_VALUES = [
  'botanical',
  'fungal',
  'zoological',
  'mineral',
  'chemical',
  'unknown',
  'none',
];

const ELEMENT_VALUES = ['earth', 'air', 'fire', 'water', 'spirit'] as const;

// §5's columns and the six audit ones: what the schema declares and, once a
// dropped column's migration has run, all the database holds.
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
  const { byName, foreignKeys } = tableFacts(ingredients);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(COLUMNS);
  });

  // `workspace_id IS NULL` is the compendium, set is a workspace's own drawer:
  // one table, so spell_ingredients points at a single kind of thing.
  it('makes workspace_id nullable, and points it at workspaces', () => {
    expect(byName.workspace_id.notNull).toBe(false);

    const workspaceFk = foreignKeys.find((fk) => fk.reference().columns[0].name === 'workspace_id');
    expect(workspaceFk?.reference().foreignTable).toBe(workspaces);
    expect(workspaceFk?.reference().foreignColumns[0].name).toBe('id');
  });

  it('requires the display label and the nomenclature, and leaves the formal name optional', () => {
    expect(byName.name.notNull).toBe(true);
    expect(byName.nomenclature.notNull).toBe(true);
    expect(byName.canonical_name.notNull).toBe(false);
  });

  // "No DEFAULT, deliberately": the compendium's Zod variant asks rather than guesses.
  it('gives nomenclature no database default', () => {
    expect(byName.nomenclature.hasDefault).toBe(false);
    expect(byName.nomenclature.default).toBeUndefined();
  });

  it('declares nomenclature_kind with DESIGN.md §5s seven values', () => {
    expect(nomenclatureKind.enumValues).toEqual(NOMENCLATURE_VALUES);
  });

  // A correspondence, not identity: a closed enum, the opposite of `form`.
  it('declares ingredient_element as a closed five-value enum', () => {
    expect(ingredientElement.enumValues).toEqual(ELEMENT_VALUES);
  });

  // MB.159 stopped declaring the single, so nothing reads or writes it;
  // MB.160 then dropped it.
  it('no longer declares the single element', () => {
    expect(Object.keys(byName)).not.toContain('element');
  });

  // MB.157: the list is of the same enum, not text, so it stays closed.
  it('stores elements as an array of that enum', () => {
    expect(byName.elements.getSQLType()).toBe('ingredient_element[]');
  });

  // Text, not an FK: an FK makes an uncurated value unwritable and would put a
  // non-IMMUTABLE enum cast inside the generated expression.
  it('keeps form as free text rather than an enum or a foreign key', () => {
    expect(byName.form.getSQLType()).toBe('text');
    expect(foreignKeys.some((fk) => fk.reference().columns[0].name === 'form')).toBe(false);
  });

  // MB.165: the curated row a member picked, beside the text and never
  // instead of it, so optional — typed text links nothing.
  it('records a picked form as a nullable key beside the text', () => {
    expect(byName.form_id.getSQLType()).toBe('uuid');
    expect(byName.form_id.notNull).toBe(false);
    const formFk = foreignKeys.find((fk) => fk.reference().columns[0].name === 'form_id');
    expect(formFk?.reference().foreignTable).toBe(ingredientForms);
  });

  it('stores planets, zodiac signs and colours as array columns', () => {
    for (const column of ['planets', 'zodiac_signs', 'colors']) {
      expect(byName[column].getSQLType()).toBe('text[]');
    }
  });

  // MB.80: the public address, derived by whoever writes the row, so no default.
  it('requires slug, with no default', () => {
    expect(byName.slug.getSQLType()).toBe('text');
    expect(byName.slug.notNull).toBe(true);
    expect(byName.slug.hasDefault).toBe(false);
  });

  // Drizzle omits a generated column from $inferInsert, so TypeScript refuses
  // first; `npm run typecheck` covers this file, so the @ts-expect-error
  // reddens if the column ever becomes writable. Postgres's refusal is below.
  it('omits canonical_key from $inferInsert, so TypeScript refuses a direct write', () => {
    const insert: typeof ingredients.$inferInsert = {
      name: 'Mugwort',
      nomenclature: 'botanical',
      canonicalName: 'Artemisia vulgaris',
      createdBy: '11111111-1111-1111-1111-111111111111',
      updatedBy: '11111111-1111-1111-1111-111111111111',
      // @ts-expect-error canonical_key is GENERATED ALWAYS — not an insertable column
      canonicalKey: 'artemisia vulgaris',
    };
    expect(insert.name).toBe('Mugwort');

    // The select side still carries it: it is readable, just not writable.
    const selected: typeof ingredients.$inferSelect = {} as typeof ingredients.$inferSelect;
    expect('canonicalKey' in ({ canonicalKey: selected.canonicalKey } as object)).toBe(true);
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
const catalogue = useTestDatabase((client) => (sql = client));

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
  // A column the schema has stopped declaring outlives it in the database for
  // one deploy, until its drop. None is pending: `deities`, undeclared by
  // MB.167 for `ingredient_deities`, was the last, and MB.168 dropped it.
  it('carries the columns the schema declares and no other', async () => {
    expect(await catalogue.columnNames('ingredients')).toEqual([...COLUMNS].sort());
  });

  it('declares no deities column, so nothing can write the list the app no longer reads', () => {
    expect(Object.keys(tableFacts(ingredients).byName)).not.toContain('deities');
  });

  it('rejects an insert that omits nomenclature, since the column has no default', async () => {
    const error = await failureOf(sql`
      insert into ingredients (name, canonical_name, slug, created_by, updated_by)
      values ('Mugwort', 'Artemisia vulgaris', 'mugwort', ${AUTHOR}, ${AUTHOR})
    `);

    // 23502 is not_null_violation: the column was reached and found no default.
    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('nomenclature');
  });

  // Derived by whoever writes the row, never defaulted by the table: a default
  // would be a second slug rule, in SQL.
  it('rejects an insert that omits slug, since the column has no default', async () => {
    const error = await failureOf(sql`
      insert into ingredients (name, nomenclature, canonical_name, created_by, updated_by)
      values ('Mugwort', 'botanical', 'Artemisia vulgaris', ${AUTHOR}, ${AUTHOR})
    `);

    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('slug');
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
      for (const nomenclature of [
        'botanical',
        'fungal',
        'zoological',
        'mineral',
        'chemical',
      ] as const) {
        const error = await failureOf(insert({ nomenclature, canonicalName: null }));
        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe('ingredients_nomenclature_declares_canonical_name');
      }
    });

    // The row the old biconditional refused, beside the one it already took.
    it('accepts unknown with a formal name and without one', async () => {
      await insert({ nomenclature: 'unknown', canonicalName: 'Fixtura testalis' });
      await insert({ nomenclature: 'unknown', canonicalName: null, name: 'Testroot' });

      const rows = await sql`
        select canonical_name from ingredients
        where nomenclature = 'unknown' order by canonical_name nulls last
      `;
      expect(rows.map((r) => r.canonical_name)).toEqual(['Fixtura testalis', null]);
    });

    // Without these, a CHECK that rejected everything would pass the tests above.
    it('accepts the two shapes it exists to allow', async () => {
      await insert({ nomenclature: 'none', canonicalName: null, name: 'Graveyard dirt' });
      await insert({
        nomenclature: 'mineral',
        canonicalName: 'Quartz var. amethyst',
        name: 'Amethyst',
      });

      const [{ count }] = await sql`select count(*)::int as count from ingredients`;
      expect(count).toBe(2);
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
    it('is refused by Postgres on insert, not merely absent from the type', async () => {
      const error = await failureOf(sql`
        insert into ingredients (name, nomenclature, canonical_name, slug, canonical_key, created_by, updated_by)
        values ('Mugwort', 'botanical', 'Artemisia vulgaris', 'mugwort', 'forged', ${AUTHOR}, ${AUTHOR})
      `);

      // 428C9 is ERRCODE_GENERATED_ALWAYS — the column refusing the write itself.
      expect(error.code).toBe('428C9');
    });

    it('is refused by Postgres on update', async () => {
      const id = await insert();
      const error = await failureOf(
        sql`update ingredients set canonical_key = 'forged' where id = ${id}`,
      );
      expect(error.code).toBe('428C9');
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
      const elements = [...ELEMENT_VALUES].reverse();
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
