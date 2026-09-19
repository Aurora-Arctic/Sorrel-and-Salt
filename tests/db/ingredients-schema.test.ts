import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  type IngredientFixture,
  type Overrides,
  ingredientColumns,
  makeIngredient,
} from '../support/fixtures';
import { ingredientElement, ingredients, nomenclatureKind } from '@/db/schema/ingredients';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { workspaces } from '@/db/schema/workspaces';
import { users } from '@/db/schema/users';

const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

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

describe('ingredients schema', () => {
  const { columns, foreignKeys } = getTableConfig(ingredients);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'workspace_id',
        'name',
        'canonical_name',
        'nomenclature',
        'canonical_key',
        'form',
        'description',
        'element',
        'planet',
        'zodiac',
        'deities',
        'color',
        'safety_notes',
        'substitutes',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });

  // The two tiers of DESIGN.md §5: `workspace_id IS NULL` is the global
  // compendium, `workspace_id` set is one workspace's own drawer. One table,
  // so spell_ingredients points at a single kind of thing.
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

  // DESIGN.md §5: "no DEFAULT, deliberately" — the missing default is what
  // makes the compendium's Zod variant ask the admin rather than guess.
  it('gives nomenclature no database default', () => {
    expect(byName.nomenclature.hasDefault).toBe(false);
    expect(byName.nomenclature.default).toBeUndefined();
  });

  it('declares nomenclature_kind with DESIGN.md §5s seven values', () => {
    expect(nomenclatureKind.enumValues).toEqual(NOMENCLATURE_VALUES);
  });

  // `element` is a correspondence, not identity: a closed five-value enum,
  // the exact opposite of `form`.
  it('declares element as a closed five-value enum', () => {
    expect(ingredientElement.enumValues).toEqual(ELEMENT_VALUES);
  });

  // `form` is text over an admin-curated vocabulary, *not* a foreign key to
  // ingredient_forms — an FK would make an uncurated value unwritable, and
  // would put an enum cast (not IMMUTABLE) inside the generated expression.
  it('keeps form as free text rather than an enum or a foreign key', () => {
    expect(byName.form.getSQLType()).toBe('text');
    expect(foreignKeys.some((fk) => fk.reference().columns[0].name === 'form')).toBe(false);
  });

  it('stores deities and substitutes as array columns', () => {
    expect(byName.deities.getSQLType()).toBe('text[]');
    expect(byName.substitutes.getSQLType()).toBe('text[]');
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    const byColumn = Object.fromEntries(
      foreignKeys.map((fk) => {
        const { columns: local, foreignColumns, foreignTable } = fk.reference();
        return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
      }),
    );

    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(byColumn[column]).toBeDefined();
      expect(byColumn[column].foreignColumnName).toBe('id');
      expect(byColumn[column].foreignTable).toBe(users);
    }
  });

  // Half of the acceptance criterion "canonical_key cannot be inserted or
  // updated directly": Drizzle omits a generated column from $inferInsert, so
  // TypeScript refuses before Postgres is reached. `npm run typecheck` covers
  // src/**/*, this file included, so the @ts-expect-error below fails the
  // typecheck gate if the column ever becomes writable. The other half — that
  // Postgres refuses too — is asserted against the real table further down.
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

// The behaviour half, against the real table. This worker's sorrel_test_<n>
// clone arrives with every migration applied and the `standard` scenario
// seeded (M1.27, tests/support/db-setup.ts), and re-cloned that way before
// this file runs — so what is asserted below is the SQL production runs, with
// no schema built here and nothing to put back afterwards. Until M1.27 the
// template was empty: this file applied the one migration that ships the
// table and stubbed `users`/`workspaces` to a bare `id` column.
//
// The author and the workspace are the seed's, not invented ids: the real
// `users` and `workspaces` have NOT NULL names, slugs and audit stamps, and a
// row that exists is cheaper to point at than one to construct. Bound to the
// old names so the tests read as they did.
const AUTHOR = FIXTURE_USERS.A.id;
const WORKSPACE = WORKSPACE_W_ID;

// M1.25 — the shared factory, plus this file's own author. The audit stamps
// are not the fixture's to give (CLAUDE.md rule 3), and `makeIngredient` is
// what keeps a row stating one field from contradicting itself: overriding
// `nomenclature` alone re-derives `canonicalName` to match, so only a test
// that names *both* writes a row the biconditional CHECK rejects — which is
// exactly what the tests below that expect a rejection do.
type IngredientOverrides = Overrides<IngredientFixture>;

