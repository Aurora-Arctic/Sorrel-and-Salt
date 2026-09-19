import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { and, eq, sql as dsql } from 'drizzle-orm';
import { pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, auditStampColumns } from '@/db/audit';
import * as repository from '@/db/repository';
import {
  type AuditWriter,
  findMany,
  findManyIncludingSoftDeleted,
  findOne,
  withAudit,
} from '@/db/repository';

// A scratch table spreading the real `auditColumns` minus their FKs to
// `users`: the contract is about the six columns, not any one table.
const herbs = pgTable('repository_probe_herbs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  // Defaulted from the GUC, so it records what `app.current_user_id` held
  // inside the inserting transaction — the only way a narrow `AuditWriter`
  // lets a test observe it. `current_setting(.., true)` is missing_ok.
  actingUser: text('acting_user'),
  ...auditColumns,
});

// Built `WHERE deleted_at IS NULL`: a plain unique index would fail the reuse
// test below for a reason unrelated to the repository.
const charms = pgTable(
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
const pairs = pgTable(
  'repository_probe_pairs',
  {
    herbId: uuid('herb_id').notNull(),
    charmId: uuid('charm_id').notNull(),
    ...auditStampColumns,
  },
  (table) => [primaryKey({ columns: [table.herbId, table.charmId] })],
);

const session = { userId: '11111111-1111-1111-1111-111111111111' };
const impostor = { userId: '99999999-9999-9999-9999-999999999999' };

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  await sql`
    create table repository_probe_herbs (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      acting_user text default current_setting('app.current_user_id', true),
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
    create unique index repository_probe_charms_name_unique
      on repository_probe_charms (name)
      where deleted_at is null
  `;
});

