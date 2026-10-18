import type postgres from 'postgres';

/**
 * The live folk names of one ingredient as `Ingredient.folkNames` answers
 * them: each row's id and text, by text. Read straight from the table, so a
 * test compares what the API says with what is stored.
 */
export async function liveFolkNames(sql: postgres.Sql, ingredientId: string) {
  const rows = await sql`
    select id, name from ingredient_folk_names
    where ingredient_id = ${ingredientId} and deleted_at is null
    order by lower(name)`;
  return rows.map((row) => ({ id: row.id as string, name: row.name as string }));
}
