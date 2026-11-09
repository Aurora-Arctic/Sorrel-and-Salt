import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { makeWorkspace, workspaceColumns } from '../../support/fixtures';
import { A } from '../../support/as-user';
import { fromRoot } from '../../support/paths';

// A migration test, retired once `0142` is in production's journal. `0142` gives every live coven one address row: its
// current address. The test database is already migrated, so the hand-written statements run again over rows the case
// writes; they skip a coven that already holds its address, so running them twice adds nothing.

const FILE = fromRoot('src/db/migrations/0142_workspace-slugs.sql');

const MIGRATION = readFileSync(FILE, 'utf8');
const HAND_WRITTEN = MIGRATION.slice(MIGRATION.indexOf('-- Hand-written from here'));

const STATEMENTS = HAND_WRITTEN.split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const insertCoven = async (name: string) =>
  (
    await sql`
      insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
      returning id, slug`
  )[0]! as { id: string; slug: string };

describe('the seeded covens', () => {
  it('each hold their current address in the table before any backfill runs again', async () => {
    // Migrations run before the seed in the template, so the seed writes these rows itself.
    const missing = await sql`
      select w.name from workspaces w
      where w.deleted_at is null
        and not exists (
          select 1 from workspace_slugs s
          where s.workspace_id = w.id and s.slug = w.slug and s.deleted_at is null)`;
    const [{ live }] =
      await sql`select count(*)::int as live from workspaces where deleted_at is null`;

    expect(live).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

describe('0142', () => {
  it("gives each live coven one row for its current address, stamped with the coven's creator, and none for a deleted coven", async () => {
    const live = await insertCoven('Fixture Backfilled Coven');
    const deleted = await insertCoven('Fixture Deleted Backfill Coven');
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted.id}`;
    // Precondition: the statements are there to run, and neither coven holds an address before them.
    expect(STATEMENTS.length).toBeGreaterThan(0);
    expect(
      await sql`select id from workspace_slugs where workspace_id in ${sql([live.id, deleted.id])}`,
    ).toEqual([]);

    for (const statement of STATEMENTS) await sql.unsafe(statement);
    for (const statement of STATEMENTS) await sql.unsafe(statement);

    expect(
      await sql`
        select workspace_id, slug, created_by, updated_by from workspace_slugs
        where workspace_id in ${sql([live.id, deleted.id])} and deleted_at is null`,
    ).toEqual([{ workspace_id: live.id, slug: live.slug, created_by: A.id, updated_by: A.id }]);
  });

  it('leaves every live coven holding exactly its current address, one row each', async () => {
    for (const statement of STATEMENTS) await sql.unsafe(statement);

    const covens = await sql`select id from workspaces where deleted_at is null`;
    const missing = await sql`
      select w.id, w.slug from workspaces w
      where w.deleted_at is null
        and not exists (
          select 1 from workspace_slugs s
          where s.workspace_id = w.id and s.slug = w.slug and s.deleted_at is null)`;
    const twice = await sql`
      select workspace_id, slug from workspace_slugs where deleted_at is null
      group by workspace_id, slug having count(*) > 1`;

    // Precondition: the seeded covens, the demo coven among them, are there to check.
    expect(covens.length).toBeGreaterThanOrEqual(3);
    expect(missing).toEqual([]);
    expect(twice).toEqual([]);
  });
});
