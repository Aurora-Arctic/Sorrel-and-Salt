import type postgres from 'postgres';
import { spellColumns, spellStepColumns } from '../fixtures/spell';
import type { SpellFixture } from '../fixtures/types';

// The one way a test seeds a spell it is not testing the writing of, on
// insert-ingredient.ts's terms: the raw client, one transaction, the author's
// stamps and the GUC (claude-docs/testing/fixture-factories.md, "Fixture factories").

/**
 * Writes `fixture`'s spell, its steps and assigned categories, stamped by `author` (`created_by`), and returns
 * the spell's id. A layer's ingredient id is not tier-checked, so a test can write a cross-coven link; an
 * ingredient with no variant leaves the layer's variant null, for the CHECK to refuse.
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

    if (fixture.steps.length > 0) {
      const linked = fixture.steps.flatMap((step) =>
        step.ingredientId === null ? [] : [step.ingredientId],
      );
      const variants =
        linked.length === 0
          ? []
          : await tx`
              select distinct on (ingredient_id) ingredient_id, id from ingredient_variants
              where ingredient_id in ${tx(linked)} and deleted_at is null
              order by ingredient_id, created_at, id`;
      const variantOf = new Map(variants.map((row) => [row.ingredient_id as string, row.id]));
      const steps = fixture.steps.map((step) => ({
        ...spellStepColumns(step),
        variant_id: step.ingredientId === null ? null : (variantOf.get(step.ingredientId) ?? null),
        spell_id: id,
        ...stamps,
      }));
      await tx`insert into spell_steps ${tx(steps)}`;
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
