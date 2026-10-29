import type postgres from 'postgres';

// What a variant write left behind, read raw: the two ingredient services' tests assert the rows a
// save wrote, tombstones included, rather than what a reader shows.

/** Every form of the ingredient, live and soft-deleted, by form and then age. */
export function variantRowsOf(sql: postgres.Sql, ingredientId: string) {
  return sql`
    select id, form, form_id, description, safety_notes, celestial_bodies, deleted_at, deleted_by,
      xmin::text as xmin
    from ingredient_variants where ingredient_id = ${ingredientId}
    order by lower(form), created_at`;
}

/** The ingredient's live forms' text, in form order. */
export async function liveFormsOf(sql: postgres.Sql, ingredientId: string): Promise<string[]> {
  return (await variantRowsOf(sql, ingredientId))
    .filter((row) => row.deleted_at === null)
    .map((row) => row.form as string);
}

/**
 * One form's own children as rows: its category pairs, its live substitutes
 * and its live reference links, each with the transaction that last wrote it.
 */
export async function variantChildrenOf(sql: postgres.Sql, variantId: string) {
  const [categories, substitutes, references] = await Promise.all([
    sql`
      select ingredient_id, category_id, xmin::text as xmin from ingredient_categories
      where variant_id = ${variantId} order by category_id`,
    sql`
      select ingredient_id, substitute_id, substitute_variant_id, name, xmin::text as xmin
      from ingredient_substitutes
      where variant_id = ${variantId} and deleted_at is null order by name, substitute_id`,
    sql`
      select ingredient_id, reference_id, locator, xmin::text as xmin from reference_links
      where ingredient_variant_id = ${variantId} and deleted_at is null order by reference_id`,
  ]);
  return { categories, substitutes, references };
}

/** The live form of `ingredientId` called `form`, case aside: its id. */
export async function variantIdOf(
  sql: postgres.Sql,
  ingredientId: string,
  form: string,
): Promise<string> {
  const [row] = await sql`
    select id from ingredient_variants
    where ingredient_id = ${ingredientId} and lower(form) = lower(${form}) and deleted_at is null`;
  if (!row) throw new Error(`no live form "${form}" of ${ingredientId}`);
  return row.id as string;
}
