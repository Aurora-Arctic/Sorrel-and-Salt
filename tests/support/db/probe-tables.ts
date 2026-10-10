import { afterAll, beforeAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { sql as dsql } from 'drizzle-orm';
import { pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { namedWrites } from '@/db/table-marks';
import { auditColumns, auditStampColumns } from '@/modules/identity/schema/users';

// The repository's own tests run against scratch tables rather than real ones:
// the contract is the audit columns and the table shapes, not any one table's
// other constraints (claude-docs/db/write-path.md, "The write path").

// A scratch table spreading the real `auditColumns` minus their FKs to
// `users`: the contract is about the six columns, not any one table.
export const herbs = pgTable('repository_probe_herbs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  // Defaulted from the GUC, so it records what `app.current_user_id` held
  // inside the inserting transaction — the only way a narrow `AuditWriter`
  // lets a test observe it. `current_setting(.., true)` is missing_ok.
  actingUser: text('acting_user'),
  // The same for `app.impersonated_by` (MB.53).
  impersonatingAdmin: text('impersonating_admin'),
  ...auditColumns,
});

// Built `WHERE deleted_at IS NULL`: a plain unique index would fail the reuse
// test below for a reason unrelated to the repository.
export const charms = pgTable(
  'repository_probe_charms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('repository_probe_charms_name_unique')
      .on(table.name)
      .where(dsql`${table.deletedAt} is null`),
  ],
);

// The join-table shape: four stamps, a composite key, no delete columns (MB.34).
export const pairs = pgTable(
  'repository_probe_pairs',
  {
    herbId: uuid('herb_id').notNull(),
    charmId: uuid('charm_id').notNull(),
    ...auditStampColumns,
  },
  (table) => [primaryKey({ columns: [table.herbId, table.charmId] })],
);

// The workspace-scoped shape: its own `workspace_id`, which is what makes it
// reachable only with a proof. No FK to `workspaces`, as the probes above
// carry none to `users`.
export const jars = pgTable('repository_probe_jars', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull(),
  label: text('label').notNull(),
  ...auditColumns,
});

// The two-tier shape: a nullable `workspace_id`, null meaning the compendium,
// as `ingredients` has it — what the compendium-tier writes accept.
export const tinctures = pgTable('repository_probe_tinctures', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id'),
  name: text('name').notNull(),
  ...auditColumns,
});

// The two marked shapes (MB.198): `herbs` and `tinctures` again, each
// written only through named calls, so every generic writer method refuses
// it. Declared and never created: what they test is the type, and a refusal
// they exist to show is a compile error rather than a statement.
export const switches = namedWrites(
  pgTable('repository_probe_switches', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    ...auditColumns,
  }),
);

export const tiers = namedWrites(
  pgTable('repository_probe_tiers', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id'),
    name: text('name').notNull(),
    ...auditColumns,
  }),
);

/** Acting users with no `users` row: the probe tables carry no FK to one. */
export const session = { userId: '11111111-1111-1111-1111-111111111111' };
export const impostor = { userId: '99999999-9999-9999-9999-999999999999' };

/** The raw client, for what the repository deliberately cannot do. Set in `beforeAll`. */
export let sql: ReturnType<typeof postgres>;

/** Opens the raw client for this file, and closes it after. */
export function useRawClient() {
  beforeAll(() => {
    sql = postgres(process.env.DATABASE_URL as string);
  });
  afterAll(() => sql.end());
}

/** Creates the probe tables for this file, empties them before each test, and drops them after. */
export function useProbeTables() {
  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL as string);
    await sql`
      create table repository_probe_herbs (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        acting_user text default current_setting('app.current_user_id', true),
        impersonating_admin text default current_setting('app.impersonated_by', true),
        created_at timestamp not null default now(),
        created_by uuid not null,
        updated_at timestamp not null default now(),
        updated_by uuid not null,
        deleted_at timestamp,
        deleted_by uuid
      )
    `;
    await sql`
      create table repository_probe_charms (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        created_at timestamp not null default now(),
        created_by uuid not null,
        updated_at timestamp not null default now(),
        updated_by uuid not null,
        deleted_at timestamp,
        deleted_by uuid
      )
    `;
    await sql`
      create table repository_probe_pairs (
        herb_id uuid not null,
        charm_id uuid not null,
        created_at timestamp not null default now(),
        created_by uuid not null,
        updated_at timestamp not null default now(),
        updated_by uuid not null,
        primary key (herb_id, charm_id)
      )
    `;
    await sql`
      create table repository_probe_jars (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null,
        label text not null,
        created_at timestamp not null default now(),
        created_by uuid not null,
        updated_at timestamp not null default now(),
        updated_by uuid not null,
        deleted_at timestamp,
        deleted_by uuid
      )
    `;
    await sql`
      create table repository_probe_tinctures (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid,
        name text not null,
        created_at timestamp not null default now(),
        created_by uuid not null,
        updated_at timestamp not null default now(),
        updated_by uuid not null,
        deleted_at timestamp,
        deleted_by uuid
      )
    `;
    await sql`
      create unique index repository_probe_charms_name_unique
        on repository_probe_charms (name)
        where deleted_at is null
    `;
  });

  afterAll(async () => {
    await sql`drop table if exists repository_probe_herbs`;
    await sql`drop table if exists repository_probe_charms`;
    await sql`drop table if exists repository_probe_pairs`;
    await sql`drop table if exists repository_probe_jars`;
    await sql`drop table if exists repository_probe_tinctures`;
    await sql.end();
  });

  beforeEach(async () => {
    await sql`truncate repository_probe_herbs`;
    await sql`truncate repository_probe_charms`;
    await sql`truncate repository_probe_pairs`;
    await sql`truncate repository_probe_jars`;
    await sql`truncate repository_probe_tinctures`;
  });
}