function row(overrides: IngredientOverrides = {}): Record<string, unknown> {
  return {
    ...ingredientColumns(makeIngredient(overrides)),
    created_by: AUTHOR,
    updated_by: AUTHOR,
  };
}

let sql: ReturnType<typeof postgres>;

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

async function failureOf(work: Promise<unknown>) {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

// `truncate … cascade`, not `delete from`: the seeded compendium's rows have
// category and folk-name links, and every child foreign key in the schema is
// NO ACTION, so a delete would be refused. Truncating takes the links with
// it, and the empty table is what every test below assumes — the same
// starting state the old empty template gave, reached the other way round.
beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

afterAll(async () => {
  await sql.end();
});

describe('ingredients table', () => {
  it('rejects an insert that omits nomenclature, since the column has no default', async () => {
    const error = await failureOf(sql`
      insert into ingredients (name, canonical_name, created_by, updated_by)
      values ('Mugwort', 'Artemisia vulgaris', ${AUTHOR}, ${AUTHOR})
    `);

    // 23502 is not_null_violation: proof the insert reached the column and
    // found no default waiting, rather than failing somewhere earlier.
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

  describe('the nomenclature/canonicalName biconditional', () => {
    // Both directions, because a one-directional CHECK would let exactly one
    // of these two rows through and DESIGN.md §5 forbids both.
    it('rejects none or unknown carrying a formal name', async () => {
      for (const nomenclature of ['none', 'unknown'] as const) {
        const error = await failureOf(
          insert({ nomenclature, canonicalName: 'Artemisia vulgaris' }),
        );
        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe('ingredients_nomenclature_declares_canonical_name');
      }
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

    // The rows the CHECK must let through — without these two, every
    // assertion above would also pass against a constraint that rejected
    // everything.
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

    // The vocabulary is an autofill, not a constraint: `rhizome` is writable
    // before anyone has curated it (DESIGN.md §5).
    it('accepts a form absent from the curated vocabulary', async () => {
      const id = await insert({ form: 'rhizome', canonicalName: 'Artemisia vulgaris' });
      expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris :: rhizome');
    });
  });

  describe('canonical_key', () => {
    it('is refused by Postgres on insert, not merely absent from the type', async () => {
      const error = await failureOf(sql`
        insert into ingredients (name, nomenclature, canonical_name, canonical_key, created_by, updated_by)
        values ('Mugwort', 'botanical', 'Artemisia vulgaris', 'forged', ${AUTHOR}, ${AUTHOR})
      `);

      // 428C9 is ERRCODE_GENERATED_ALWAYS — the column refusing the write
      // itself, rather than an unknown-column or type error.
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

    // Identity is the formal name plus the form: valerian root and valerian
    // leaf are two identities, which is what folding form into the key buys.
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

        // Pinned to the value rather than to "whatever it was before": a
        // plain, ungenerated column would also be unchanged by a relabel.
        expect(await canonicalKeyOf(id)).toBe('artemisia vulgaris :: herb');
        // And the relabelling did happen — otherwise an update that silently
        // did nothing would pass this test too.
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

  describe('element', () => {
    it('accepts each of its five documented values', async () => {
      for (const element of ELEMENT_VALUES) {
        // Five rows in one workspace, so five identities: the factory's default
        // canonical name would make them one identity five times over, which
        // `ingredients_workspace_identity_unique` (M4.7) refuses. Unseen before
        // M1.27, when this file applied only the migration that created the
        // table and never met the index a later one added.
        await insert({
          element,
          name: `Mugwort (${element})`,
          canonicalName: `Fixtura ${element}`,
          workspaceId: WORKSPACE,
        });
      }

      const [{ count }] =
        await sql`select count(*)::int as count from ingredients where element is not null`;
      expect(count).toBe(ELEMENT_VALUES.length);
    });

    it('rejects a value outside that set', async () => {
      // Cast, because the fixture is typed against the column and the whole
      // point of this row is a value the column has never heard of — the
      // database has to be the one to refuse it.
      const error = await failureOf(insert({ element: 'aether' as IngredientFixture['element'] }));
      // 22P02 is invalid_text_representation: the enum cast refusing the
      // value, rather than the row failing some other constraint first.
      expect(error.code).toBe('22P02');
    });
  });
});
