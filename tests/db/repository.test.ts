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
  findManyInWorkspace,
  findOne,
  findOneInWorkspace,
  findWorkspaceRole,
  withAudit,
} from '@/db/repository';
import { spellCategories } from '@/db/schema/spell-categories';
import { spellIngredients } from '@/db/schema/spell-ingredients';
import { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/services/membership';
import { A, B, C, D, asUser } from '../support/as-user';

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

// The workspace-scoped shape: its own `workspace_id`, which is what makes it
// reachable only with a proof. No FK to `workspaces`, as the probes above
// carry none to `users`.
const jars = pgTable('repository_probe_jars', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull(),
  label: text('label').notNull(),
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
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate repository_probe_herbs`;
  await sql`truncate repository_probe_charms`;
  await sql`truncate repository_probe_pairs`;
  await sql`truncate repository_probe_jars`;
});

describe('repository public API', () => {
  it('exports exactly withAudit, the finders, and the one read that mints a proof', () => {
    expect(Object.keys(repository).sort()).toEqual(
      [
        'findMany',
        'findManyIncludingSoftDeleted',
        'findManyInSpell',
        'findManyInWorkspace',
        'findManySpells',
        'findOne',
        'findOneInWorkspace',
        'findOneSpell',
        'findWorkspaceRole',
        'withAudit',
      ].sort(),
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

  // Eight since M10.3, which argued for `updateByIdInWorkspace` in its own PR:
  // MB.33 bars a service from importing `drizzle-orm`, so a service cannot
  // build the `where` `updateInWorkspace` wants and the by-id predicate has to
  // be built below the boundary. A ninth is the next such decision.
  it('offers exactly eight writer methods — a ninth is a decision, not a convenience', async () => {
    const methods = await withAudit(session, async (write) => Object.keys(write).sort());

    expect(methods).toEqual(
      [
        'delete',
        'insert',
        'insertInWorkspace',
        'softDelete',
        'softDeleteInWorkspace',
        'update',
        'updateByIdInWorkspace',
        'updateInWorkspace',
      ].sort(),
    );
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

// CLAUDE.md rule 5's second layer. The proofs below are real ones, minted by
// `assertMembership` against the seeded cast: there is no other way to get one,
// which is the property under test.
describe('the Membership proof (M6.3)', () => {
  let inW: Membership;
  let inX: Membership;

  beforeAll(async () => {
    // A owns W and D is a member of X — `standard`, the scenario every db
    // worker's clone carries.
    inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['create'] });
    inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create'] });
  });

  const insertJar = (membership: Membership, label: string) =>
    withAudit(session, (write) => write.insertInWorkspace(membership, jars, { label }));

  describe('findWorkspaceRole, the one read that takes no proof', () => {
    it('answers with the role the seeded membership names', async () => {
      await expect(findWorkspaceRole(A.id, WORKSPACE_W_ID)).resolves.toBe('owner');
      await expect(findWorkspaceRole(B.id, WORKSPACE_W_ID)).resolves.toBe('member');
      await expect(findWorkspaceRole(C.id, WORKSPACE_W_ID)).resolves.toBe('viewer');
    });

    it('answers undefined across workspaces, so there is nothing to mint a proof from', async () => {
      // Why this could have answered a role: A holds one, in the workspace
      // above, so the finder is reached and the table is not empty.
      await expect(findWorkspaceRole(A.id, WORKSPACE_X_ID)).resolves.toBeUndefined();
    });
  });

  describe('write.insertInWorkspace', () => {
    it('fills workspace_id from the proof rather than from the values', async () => {
      const [row] = await insertJar(inW, 'Rosehip');

      expect(row.workspaceId).toBe(WORKSPACE_W_ID);
      expect(row.createdBy).toBe(session.userId);
    });
  });

  describe('findManyInWorkspace', () => {
    it('returns this workspace’s rows and not the other’s', async () => {
      await insertJar(inW, 'Rosehip');
      await insertJar(inX, 'Nettle');

      await expect(findManyInWorkspace(inW, jars)).resolves.toEqual([
        expect.objectContaining({ label: 'Rosehip' }),
      ]);
      await expect(findManyInWorkspace(inX, jars)).resolves.toEqual([
        expect.objectContaining({ label: 'Nettle' }),
      ]);
    });

    it('still applies deleted_at IS NULL on top of the workspace predicate', async () => {
      const [row] = await insertJar(inW, 'Rosehip');
      await withAudit(session, (write) =>
        write.softDeleteInWorkspace(inW, jars, eq(jars.id, row.id)),
      );

      await expect(findManyInWorkspace(inW, jars)).resolves.toEqual([]);
    });
  });

  describe('a direct id belonging to another workspace', () => {
    it('is not readable, though the row exists and its own workspace finds it', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      // Why the read below could have succeeded: this exact id resolves under
      // X's own proof, so the row is present and the finder is reached.
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        label: 'Nettle',
      });

      await expect(findOneInWorkspace(inW, jars, eq(jars.id, row.id))).resolves.toBeUndefined();
    });

    it('is not updatable, and the row is left as it was', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      const updated = await withAudit(session, (write) =>
        write.updateInWorkspace(inW, jars, { label: 'Rewritten' }, eq(jars.id, row.id)),
      );

      expect(updated).toEqual([]);
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        label: 'Nettle',
      });
    });

    it('is not soft-deletable, and keeps its null deleted_at', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      const deleted = await withAudit(session, (write) =>
        write.softDeleteInWorkspace(inW, jars, eq(jars.id, row.id)),
      );

      expect(deleted).toEqual([]);
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        deletedAt: null,
      });
    });
  });

  // None of these bodies run: each `@ts-expect-error` fails `npm run typecheck`
  // the moment the proof stops being required, which a runtime assertion cannot
  // see — it would pass just as happily against a signature gone optional.
  it('refuses a workspace-scoped table without a proof at compile time', () => {
    const readItUnscoped = () =>
      // @ts-expect-error — `jars` carries workspace_id, so the unscoped finder
      // refuses it: a read of it is scoped by a proof or it is not written.
      findMany(jars);

    const readItWithoutTheProof = () =>
      // @ts-expect-error — the proof is the first argument and is not optional.
      findManyInWorkspace(jars);

    const writeItUnscoped = (write: AuditWriter) =>
      // @ts-expect-error — the same on the write side; `workspace_id` has no
      // source but a proof.
      write.insert(jars, { workspaceId: WORKSPACE_W_ID, label: 'Rosehip' });

    const nameAWorkspaceBesideTheProof = (write: AuditWriter, membership: Membership) =>
      // @ts-expect-error — a `workspaceId` passed alongside the proof is a
      // second source that can disagree with it.
      write.insertInWorkspace(membership, jars, { workspaceId: WORKSPACE_X_ID, label: 'Rosehip' });

    const scopeAnUnscopedTable = (membership: Membership) =>
      // @ts-expect-error — `herbs` has no workspace_id to AND onto the query,
      // so the scoped finder refuses it rather than filtering on nothing.
      findManyInWorkspace(membership, herbs);

    expect(readItUnscoped).toBeInstanceOf(Function);
    expect(readItWithoutTheProof).toBeInstanceOf(Function);
    expect(writeItUnscoped).toBeInstanceOf(Function);
    expect(nameAWorkspaceBesideTheProof).toBeInstanceOf(Function);
    expect(scopeAnUnscopedTable).toBeInstanceOf(Function);
  });

  // The same shape for M10.3's two extra scopes. A private spell excluded by a
  // predicate the caller could simply not have written is absent; a private
  // spell the generic finders will not compile against is impossible, and only
  // the second survives the next service that forgets.
  it('refuses the generic finders a spell and its contents at compile time', () => {
    const readSpellsWithoutTheVisibilityRule = (membership: Membership) =>
      // @ts-expect-error — `spells` carries `visibility`, so the generic scoped
      // finder refuses it: findManySpells is the only way in.
      findManyInWorkspace(membership, spells);

    const readOneSpellWithoutTheVisibilityRule = (membership: Membership) =>
      // @ts-expect-error — and the same one row at a time.
      findOneInWorkspace(membership, spells, eq(spells.id, WORKSPACE_W_ID));

    const readLayersUnscoped = () =>
      // @ts-expect-error — `spell_ingredients` carries no workspace_id and so
      // would pass as unscoped; the `spell_id` is what refuses it, because its
      // scope and its visibility are the parent spell's (findManyInSpell).
      findMany(spellIngredients);

    const readAssignmentsUnscoped = () =>
      // @ts-expect-error — the same for `spell_categories`.
      findOne(spellCategories);

    const readLayersThroughTheHatch = () =>
      // @ts-expect-error — the escape hatch takes the unscoped side too, and a
      // hard-deleted table has no soft-deleted row to include anyway (MB.34).
      findManyIncludingSoftDeleted(spellIngredients);

    const scopeAJoinTableByWorkspace = (membership: Membership) =>
      // @ts-expect-error — `spell_categories` has no workspace_id to AND on,
      // which is exactly why it goes through its spell instead.
      findManyInWorkspace(membership, spellCategories);

    expect(readSpellsWithoutTheVisibilityRule).toBeInstanceOf(Function);
    expect(readOneSpellWithoutTheVisibilityRule).toBeInstanceOf(Function);
    expect(readLayersUnscoped).toBeInstanceOf(Function);
    expect(readAssignmentsUnscoped).toBeInstanceOf(Function);
    expect(readLayersThroughTheHatch).toBeInstanceOf(Function);
    expect(scopeAJoinTableByWorkspace).toBeInstanceOf(Function);
  });
});
