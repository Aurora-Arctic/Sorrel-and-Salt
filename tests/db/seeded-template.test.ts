import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import postgres from 'postgres';
import { MIGRATIONS_DIR } from '../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { CATEGORIES } from '@/db/seed/categories';
import { PLANETS, ZODIAC_SIGNS } from '@/db/seed/astrology';
import { DEITIES, DEITY_TRADITIONS } from '@/db/seed/deities';
import { FORMS } from '@/db/seed/forms';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  WORKSPACE_W_ID,
  WORKSPACE_X_ID,
} from '@/db/seed/standard';

// The baseline every other file under tests/db/ may assume; this one builds no
// schema and seeds nothing — claude-docs/testing/where-tests-live.md, "Where tests live".

let sql: ReturnType<typeof postgres>;

async function countOf(table: string, where = ''): Promise<number> {
  const [{ count }] = await sql.unsafe<{ count: string }[]>(
    `select count(*) from "${table}" ${where}`,
  );
  return Number(count);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

describe('the seeded template every db worker clones', () => {
  it('was cloned from a template globalSetup made, named in the provided context', async () => {
    const template = inject('templateDatabase');
    const rows = await sql`select datname from pg_database where datname = ${template}`;
    expect(rows).toHaveLength(1);
  });

  it('carries the migration journal, with every migration applied', async () => {
    const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'));
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*) from drizzle.__drizzle_migrations
    `;
    // Journal and table both, so a stale template is a failing test rather than a confusing one.
    expect(Number(count)).toBe(journal.entries.length);
    expect(Number(count)).toBeGreaterThan(0);
  });

  it('holds the five fixture users and the bootstrap user, and no one else', async () => {
    const rows = await sql<{ id: string }[]>`select id from users order by id`;
    const expected = [BOOTSTRAP_USER_ID, ...Object.values(FIXTURE_USERS).map((u) => u.id)].sort();
    expect(rows.map((r) => r.id)).toEqual(expected);
  });

  // The bootstrap user is the seed's creator and no admin (MB.58).
  it('holds one site admin, E', async () => {
    const rows = await sql<{ id: string }[]>`select id from users where role = 'admin'`;
    expect(rows.map((r) => r.id)).toEqual([FIXTURE_USERS.E.id]);
  });

  it('holds workspaces W and X', async () => {
    const rows = await sql<{ id: string }[]>`select id from workspaces order by id`;
    expect(rows.map((r) => r.id)).toEqual([WORKSPACE_W_ID, WORKSPACE_X_ID].sort());
  });

  it('holds the full category, form, planet, zodiac and deity vocabularies', async () => {
    expect(await countOf('categories')).toBe(CATEGORIES.length);
    expect(await countOf('ingredient_forms')).toBe(FORMS.length);
    expect(await countOf('planets')).toBe(PLANETS.length);
    expect(await countOf('zodiac_signs')).toBe(ZODIAC_SIGNS.length);
    expect(await countOf('deity_traditions')).toBe(DEITY_TRADITIONS.length);
    expect(await countOf('deities')).toBe(DEITIES.length);
  });

  it('holds the standard compendium and no workspace ingredients', async () => {
    expect(await countOf('ingredients', 'where workspace_id is null')).toBe(
      COMPENDIUM_INGREDIENTS.length,
    );
    expect(await countOf('ingredients', 'where workspace_id is not null')).toBe(0);
  });

  // MB.162, on MB.167's links: a compendium entry's form and each deity is a
  // pick of a live curated row — a form under a live group, a deity under a
  // live tradition — whose name its text spells, and each planet and sign
  // names one in its own spelling. `demo` lays this compendium down too, so
  // the template answers for every scenario that writes one.
  it('holds every compendium form and deity to a live curated pick, and every planet and sign to a live row', async () => {
    const rows = await sql<{ field: string; value: string; curated: boolean }[]>`
      with compendium as (
        select * from ingredients where workspace_id is null
      ),
      live_forms as (
        select f.id, f.name from ingredient_forms f
          join ingredient_form_groups g on g.id = f.group_id
          where f.deleted_at is null and g.deleted_at is null
      ),
      live_deities as (
        select d.id, d.name from deities d
          join deity_traditions t on t.id = d.tradition_id
          where d.deleted_at is null and t.deleted_at is null
      )
      select 'form' as field, c.form as value,
          exists (select 1 from live_forms f where f.id = c.form_id and f.name = c.form) as curated
        from compendium c where c.form is not null
      union all select 'deities', d.name,
          exists (select 1 from live_deities l where l.id = d.deity_id and l.name = d.name)
        from ingredient_deities d join compendium c on c.id = d.ingredient_id
        where d.deleted_at is null
      union all select 'planets', p.value, p.value in (select name from planets where deleted_at is null)
        from compendium c, unnest(c.planets) as p(value)
      union all select 'zodiacSigns', z.value,
          z.value in (select name from zodiac_signs where deleted_at is null)
        from compendium c, unnest(c.zodiac_signs) as z(value)
    `;

    // Precondition: every field is in use, so an empty refusal list is not vacuous.
    expect(new Set(rows.map((row) => row.field))).toEqual(
      new Set(['form', 'planets', 'zodiacSigns', 'deities']),
    );
    expect(rows.filter((row) => !row.curated)).toEqual([]);
  });
});
