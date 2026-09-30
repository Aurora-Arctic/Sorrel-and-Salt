import type postgres from 'postgres';
import { type IngredientFixture, ingredientColumns } from '../fixtures/ingredient';

// The one way a test seeds an ingredient it is not testing the writing of.
// Through the raw client rather than `withAudit`: setup must not depend on the
// code under test, and the writer produces a compendium row only under the
// site admin's proof, as the compendium service's own write
// (claude-docs/testing.md, "Fixture factories"). What it does instead is what
// the seed does — the author's stamps and the GUC, inside one transaction.

/**
 * Writes `fixture`'s row, its folk names and its category links, stamped by
 * `author`, and returns the ingredient's id. Categories are named as §6 does
 * and resolved through the seeded `categories`; a name with no live row is a
 * thrown error naming it, so a misspelt category is never a silent skip.
 */
export async function insertIngredient(
  sql: postgres.Sql,
  fixture: IngredientFixture,
  author: string,
): Promise<string> {
  const stamps = { created_by: author, updated_by: author };

  return sql.begin(async (tx) => {
    // As `withAudit` and the seed publish it: parameterised, transaction-local.
    await tx`select set_config('app.current_user_id', ${author}, true)`;

    const [row] = await tx`
      insert into ingredients ${tx({ ...ingredientColumns(fixture), ...stamps })}
      returning id`;
    const id = row.id as string;

    if (fixture.folkNames.length > 0) {
      const folkNames = fixture.folkNames.map((name) => ({ ingredient_id: id, name, ...stamps }));
      await tx`insert into ingredient_folk_names ${tx(folkNames)}`;
    }

    if (fixture.categories.length > 0) {
      const found = await tx`
        select id, name from categories
        where name in ${tx(fixture.categories)} and deleted_at is null`;
      const idByName = new Map(found.map((category) => [category.name as string, category.id]));
      const links = fixture.categories.map((name) => {
        const categoryId = idByName.get(name);
        if (categoryId === undefined) {
          throw new Error(
            `"${fixture.name}" names category "${name}", which is not live in the database.`,
          );
        }
        return { ingredient_id: id, category_id: categoryId as string, ...stamps };
      });
      await tx`insert into ingredient_categories ${tx(links)}`;
    }

    return id;
  });
}
