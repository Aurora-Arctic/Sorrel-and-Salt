import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { NotFound } from '@/lib/errors';
import {
  readCompendiumEntry,
  readCompendiumEntryAsCurator,
  readCompendiumShareCard,
  setCompendiumEntryShown,
} from '@/modules/ingredients';
import { A, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// What a compendium entry's share card draws, read through the public entry read alone: the entry's
// name, formal name and own categories (else its live forms') with their group's colour, and nothing for an address that
// read does not answer with an entry. The ingredients table is emptied per test.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Invented groups with a colour each, so a chip's colour says which group it came from.
const WARDS = '#5d8ab1';
const BONDS = '#cf6e87';
const CHANGES = '#c371c6';
beforeAll(async () => {
  const stamps = { created_by: A.id, updated_by: A.id };
  const group = (name: string, color: string) => ({
    name,
    slug: name.toLowerCase().replace(' ', '-'),
    description: 'Invented',
    color_dark: color,
    color_light: '#23201a',
    ...stamps,
  });
  const [wards, bonds, changes] = await sql`
    insert into category_groups ${sql([
      group('Card Wards', WARDS),
      group('Card Bonds', BONDS),
      group('Card Changes', CHANGES),
    ])} returning id`;
  const category = (name: string, groupId: string) => ({
    name,
    slug: name.toLowerCase().replace(' ', '-'),
    description: 'Invented',
    group_id: groupId,
    ...stamps,
  });
  await sql`
    insert into categories ${sql([
      category('Card Aegis', wards.id),
      category('Card Binding', bonds.id),
      category('Card Charm', wards.id),
      category('Card Drift', changes.id),
    ])}`;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate retired_ingredient_slugs`;
});

async function slugOf(id: string): Promise<string> {
  const [{ slug }] = await sql<{ slug: string }[]>`select slug from ingredients where id = ${id}`;
  return slug;
}

describe('readCompendiumShareCard', () => {
  it("draws the entry's name, formal name and own categories in its group's colour, with one band segment per group in order of first appearance", async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testwort',
        categories: ['Card Charm', 'Card Binding', 'Card Aegis'],
        // With categories of its own, the card shows only those: a form's is left out.
        variants: [makeVariant({ categories: ['Card Drift'] }), makeVariant({ form: 'Testoil' })],
      }),
      A.id,
    );

    await expect(readCompendiumShareCard(await slugOf(id))).resolves.toEqual({
      name: 'Testwort',
      formalName: 'Fixtura testalis',
      categories: [
        { name: 'Card Aegis', color: WARDS },
        { name: 'Card Binding', color: BONDS },
        { name: 'Card Charm', color: WARDS },
      ],
      groupColors: [WARDS, BONDS],
    });
  });

  it("falls back to its live forms' categories, each once, when the entry has none of its own", async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Formwort',
        variants: [
          makeVariant({ form: 'Testoil', categories: ['Card Drift', 'Card Charm'] }),
          makeVariant({ form: 'Testleaf', categories: ['Card Charm'] }),
          makeVariant({ form: 'Testash', categories: ['Card Binding'] }),
        ],
      }),
      A.id,
    );
    // A soft-deleted form's pair outlives it, and must not reach the card.
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${id} and form = 'Testash'`;

    await expect(readCompendiumShareCard(await slugOf(id))).resolves.toMatchObject({
      categories: [
        { name: 'Card Charm', color: WARDS },
        { name: 'Card Drift', color: CHANGES },
      ],
      groupColors: [WARDS, CHANGES],
    });
  });

  it('draws an entry with no formal name and no categories as its name alone', async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ name: 'Plainwort', nomenclature: 'none', variants: [makeVariant()] }),
      A.id,
    );

    await expect(readCompendiumShareCard(await slugOf(id))).resolves.toEqual({
      name: 'Plainwort',
      formalName: null,
      categories: [],
      groupColors: [],
    });
  });

  it('gives a hidden entry NotFound at its own slug', async () => {
    const id = await insertIngredient(sql, makeIngredient({ name: 'Hiddenwort' }), A.id);
    await setCompendiumEntryShown(asUser(F), id, false);
    const slug = await slugOf(id);
    // Why it could have answered: the entry is live at that very slug, as a curator's read finds.
    await expect(readCompendiumEntryAsCurator(asUser(F), slug)).resolves.toMatchObject({
      kind: 'entry',
      detail: { entry: { id } },
    });

    await expect(readCompendiumShareCard(slug)).rejects.toBeInstanceOf(NotFound);
  });

  it("gives a coven's own entry NotFound at its slug", async () => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Covenwort' }),
      A.id,
    );
    const slug = await slugOf(id);
    // Why it could have answered: the row is live at that slug, a coven's rather than the compendium's.
    const [{ workspace_id }] = await sql`select workspace_id from ingredients where id = ${id}`;
    expect(workspace_id).toBe(WORKSPACE_W_ID);

    await expect(readCompendiumShareCard(slug)).rejects.toBeInstanceOf(NotFound);
  });

  it('gives an old address NotFound, though the page redirects from it', async () => {
    const id = await insertIngredient(sql, makeIngredient({ name: 'Movedwort' }), A.id);
    await sql`insert into retired_ingredient_slugs (ingredient_id, slug, created_by, updated_by)
      values (${id}, 'old-movedwort', ${A.id}, ${A.id})`;
    // Why it could have answered: the public read knows the address, as one that moved.
    await expect(readCompendiumEntry('old-movedwort')).resolves.toEqual({
      kind: 'moved',
      slug: await slugOf(id),
    });

    await expect(readCompendiumShareCard('old-movedwort')).rejects.toBeInstanceOf(NotFound);
  });

  it('gives an address that names nothing NotFound', async () => {
    await expect(readCompendiumShareCard('nothing-here')).rejects.toBeInstanceOf(NotFound);
  });
});
