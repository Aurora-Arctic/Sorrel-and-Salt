import type postgres from 'postgres';

export async function liveFolkNames(sql: postgres.Sql, ingredientId: string) {
  const rows = await sql`
    select id, name from ingredient_folk_names
    where ingredient_id = ${ingredientId} and deleted_at is null
    order by lower(name)`;
  return rows.map((row) => ({ id: row.id as string, name: row.name as string }));
}
