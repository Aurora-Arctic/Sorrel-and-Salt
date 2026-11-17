import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { readCardCategories, readCategories, readCompendium } from '@/app/compendium-reads';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { A } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// What the public compendium page reads around its list, the forms and categories that complete each
// card, answered from the data cache once held, so a visitor with no session costs Postgres nothing on a
// repeat render. A row changed underneath shows whether the repeat read reached Postgres, as in
// compendium-cache.test.ts (claude-docs/db/compendium-cache.md, "What is cached").
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  clearDataCache();
});

const seed = async () => {
  const [category] = await sql<{ name: string }[]>`
    select name from categories where deleted_at is null order by name limit 1`;
  return insertIngredient(
    sql,
    makeIngredient({
      name: 'Fixture Alpha',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Testroot' })],
      categories: [category.name],
    }),
    A.id,
  );
};

const forms = async () => {
  const page = await readCompendium('{}', undefined, undefined, 26);
  return page.forms.flat().map(({ name }) => name);
};

describe('the compendium page reads around its list are cached under the compendium tag', () => {
  it("answers a repeat read of the cards' forms from the cache, until the tag expires", async () => {
    await seed();
    expect(await forms()).toEqual(['Testroot']);

    await sql`update ingredient_variants set form = 'Quietly Changed'`;
    // Postgres holds the change; the cache still answers what it held.
    expect(await forms()).toEqual(['Testroot']);

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });
    expect(await forms()).toEqual(['Quietly Changed']);
  });

  it('answers a repeat read of the category choices and the card chips from the cache', async () => {
    const id = await seed();
    const [first] = await readCategories();
    expect(first).toBeDefined();
    const chips = await readCardCategories([id]);

    // The precondition: the card has a chip to lose.
    expect(chips[0].length).toBeGreaterThan(0);
    await sql`update category_groups set name = 'Quietly Renamed'`;
    await sql`delete from ingredient_categories`;

    expect((await readCategories())[0].group.name).toBe(first.group.name);
    expect(await readCardCategories([id])).toEqual(chips);
  });
});
