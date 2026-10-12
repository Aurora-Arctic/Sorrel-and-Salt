import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientColumns, makeIngredient } from '../../../support/fixtures';
import { retiredIngredientSlugs } from '@/modules/ingredients/schema/retired-ingredient-slugs';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Retired } from './types';

// MB.80's ledger: a slug an ingredient moved off, answering a 308 and reserved
// until `expires_at`. The columns and the generated expiry only — MB.82 is
// the first thing to read it (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").

describe('retired_ingredient_slugs schema', () => {
  const { byName } = tableFacts(retiredIngredientSlugs);

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
});

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

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
