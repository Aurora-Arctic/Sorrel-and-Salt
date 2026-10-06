import type postgres from 'postgres';
import type { ReferenceSeed } from './types';

// How a test seeds a reference, and a link to one, that it is not testing the
// writing of. Raw, as `insertIngredient` is (MB.101): setup must not depend on
// the code under test, and the tier rule the service holds is not held here,
// so a test can write the link the service would refuse.

/** A compendium book carrying the least it needs, unless `fields` says otherwise. */
const BOOK = { kind: 'book', title: 'A Herbal of Fixture Covens', published: '1988' };

/**
 * Writes a reference — a compendium book unless `fields` says otherwise —
 * stamped by `author`, and returns its id. Columns are the table's own names.
 */
export async function insertReference(
  sql: postgres.Sql,
  fields: ReferenceSeed,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into "references" ${sql({ ...BOOK, ...fields, created_by: author, updated_by: author })}
    returning id`;
  return row.id as string;
}

/** Links `referenceId` from `ingredientId`, stamped by `author`, and returns the link's id. */
export async function insertReferenceLink(
  sql: postgres.Sql,
  ingredientId: string,
  referenceId: string,
  author: string,
  locator: string | null = null,
): Promise<string> {
  const [row] = await sql`
    insert into reference_links ${sql({
      ingredient_id: ingredientId,
      reference_id: referenceId,
      locator,
      created_by: author,
      updated_by: author,
    })}
    returning id`;
  return row.id as string;
}
