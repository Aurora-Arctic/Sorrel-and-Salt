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

  // MB.162: a compendium entry holds only live curated values, in the curated
  // row's own spelling — a form under a live group, a deity under a live
  // tradition. `demo` lays this compendium down too, so the template answers
  // for every scenario that writes one.
  it('holds every compendium form, planet, zodiac sign and deity to a live curated row, spelt as it is', async () => {
    const rows = await sql<{ field: string; value: string; curated: boolean }[]>`
      with compendium as (
        select * from ingredients where workspace_id is null
      ),
      in_use as (
        select 'form' as field, form as value from compendium where form is not null
        union all select 'planets', unnest(planets) from compendium
        union all select 'zodiacSigns', unnest(zodiac_signs) from compendium
        union all select 'deities', unnest(deities) from compendium
      ),
      curated as (
        select 'form' as field, f.name from ingredient_forms f
          join ingredient_form_groups g on g.id = f.group_id
          where f.deleted_at is null and g.deleted_at is null
        union all select 'planets', name from planets where deleted_at is null
        union all select 'zodiacSigns', name from zodiac_signs where deleted_at is null
        union all select 'deities', d.name from deities d
          join deity_traditions t on t.id = d.tradition_id
          where d.deleted_at is null and t.deleted_at is null
      )
      select u.field, u.value,
        exists (select 1 from curated c where c.field = u.field and c.name = u.value) as curated
      from in_use u
    `;

    // Precondition: every field is in use, so an empty refusal list is not vacuous.
    expect(new Set(rows.map((row) => row.field))).toEqual(
      new Set(['form', 'planets', 'zodiacSigns', 'deities']),
    );
    expect(rows.filter((row) => !row.curated)).toEqual([]);
  });
});