afterAll(async () => {
  await sql`drop table if exists repository_probe_herbs`;
  await sql`drop table if exists repository_probe_charms`;
  await sql`drop table if exists repository_probe_pairs`;
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate repository_probe_herbs`;
  await sql`truncate repository_probe_charms`;
  await sql`truncate repository_probe_pairs`;
});

describe('repository public API', () => {
  it('exports exactly withAudit and the three soft-delete-aware finders', () => {
    expect(Object.keys(repository).sort()).toEqual(
      ['findMany', 'findManyIncludingSoftDeleted', 'findOne', 'withAudit'].sort(),
    );
  });
});

describe('withAudit', () => {
  it('stamps insert audit ids from the session', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Rosemary' }));

    expect(row.name).toBe('Rosemary');
    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
    expect(row.deletedAt).toBeNull();
  });

  it('takes audit ids from the session, never the payload', async () => {
    const [row] = await withAudit(session, (write) =>
      write.insert(herbs, {
        name: 'Sage',
        createdBy: impostor.userId,
        updatedBy: impostor.userId,
      } as Parameters<typeof write.insert>[1]),
    );

    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
  });

  it('stamps only updated_* on update, leaving created_* as inserted', async () => {
    const [inserted] = await withAudit(session, (write) => write.insert(herbs, { name: 'Thyme' }));

    const [updated] = await withAudit(impostor, (write) =>
      write.update(herbs, { name: 'Wild thyme' }, eq(herbs.id, inserted.id)),
    );

    expect(updated.name).toBe('Wild thyme');
    expect(updated.createdBy).toBe(session.userId);
    expect(updated.updatedBy).toBe(impostor.userId);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(inserted.updatedAt.getTime());
  });

  it('soft-deletes by stamping deleted_*, leaving the row in place', async () => {
    const [inserted] = await withAudit(session, (write) => write.insert(herbs, { name: 'Yarrow' }));

    const [deleted] = await withAudit(impostor, (write) =>
      write.softDelete(herbs, eq(herbs.id, inserted.id)),
    );

    expect(deleted.deletedBy).toBe(impostor.userId);
    expect(deleted.deletedAt).toBeInstanceOf(Date);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(1);
  });

  it('rolls the whole transaction back when the callback throws', async () => {
    await expect(
      withAudit(session, async (write) => {
        await write.insert(herbs, { name: 'Mandrake' });
        throw new Error('spell fizzled');
      }),
    ).rejects.toThrow('spell fizzled');

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });

  it('rolls back a later write in the same transaction, not just the failing one', async () => {
    await expect(
      withAudit(session, async (write) => {
        await write.insert(herbs, { name: 'Belladonna' });
        await write.update(
          herbs,
          { name: null } as unknown as { name: string },
          eq(herbs.name, 'Belladonna'),
        );
      }),
    ).rejects.toThrow();

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });

  it('rejects a write with no acting user rather than stamping a blank id', async () => {
    await expect(
      withAudit({ userId: '' }, (write) => write.insert(herbs, { name: 'Nightshade' })),
    ).rejects.toThrow(/session/i);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });
});

describe('app.current_user_id (M1.19)', () => {
  it('exposes the acting user to SQL running inside the transaction', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Vervain' }));

    expect(row.actingUser).toBe(session.userId);
  });

  it('scopes the setting to the transaction, so it does not leak to a later one', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Elder' }));

    const [second] = await withAudit(impostor, (write) => write.insert(herbs, { name: 'Rue' }));

    expect(second.actingUser).toBe(impostor.userId);
  });

  it('does not leak across pooled connections under concurrency', async () => {
    // More callers than pool connections, at once; each must see its own id.
    // Transaction-scoped `set_config(.., true)` is what makes that true — a
    // session-level `SET` would fail this.
    const actors = Array.from({ length: 24 }, (_, index) => ({
      userId: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    }));

    const rows = await Promise.all(
      actors.map(async (actor) => {
        const [row] = await withAudit(actor, (write) =>
          write.insert(herbs, { name: `Herb ${actor.userId}` }),
        );
        return row;
      }),
    );

    for (const [index, row] of rows.entries()) {
      expect(row.actingUser).toBe(actors[index].userId);
      expect(row.createdBy).toBe(actors[index].userId);
    }
  });

  it('leaves the setting unset on a connection outside any withAudit transaction', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Betony' }));

    const [{ value }] = await sql`
      select current_setting('app.current_user_id', true) as value
    `;
    expect(value ?? null).toBeNull();
  });

  it('never opens a transaction at all when there is no acting user', async () => {
    await expect(
      withAudit({ userId: '' }, (write) => write.insert(herbs, { name: 'Hemlock' })),
    ).rejects.toThrow(/session/i);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });
});

describe('soft-delete filtering (M1.20)', () => {
  it('findMany excludes a soft-deleted row', async () => {
    const [kept] = await withAudit(session, (write) => write.insert(herbs, { name: 'Comfrey' }));
    const [gone] = await withAudit(session, (write) => write.insert(herbs, { name: 'Foxglove' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, gone.id)));

    const rows = await findMany(herbs);

    expect(rows.map((row) => row.id)).toEqual([kept.id]);
  });

  it('findMany still applies a caller-supplied condition alongside the filter', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Mugwort' }));
    const [target] = await withAudit(session, (write) => write.insert(herbs, { name: 'Nettle' }));

    const rows = await findMany(herbs, eq(herbs.name, 'Nettle'));

    expect(rows.map((row) => row.id)).toEqual([target.id]);
  });

  it('findOne returns undefined for a soft-deleted row, not the deleted row', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Wormwood' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findOne(herbs, eq(herbs.id, row.id))).resolves.toBeUndefined();
  });

  it('findOne returns a live row matching the condition', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Chamomile' }));

    await expect(findOne(herbs, eq(herbs.id, row.id))).resolves.toMatchObject({
      name: 'Chamomile',
    });
  });

  it('the escape hatch, and only the escape hatch, can still see a soft-deleted row', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Hellebore' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findMany(herbs, eq(herbs.id, row.id))).resolves.toEqual([]);
    const [restorable] = await findManyIncludingSoftDeleted(herbs, eq(herbs.id, row.id));
    expect(restorable).toMatchObject({ id: row.id, deletedAt: expect.any(Date) });
  });

  // claude-docs/db.md, "Soft-delete filtering and the partial-index convention".
  describe('the partial unique index convention', () => {
    it('still blocks a live duplicate', async () => {
      await withAudit(session, (write) => write.insert(charms, { name: 'Ward' }));

      const error: unknown = await withAudit(session, (write) =>
        write.insert(charms, { name: 'Ward' }),
      ).catch((caught: unknown) => caught);

      expect(String((error as { cause?: unknown }).cause ?? error)).toMatch(
        /repository_probe_charms_name_unique/i,
      );
    });

    it('lets the name be reused once the original is soft-deleted', async () => {
      const [original] = await withAudit(session, (write) =>
        write.insert(charms, { name: 'Ward' }),
      );
      await withAudit(session, (write) => write.softDelete(charms, eq(charms.id, original.id)));

      const [reused] = await withAudit(session, (write) => write.insert(charms, { name: 'Ward' }));

      expect(reused.id).not.toBe(original.id);
      await expect(findMany(charms)).resolves.toEqual([expect.objectContaining({ id: reused.id })]);
    });
  });
});

// `write.delete` is how the three join tables are written, typed so it cannot
// be pointed at anything else (MB.34).
describe('hard delete on a table with no delete columns (MB.34)', () => {
  const herbId = '22222222-2222-2222-2222-222222222222';
  const charmId = '33333333-3333-3333-3333-333333333333';
  const otherCharmId = '44444444-4444-4444-4444-444444444444';

  const isPair = (herb: string, charm: string) =>
    and(eq(pairs.herbId, herb), eq(pairs.charmId, charm)) as ReturnType<typeof eq>;

  it('offers exactly four writer methods — a fifth is a decision, not a convenience', async () => {
    const methods = await withAudit(session, async (write) => Object.keys(write).sort());

    expect(methods).toEqual(['delete', 'insert', 'softDelete', 'update'].sort());
  });

  it('stamps a join row with the four stamp columns and gives it no delete columns', async () => {
    const [row] = await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row).not.toHaveProperty('deletedAt');
    expect(row).not.toHaveProperty('deletedBy');
  });

  it('removes the row outright, leaving no tombstone behind', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId: otherCharmId }));

    const [removed] = await withAudit(impostor, (write) =>
      write.delete(pairs, isPair(herbId, charmId)),
    );

    expect(removed).toMatchObject({ herbId, charmId });
    const rows = await sql`select charm_id from repository_probe_pairs`;
    expect(rows.map((row) => row.charm_id)).toEqual([otherCharmId]);
  });

  it('lets the same pair be re-added afterwards, with no partial index to make it possible', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.delete(pairs, isPair(herbId, charmId)));

    const [readded] = await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    expect(readded).toMatchObject({ herbId, charmId });
    await expect(findMany(pairs)).resolves.toHaveLength(1);
  });

  it('rolls a delete back with the rest of its transaction', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    await expect(
      withAudit(session, async (write) => {
        await write.delete(pairs, isPair(herbId, charmId));
        throw new Error('spell fizzled');
      }),
    ).rejects.toThrow('spell fizzled');

    const rows = await sql`select charm_id from repository_probe_pairs`;
    expect(rows).toHaveLength(1);
  });

  it('reads a table with no deleted_at through the ordinary finders', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId: otherCharmId }));

    await expect(findMany(pairs)).resolves.toHaveLength(2);
    await expect(findMany(pairs, eq(pairs.charmId, charmId))).resolves.toEqual([
      expect.objectContaining({ charmId }),
    ]);
    await expect(findOne(pairs, isPair(herbId, otherCharmId))).resolves.toMatchObject({
      charmId: otherCharmId,
    });
  });

  it('still filters a soft-deletable table, so the two shapes do not bleed into each other', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Tansy' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findMany(herbs)).resolves.toEqual([]);
    await expect(findManyIncludingSoftDeleted(herbs)).resolves.toHaveLength(1);
  });

  // Neither body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('refuses the wrong table at compile time in both directions', () => {
    const hardDeleteASoftDeletableTable = (write: AuditWriter) =>
      // @ts-expect-error — `herbs` carries deletedAt, so it is soft-deleted or
      // not deleted at all; write.delete cannot be pointed at it.
      write.delete(herbs, eq(herbs.id, herbId));

    const softDeleteATableWithNothingToStamp = (write: AuditWriter) =>
      // @ts-expect-error — `pairs` has no deleted_at to stamp, so softDelete
      // refuses it rather than writing an UPDATE that sets nothing.
      write.softDelete(pairs, isPair(herbId, charmId));

    expect(hardDeleteASoftDeletableTable).toBeInstanceOf(Function);
    expect(softDeleteATableWithNothingToStamp).toBeInstanceOf(Function);
  });
});
