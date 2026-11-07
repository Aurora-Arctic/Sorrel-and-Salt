import type postgres from 'postgres';
import { toColumns } from '../fixtures/columns';
import { ingredientColumns } from '../fixtures/ingredient';
import type { IngredientFixture, VariantFixture } from '../fixtures/types';

// The one way a test seeds an ingredient it is not testing the writing of, through the raw client rather
// than `withAudit`: the author's stamps and the GUC, inside one transaction, as the seed does
// (claude-docs/testing/fixture-factories.md, "Fixture factories").

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

    for (const variant of fixture.variants) await writeVariant(tx, id, variant, author);

    if (fixture.folkNames.length > 0) {
      const folkNames = fixture.folkNames.map((name) => ({ ingredient_id: id, name, ...stamps }));
      await tx`insert into ingredient_folk_names ${tx(folkNames)}`;
    }

    if (fixture.substitutes.length > 0) {
      const substitutes = fixture.substitutes.map((name) => ({
        ingredient_id: id,
        name,
        ...stamps,
      }));
      await tx`insert into ingredient_substitutes ${tx(substitutes)}`;
    }

    if (fixture.deities.length > 0) {
      const deities = fixture.deities.map((name, position) => ({
        ingredient_id: id,
        name,
        position,
        ...stamps,
      }));
      await tx`insert into ingredient_deities ${tx(deities)}`;
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

export async function insertVariant(
  sql: postgres.Sql,
  ingredientId: string,
  variant: VariantFixture,
  author: string,
): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    return writeVariant(tx, ingredientId, variant, author);
  });
}

async function writeVariant(
  tx: postgres.TransactionSql,
  ingredientId: string,
  variant: VariantFixture,
  author: string,
): Promise<string> {
  const { categories = [], substitutes = [], ...row } = variant;
  const owner = { ingredient_id: ingredientId, created_by: author, updated_by: author };
  const [written] = await tx`
    insert into ingredient_variants ${tx({ ...toColumns(row), ...owner })}
    returning id`;
  const id = written.id as string;

  if (substitutes.length > 0) {
    const rows = substitutes.map((name) => ({ ...owner, variant_id: id, name }));
    await tx`insert into ingredient_substitutes ${tx(rows)}`;
  }

  if (categories.length > 0) {
    const found = await tx`
      select id, name from categories
      where name in ${tx(categories)} and deleted_at is null`;
    if (found.length !== categories.length) {
      throw new Error(
        `"${variant.form}" names a category that is not live: ${categories.join(', ')}.`,
      );
    }
    const pairs = found.map((category) => ({
      ...owner,
      variant_id: id,
      category_id: category.id,
    }));
    await tx`insert into ingredient_categories ${tx(pairs)}`;
  }

  return id;
}

// Raw, so a test can write the row the service's tier rule would refuse.
export async function insertSubstituteLink(
  sql: postgres.Sql,
  ingredientId: string,
  substituteId: string,
  author: string,
  forms: { variantId?: string; substituteVariantId?: string } = {},
): Promise<string> {
  const [row] = await sql`
    insert into ingredient_substitutes ${sql({
      ingredient_id: ingredientId,
      variant_id: forms.variantId ?? null,
      substitute_id: substituteId,
      substitute_variant_id: forms.substituteVariantId ?? null,
      created_by: author,
      updated_by: author,
    })}
    returning id`;
  return row.id as string;
}

// Raw: a test can write the row the service would refuse.
export async function insertDeityLink(
  sql: postgres.Sql,
  ingredientId: string,
  deityId: string,
  position: number,
  author: string,
): Promise<string> {
  const [row] = await sql`
    insert into ingredient_deities (ingredient_id, deity_id, name, position, created_by, updated_by)
    select ${ingredientId}, id, name, ${position}, ${author}, ${author}
    from deities where id = ${deityId}
    returning id`;
  if (!row) throw new Error(`No deity ${deityId} to link.`);
  return row.id as string;
}
