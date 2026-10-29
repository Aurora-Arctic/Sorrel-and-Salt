import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { readFormIcons } from '@/app/compendium-reads';
import { useTestDatabase } from '../../../support/db/database';
import { clearDataCache } from '../../../support/next-data-cache';

// A coven's Ingredients list draws each jar line's form icon from its
// form's group. The list read carries the form by name; the group comes from
// this read of the curated vocabulary, over the real tables, folded to lower
// case as the page looks it up. The drawing itself is JarLines' and FormIcon's
// component tests; this is the server half no component test can see.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(() => {
  clearDataCache();
});

async function groupOf(form: string): Promise<{ name: string; icon: string | null }> {
  const [row] = await sql<{ name: string; icon: string | null }[]>`
    select g.name, g.icon
    from ingredient_forms f join ingredient_form_groups g on g.id = f.group_id
    where f.name = ${form} and f.deleted_at is null`;
  return row;
}

describe('readFormIcons', () => {
  it("answers each curated form's group icon, by the form's name folded to lower case", async () => {
    // The seed puts Herb and Leaf in one group and Crystal in another, each with an icon.
    expect(await groupOf('Herb')).toEqual({ name: 'Botanical', icon: 'botanical' });
    expect(await groupOf('Leaf')).toEqual({ name: 'Botanical', icon: 'botanical' });
    expect(await groupOf('Crystal')).toEqual({ name: 'Mineral', icon: 'mineral' });

    const icons = await readFormIcons();

    expect(icons.get('herb')).toBe('botanical');
    expect(icons.get('leaf')).toBe('botanical');
    expect(icons.get('crystal')).toBe('mineral');
  });

  it('answers nothing for a form outside the vocabulary, or one whose group has no icon', async () => {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from ingredient_forms where lower(name) = 'testform'`;
    expect(count).toBe(0);
    await sql`update ingredient_form_groups set icon = null where name = 'Mineral'`;

    const icons = await readFormIcons();

    expect(icons.has('testform')).toBe(false);
    expect(icons.has('crystal')).toBe(false);
    // Why crystal could have been there: the row is live, and another group's icon still reads.
    expect((await groupOf('Crystal')).name).toBe('Mineral');
    expect(icons.get('herb')).toBe('botanical');
  });
});
