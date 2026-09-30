import type postgres from 'postgres';
import { spellColumns, spellLayerColumns } from '../fixtures/spell';
import type { SpellFixture } from '../fixtures/types';

// The one way a test seeds a spell it is not testing the writing of, on
// insert-ingredient.ts's terms: the raw client, one transaction, the author's
// stamps and the GUC (claude-docs/testing.md, "Fixture factories").

/**
 * Writes `fixture`'s spell, its layers and its assigned categories, stamped by
 * `author`, and returns the spell's id. `author` is `created_by`, which is
 * whom a private spell is readable by. A layer names its ingredient by id and
 * nothing checks the id's tier, which is how a test writes the cross-coven
 * link a finder has to withhold. Categories are named as §6 does; a name with
 * no live row is a thrown error naming it.
 */
export async function insertSpell(
  sql: postgres.Sql,
  fixture: SpellFixture,
  author: string,
): Promise<string> {
  const stamps = { created_by: author, updated_by: author };

  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;

    const [row] = await tx`
      insert into spells ${tx({ ...spellColumns(fixture), ...stamps })}
      returning id`;
    const id = row.id as string;

    if (fixture.layers.length > 0) {
      const layers = fixture.layers.map((layer) => ({
        ...spellLayerColumns(layer),
        spell_id: id,
        ...stamps,
      }));
      await tx`insert into spell_ingredients ${tx(layers)}`;
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
            `"${fixture.title}" names category "${name}", which is not live in the database.`,
          );
        }
        return { spell_id: id, category_id: categoryId as string, ...stamps };
      });
      await tx`insert into spell_categories ${tx(links)}`;
    }

    return id;
  });
}
