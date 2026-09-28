import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientColumns, makeIngredient } from '../../../support/fixtures';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '@/modules/ingredients/schema/retired-ingredient-slugs';
import { workspaces } from '@/modules/coven/schema/workspaces';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// MB.80's ledger: a slug an ingredient moved off, answering a 308 and reserved
// until `expires_at`. The columns and the generated expiry only — MB.82 is
// the first thing to read it (claude-docs/db.md, "Ingredient slugs").

const SLUG_INDEX = 'retired_ingredient_slugs_slug_idx';

describe('retired_ingredient_slugs schema', () => {
  const { byName, byIndexName, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(retiredIngredientSlugs);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'ingredient_id',
        'workspace_id',
        'slug',
        'retired_at',
        'expires_at',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });

  it('points ingredient_id at ingredients, required', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
  });

  // Mirrors the ingredient's scope: null for a compendium entry, its coven for a local.
  it('points workspace_id at workspaces, nullable, and references nothing else', () => {
    expect(byName.workspace_id.notNull).toBe(false);
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(nonAuditForeignKeys.map((fk) => fk.column).sort()).toEqual([
      'ingredient_id',
      'workspace_id',
    ]);
  });

  it('requires the slug and the retirement time, the latter defaulting to now', () => {
    expect(byName.slug.getSQLType()).toBe('text');
    expect(byName.slug.notNull).toBe(true);
    // `timestamp`, not `timestamptz`, like every timestamp here; it holds UTC.
    expect(byName.retired_at.getSQLType()).toBe('timestamp');
    expect(byName.retired_at.notNull).toBe(true);
    expect(byName.retired_at.hasDefault).toBe(true);
  });

  // Drizzle omits a generated column from $inferInsert, so TypeScript refuses
  // first; `npm run typecheck` covers this file. Postgres's refusal is below.
  it('omits expires_at from $inferInsert, so TypeScript refuses a direct write', () => {
    const insert: typeof retiredIngredientSlugs.$inferInsert = {
      ingredientId: '11111111-1111-1111-1111-111111111111',
      slug: 'old-slug',
      createdBy: '11111111-1111-1111-1111-111111111111',
      updatedBy: '11111111-1111-1111-1111-111111111111',
      // @ts-expect-error expires_at is GENERATED ALWAYS — not an insertable column
      expiresAt: new Date(),
    };
    expect(insert.slug).toBe('old-slug');
  });

  // Plain, not unique: a slug may be retired more than once over the years —
  // reclaimed and moved off again — and the reservation is a predicate on
  // `expires_at`, not a row's uniqueness.
  it('indexes the slug, neither unique nor partial, and nothing else', () => {
    expect(Object.keys(byIndexName)).toEqual([SLUG_INDEX]);
    expect(byIndexName[SLUG_INDEX].config.unique).toBe(false);
    expect(byIndexName[SLUG_INDEX].config.where).toBeUndefined();
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function insertIngredient(workspaceId: string | null = null): Promise<string> {
  const [row] = await sql`
    insert into ingredients ${sql({
      ...ingredientColumns(makeIngredient({ workspaceId })),
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })} returning id
  `;
  return row.id as string;
}

interface Retired {
  retired_at: string;
  expires_at: string;
}

/** A retirement stamped at `retiredAt`, both stamps read back as text so no driver clock reinterprets them. */
async function retire(
  ingredientId: string,
  retiredAt: string,
  workspaceId: string | null = null,
): Promise<Retired> {
  const [row] = await sql<Retired[]>`
    insert into retired_ingredient_slugs ${sql({
      ingredient_id: ingredientId,
      workspace_id: workspaceId,
      slug: 'old-slug',
      retired_at: retiredAt,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning retired_at::text, expires_at::text
  `;
  return row;
}

beforeEach(async () => {
  await sql`truncate retired_ingredient_slugs, ingredients cascade`;
});

describe('retired_ingredient_slugs table', () => {
  it('holds a compendium retirement and a workspace one', async () => {
    const compendium = await insertIngredient();
    const local = await insertIngredient(WORKSPACE_W_ID);

    await retire(compendium, '2026-01-01 00:00:00');
    await retire(local, '2026-01-01 00:00:00', WORKSPACE_W_ID);

    const rows = await sql`
      select workspace_id from retired_ingredient_slugs order by workspace_id nulls first
    `;
    expect(rows.map((r) => r.workspace_id)).toEqual([null, WORKSPACE_W_ID]);
  });

  it('carries the slug index in the catalogue', async () => {
    const index = await catalogue.indexRow('retired_ingredient_slugs', SLUG_INDEX);

    expect(index?.unique).toBe(false);
    expect(index?.predicate).toBeNull();
    expect(index?.definition).toContain('USING btree (slug)');
  });

  it('stamps retired_at from the database clock when the row leaves it unsaid', async () => {
    const id = await insertIngredient();

    const [row] = await sql<{ retired_at: Date; now: Date }[]>`
      insert into retired_ingredient_slugs (ingredient_id, slug, created_by, updated_by)
      values (${id}, 'old-slug', ${AUTHOR}, ${AUTHOR})
      returning retired_at, now()::timestamp as now
    `;

    expect(row.retired_at).toEqual(row.now);
  });

  describe('expires_at', () => {
    it('is a stored generated column', async () => {
      const [column] = await sql<{ is_generated: string; generation_expression: string }[]>`
        select is_generated, generation_expression from information_schema.columns
        where table_name = 'retired_ingredient_slugs' and column_name = 'expires_at'
      `;

      expect(column.is_generated).toBe('ALWAYS');
      expect(column.generation_expression).toContain('180 days');
    });

    // The window ends at midnight, not 180 days of seconds after the rename:
    // exact whatever the hour, and one instant for every row retired that day.
    it('reads 00:00 UTC of the retirement’s calendar date plus 180 days, whatever the hour', async () => {
      const id = await insertIngredient();
      const cases = [
        ['2026-03-15 00:00:00', '2026-09-11 00:00:00'],
        ['2026-03-15 12:34:56.789', '2026-09-11 00:00:00'],
        ['2026-03-15 23:59:59.999', '2026-09-11 00:00:00'],
        // Calendar days across a leap day: 2028-02-29 is one of the 180.
        ['2027-12-31 23:00:00', '2028-06-28 00:00:00'],
      ];

      for (const [retiredAt, expiresAt] of cases) {
        expect((await retire(id, retiredAt)).expires_at).toBe(expiresAt);
      }
    });

    it('is refused by Postgres on insert and on update, not merely absent from the type', async () => {
      const id = await insertIngredient();

      const inserted = await failureOf(sql`
        insert into retired_ingredient_slugs (ingredient_id, slug, expires_at, created_by, updated_by)
        values (${id}, 'old-slug', '2030-01-01 00:00:00', ${AUTHOR}, ${AUTHOR})
      `);
      // 428C9 is ERRCODE_GENERATED_ALWAYS — the column refusing the write itself.
      expect(inserted.code).toBe('428C9');

      await retire(id, '2026-01-01 00:00:00');
      const updated = await failureOf(
        sql`update retired_ingredient_slugs set expires_at = '2030-01-01 00:00:00'`,
      );
      expect(updated.code).toBe('428C9');
    });
  });
});
