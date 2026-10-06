import type postgres from 'postgres';

// A curated form's or deity's id, by the name and the group or tradition the
// seed files it under: how a test picks one, as a member's autofill would. A
// lookup rather than a constant, since the seed generates every id.

/**
 * The live form `name`, under `group` when two share the name. Throws on none,
 * and on two without a group, so a test never picks one at random.
 */
export async function curatedFormId(
  sql: postgres.Sql,
  name: string,
  group?: string,
): Promise<string> {
  const rows = await sql`
    select ingredient_forms.id from ingredient_forms
    join ingredient_form_groups on ingredient_form_groups.id = ingredient_forms.group_id
    where lower(ingredient_forms.name) = lower(${name.trim()})
      and (${group ?? null}::text is null or ingredient_form_groups.name = ${group ?? null})
      and ingredient_forms.deleted_at is null and ingredient_form_groups.deleted_at is null`;
  return only(rows, `form "${name}"${group ? ` under ${group}` : ''}`);
}

/** The live deity `name`, under `tradition` when two share the name, as `curatedFormId`. */
export async function curatedDeityId(
  sql: postgres.Sql,
  name: string,
  tradition?: string,
): Promise<string> {
  const rows = await sql`
    select deities.id from deities
    join deity_traditions on deity_traditions.id = deities.tradition_id
    where lower(deities.name) = lower(${name.trim()})
      and (${tradition ?? null}::text is null or deity_traditions.name = ${tradition ?? null})
      and deities.deleted_at is null and deity_traditions.deleted_at is null`;
  return only(rows, `deity "${name}"${tradition ? ` of ${tradition}` : ''}`);
}

function only(rows: readonly { id?: unknown }[], what: string): string {
  if (rows.length !== 1) throw new Error(`Expected one curated ${what}, found ${rows.length}.`);
  return rows[0].id as string;
}
