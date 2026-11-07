import type postgres from 'postgres';
import type { ReferenceSeed } from './types';

// How a test seeds a reference, and a link to one, that it is not testing the writing of. Raw, as
// `insertIngredient` is: setup must not depend on the code under test, and the tier rule the service
// holds is not held here, so a test can write the link the service would refuse.

export interface CitationFields {
  name_basis?: 'stated' | 'resolved' | 'unresolved' | 'unaudited' | null;
  supports?: string[] | null;
}

const BOOK = { kind: 'book', title: 'A Herbal of Fixture Covens', published: '1988' };

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

export async function insertReferenceLink(
  sql: postgres.Sql,
  ingredientId: string,
  referenceId: string,
  author: string,
  locator: string | null = null,
  citation: CitationFields = {},
): Promise<string> {
  const [row] = await sql`
    insert into reference_links ${sql({
      ingredient_id: ingredientId,
      reference_id: referenceId,
      locator,
      ...citation,
      created_by: author,
      updated_by: author,
    })}
    returning id`;
  return row.id as string;
}

export async function insertVariantReferenceLink(
  sql: postgres.Sql,
  variantId: string,
  referenceId: string,
  author: string,
  locator: string | null = null,
  citation: CitationFields = {},
): Promise<string> {
  const [row] = await sql`
    insert into reference_links ${sql({
      ingredient_variant_id: variantId,
      reference_id: referenceId,
      locator,
      ...citation,
      created_by: author,
      updated_by: author,
    })}
    returning id`;
  return row.id as string;
}
