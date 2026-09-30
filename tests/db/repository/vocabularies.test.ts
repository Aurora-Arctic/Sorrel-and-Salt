import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findIngredientFormValues } from '@/db/repository';
import { resolvePage } from '@/lib/pagination';
import type { ingredientForms } from '@/modules/vocabulary/schema/ingredient-forms';
import { A } from '../../support/as-user';
import type { ConnectionArgs, Page } from '@/lib/types';

// The curated form vocabulary as `ingredientFormValues` pages it: every live
// form whose group is live too, in (name, id) order — the same "curated"
// `findVocabularySuggestions` means (claude-docs/db.md, "The compendium read").

type Row = typeof ingredientForms.$inferSelect;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

// The seed is shared by every test in this file, so each undoes its own tombstones.
afterEach(async () => {
  await sql`update ingredient_forms set deleted_at = null, deleted_by = null`;
  await sql`update ingredient_form_groups set deleted_at = null, deleted_by = null`;
});

function pageOf(args: ConnectionArgs = {}): Promise<Page<Row>> {
  return resolvePage(args, (request) => findIngredientFormValues(request));
}

/** Follows `endCursor` to the end, collecting ids and page sizes. */
async function walk(first?: number): Promise<{ ids: string[]; sizes: number[] }> {
  const ids: string[] = [];
  const sizes: number[] = [];
  let after: string | null = null;
  for (;;) {
    const page: Page<Row> = await pageOf({ first, after });
    ids.push(...page.edges.map((edge) => edge.node.id));
    sizes.push(page.edges.length);
    if (!page.pageInfo.hasNextPage) return { ids, sizes };
    after = page.pageInfo.endCursor;
  }
}

/** The curated forms in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select f.id from ingredient_forms f
    where f.deleted_at is null
      and exists (
        select 1 from ingredient_form_groups g where g.id = f.group_id and g.deleted_at is null)
    order by f.name, f.id`;
  return rows.map((row) => row.id);
}

describe('findIngredientFormValues', () => {
  it('walks every curated form once, in (name, id) order, at the default page size', async () => {
    const expected = await expectedOrder();
    // The precondition: the seed's 78 forms, more than three pages.
    expect(expected).toHaveLength(78);

    const { ids, sizes } = await walk();

    expect(ids).toEqual(expected);
    expect(sizes).toEqual([25, 25, 25, 3]);
  });

  it('omits a soft-deleted form', async () => {
    const [herb] = await sql`select id from ingredient_forms where slug = 'herb'`;
    await sql`
      update ingredient_forms set deleted_at = now(), deleted_by = ${A.id} where id = ${herb.id}`;

    const { ids } = await walk(100);

    expect(ids).toHaveLength(77);
    expect(ids).not.toContain(herb.id);
  });

  it('omits every form of a soft-deleted group, since a form is curated only while its group is', async () => {
    const [curio] = await sql`select id from ingredient_form_groups where slug = 'curio'`;
    const [{ count }] = await sql`
      select count(*)::int as count from ingredient_forms where group_id = ${curio.id}`;
    // The precondition: the group holds forms that would otherwise be listed.
    expect(count).toBeGreaterThan(0);
    await sql`
      update ingredient_form_groups set deleted_at = now(), deleted_by = ${A.id}
      where id = ${curio.id}`;

    const { ids } = await walk(100);

    expect(ids).toHaveLength(78 - count);
    expect(ids).toEqual(await expectedOrder());
  });
});
