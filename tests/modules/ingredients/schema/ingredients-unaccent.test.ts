import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { ingredientSlug } from '@/lib/slugify';

// The compendium search folds accents through `unaccent_immutable`, and the two expression indexes are what let a fold reach a trigram index at all (claude-docs/db/compendium-read.md, "The compendium read").
// That they are reached is proved on the SQL the finder sends, in tests/db/repository/compendium-search-query.test.ts; what stays here is the fold they exist for.
const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function addIngredient(name: string, canonicalName: string | null): Promise<string> {
  const [inserted] = await sql`
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    values (
      ${name},
      ${ingredientSlug(name, canonicalName)},
      ${canonicalName},
      ${canonicalName === null ? 'none' : 'botanical'},
      ${AUTHOR},
      ${AUTHOR}
    )
    returning id
  `;
  return inserted.id as string;
}

// Which rows match, not the order they come in: sorted here by code unit, so
// the expectation does not depend on the database's collation.
async function namesMatching(query: string): Promise<string[]> {
  const rows = await sql`
    select name from ingredients
    where unaccent_immutable(${query}) <% unaccent_immutable(name)
  `;
  return rows.map((row) => row.name as string).sort();
}

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('the unaccent trigram indexes', () => {
  // Why the plans in compendium-search-query.test.ts mean something: the fold
  // changes the answer, both ways.
  describe('the fold matches across accents', () => {
    beforeEach(async () => {
      await addIngredient('Uña de Gato', null);
      await addIngredient('Una de Gato Root', null);
    });

    it('finds an accented name from an unaccented query, and the reverse', async () => {
      expect(await namesMatching('una de gato')).toEqual(['Una de Gato Root', 'Uña de Gato']);
      expect(await namesMatching('uña de gato')).toEqual(['Una de Gato Root', 'Uña de Gato']);
    });
  });
});
