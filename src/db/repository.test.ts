import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './audit';
import * as repository from './repository';
import { withAudit } from './repository';

// sorrel_template carries no tables until M1.27, so these tests write to a
// scratch table of their own — created here in this worker's disposable
// sorrel_test_<n> clone. It spreads the real `auditColumns`, minus their FKs
// to `users` (no users table exists to point at yet), so what's exercised is
// the same six columns every real table will carry.
const herbs = pgTable('repository_probe_herbs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ...auditColumns,
});

const session = { userId: '11111111-1111-1111-1111-111111111111' };
const impostor = { userId: '99999999-9999-9999-9999-999999999999' };

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  await sql`
    create table repository_probe_herbs (
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
});

afterAll(async () => {
  await sql`drop table if exists repository_probe_herbs`;
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate repository_probe_herbs`;
});

describe('repository public API', () => {
  it('exports withAudit and nothing that can write outside it', () => {
    expect(Object.keys(repository)).toEqual(['withAudit']);
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
