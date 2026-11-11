import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, D, asUser } from '../../../support/as-user';
import { insertWorkspaceWithSlug } from '../../../support/db/insert-workspace';
import { findWorkspaceHoldingSlug, withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { violatedUniqueIndex } from '@/lib/unique-violation';
import { assertMembership } from '@/modules/coven';
import { workspaceSlugs } from '@/modules/coven/schema/workspace-slugs';

// A coven's live addresses, its current one and its one old one together, so one partial index refuses an address that
// two live covens would share (claude-docs/tasks/v1/m17.md, M17.22, M17.23).

const OWN_COLUMNS = ['id', 'workspace_id', 'slug'];
const SLUG_UNIQUE = 'workspace_slugs_slug_unique';
const OWNER = A.id;

describe('workspace_slugs schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(workspaceSlugs);

  it('has its columns and the full audit spread, deleted_at among it, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
    expect(AUDIT_COLUMNS).toContain('deleted_at');
  });

  it('declares the coven and the address not null', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.slug.notNull).toBe(true);
  });

  it('declares one unique index on the address, partial', () => {
    expect(Object.keys(byIndexName)).toEqual([SLUG_UNIQUE]);
    expect(byIndexName[SLUG_UNIQUE].config.unique).toBe(true);
    expect(byIndexName[SLUG_UNIQUE].config.where).toBeDefined();
  });

  it('has a foreign key to the coven and no other', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [fk.column, getTableName(fk.foreignTable)]).sort(),
    ).toEqual([['workspace_id', 'workspaces']]);
  });
});

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const token = () => crypto.randomUUID().slice(0, 8);

function address(workspaceId: string, slug: string) {
  return sql`
    insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
    values (${workspaceId}, ${slug}, ${OWNER}, ${OWNER}) returning *`;
}

const liveAddresses = async (workspaceId: string) =>
  (
    await sql<{ slug: string }[]>`
      select slug from workspace_slugs
      where workspace_id = ${workspaceId} and deleted_at is null order by slug`
  ).map(({ slug }) => slug);

describe('workspace_slugs table', () => {
  it('refuses an address in no coven', async () => {
    const failure = await failureOf(address(crypto.randomUUID(), `fixture-nowhere-${token()}`));

    expect(failure.code).toBe('23503');
  });

  it('refuses one address held by two live covens, and admits it once the first holder is soft-deleted', async () => {
    const first = await insertWorkspaceWithSlug(sql, `Fixture First Holder ${token()}`);
    const second = await insertWorkspaceWithSlug(sql, `Fixture Second Holder ${token()}`);
    const shared = `fixture-shared-${token()}`;
    const [held] = await address(first.id, shared);
    // Precondition: the two covens are distinct and live, so only the address can clash.
    expect(first.id).not.toBe(second.id);

    const clash = await failureOf(address(second.id, shared));
    expect(clash.code).toBe('23505');
    expect(clash.constraint_name).toBe(SLUG_UNIQUE);

    await sql`update workspace_slugs set deleted_at = now(), deleted_by = ${OWNER} where id = ${held.id}`;
    const [admitted] = await address(second.id, shared);
    expect(admitted).toMatchObject({ workspace_id: second.id, slug: shared });
  });

  it("goes with its coven when a test or a manual fix hard-deletes the coven's row", async () => {
    // The app only soft-deletes a coven; a hard delete is a fixture's or a manual fix's, and the address must not block it.
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Hard Deleted ${token()}`);
    await address(coven.id, coven.slug);

    await sql`delete from workspace_members where workspace_id = ${coven.id}`;
    await sql`delete from workspaces where id = ${coven.id}`;

    expect(await sql`select id from workspace_slugs where workspace_id = ${coven.id}`).toEqual([]);
  });

  it('refuses the same address twice for one coven too', async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Twice Holder ${token()}`);
    const slug = `fixture-twice-${token()}`;
    await address(coven.id, slug);

    expect((await failureOf(address(coven.id, slug))).constraint_name).toBe(SLUG_UNIQUE);
  });
});

describe('findWorkspaceHoldingSlug', () => {
  let coven: { id: string; slug: string };
  const old = `fixture-old-address-${token()}`;

  beforeAll(async () => {
    coven = await insertWorkspaceWithSlug(sql, `Fixture Moved Coven ${token()}`);
    await address(coven.id, coven.slug);
    await address(coven.id, old);
  });

  it('finds the live coven holding a current address, marked current', async () => {
    const found = await findWorkspaceHoldingSlug(coven.slug);

    expect(found?.workspace.id).toBe(coven.id);
    expect(found?.current).toBe(true);
  });

  it('finds the live coven holding an old address, marked not current', async () => {
    const found = await findWorkspaceHoldingSlug(old);

    expect(found?.workspace.id).toBe(coven.id);
    expect(found?.workspace.slug).toBe(coven.slug);
    expect(found?.current).toBe(false);
  });

  it('finds nothing for an address no coven has held', async () => {
    expect(await findWorkspaceHoldingSlug(`fixture-never-${token()}`)).toBeUndefined();
  });

  it('finds nothing for a soft-deleted address row', async () => {
    const gone = `fixture-gone-address-${token()}`;
    const [row] = await address(coven.id, gone);
    // Precondition: found while the row is live, so the miss below is the soft delete's.
    expect((await findWorkspaceHoldingSlug(gone))?.workspace.id).toBe(coven.id);

    await sql`update workspace_slugs set deleted_at = now(), deleted_by = ${OWNER} where id = ${row.id}`;

    expect(await findWorkspaceHoldingSlug(gone)).toBeUndefined();
  });

  it('finds nothing for a live address row whose coven is soft-deleted', async () => {
    const deleted = await insertWorkspaceWithSlug(sql, `Fixture Deleted Holder ${token()}`);
    const slug = `fixture-deleted-holder-${token()}`;
    await address(deleted.id, slug);
    expect((await findWorkspaceHoldingSlug(slug))?.workspace.id).toBe(deleted.id);

    await sql`update workspaces set deleted_at = now(), deleted_by = ${OWNER} where id = ${deleted.id}`;

    expect(await findWorkspaceHoldingSlug(slug)).toBeUndefined();
  });
});

describe('the address writers', () => {
  it('insertWorkspaceSlug records an address for a coven named by id, stamped from the session', async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Recorded Coven ${token()}`);
    const slug = `fixture-recorded-${token()}`;

    const [row] = await withAudit(asUser(A), (write) => write.insertWorkspaceSlug(coven.id, slug));

    expect(row).toMatchObject({
      workspaceId: coven.id,
      slug,
      createdBy: A.id,
      updatedBy: A.id,
      deletedAt: null,
    });
  });

  it("updateWorkspaceName sets the proof's coven's name and address, and keeps the old address", async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Renamed Coven ${token()}`);
    await address(coven.id, coven.slug);
    const next = `fixture-renamed-next-${token()}`;
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['update'] });

    const [row] = await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, { name: 'Fixture Next Name', slug: next }),
    );

    expect(row).toMatchObject({ id: coven.id, name: 'Fixture Next Name', slug: next });
    expect(await liveAddresses(coven.id)).toEqual([coven.slug, next].sort());
    const [stamp] = await sql`select updated_by from workspaces where id = ${coven.id}`;
    expect(stamp.updated_by).toBe(A.id);
  });

  it('updateWorkspaceName records the previous address too when the coven holds no row for it', async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Unrecorded Coven ${token()}`);
    // Precondition: no address row, as for a coven inserted before the table.
    expect(await liveAddresses(coven.id)).toEqual([]);
    const next = `fixture-unrecorded-next-${token()}`;
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['update'] });

    await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, { name: 'Fixture Unrecorded Next', slug: next }),
    );

    expect(await liveAddresses(coven.id)).toEqual([coven.slug, next].sort());
  });

  it('updateWorkspaceName back to an earlier address reuses its row rather than adding one', async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Returning Coven ${token()}`);
    await address(coven.id, coven.slug);
    const away = `fixture-returning-away-${token()}`;
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['update'] });
    await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, { name: 'Fixture Away', slug: away }),
    );

    await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, { name: 'Fixture Back', slug: coven.slug }),
    );

    const rows = await sql`
      select slug from workspace_slugs where workspace_id = ${coven.id} order by slug`;
    expect(rows.map(({ slug }) => slug)).toEqual([away, coven.slug].sort());
    const [current] = await sql`select slug from workspaces where id = ${coven.id}`;
    expect(current.slug).toBe(coven.slug);
  });

  it('updateWorkspaceName writes nothing to a soft-deleted coven', async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Gone Coven ${token()}`);
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['update'] });
    await sql`update workspaces set deleted_at = now(), deleted_by = ${OWNER} where id = ${coven.id}`;

    const rows = await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, {
        name: 'Fixture Revived',
        slug: `fixture-x-${token()}`,
      }),
    );

    expect(rows).toEqual([]);
    const [stored] = await sql`select name from workspaces where id = ${coven.id}`;
    expect(stored.name).not.toBe('Fixture Revived');
  });

  it("updateWorkspaceName touches only the proof's coven", async () => {
    const membership = await assertMembership(asUser(A), WORKSPACE_W_ID, { workspace: ['update'] });
    const [before] = await sql`select name, slug from workspaces where id = ${WORKSPACE_W_ID}`;
    const other = await insertWorkspaceWithSlug(sql, `Fixture Bystander Coven ${token()}`);
    const [otherBefore] = await sql`select name, slug from workspaces where id = ${other.id}`;

    await withAudit(asUser(A), (write) =>
      write.updateWorkspaceName(membership, {
        name: 'Fixture Whitethorn Renamed',
        slug: `fixture-whitethorn-renamed-${token()}`,
      }),
    );

    const [otherAfter] = await sql`select name, slug from workspaces where id = ${other.id}`;
    expect(otherAfter).toEqual(otherBefore);
    // Put W back for the tests after this one: the database is cloned per file.
    await sql`update workspaces set name = ${before.name}, slug = ${before.slug} where id = ${WORKSPACE_W_ID}`;
  });

  it("softDeleteWorkspace frees the coven's addresses with it", async () => {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Freed Coven ${token()}`);
    const old = `fixture-freed-old-${token()}`;
    await address(coven.id, coven.slug);
    await address(coven.id, old);
    const bystander = await insertWorkspaceWithSlug(sql, `Fixture Kept Coven ${token()}`);
    await address(bystander.id, bystander.slug);
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['delete'] });

    await withAudit(asUser(A), (write) => write.softDeleteWorkspace(membership));

    expect(await liveAddresses(coven.id)).toEqual([]);
    expect(await liveAddresses(bystander.id)).toEqual([bystander.slug]);
    // The index admits the freed addresses for another coven.
    await address(bystander.id, old);
    expect(await liveAddresses(bystander.id)).toEqual([bystander.slug, old].sort());
  });
});

const liveHolders = async (slug: string) =>
  (
    await sql<{ workspace_id: string }[]>`
      select workspace_id from workspace_slugs where slug = ${slug} and deleted_at is null`
  ).map(({ workspace_id }) => workspace_id);

const rowOf = async (workspaceId: string, slug: string) =>
  (
    await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
      select deleted_at, deleted_by from workspace_slugs
      where workspace_id = ${workspaceId} and slug = ${slug} order by created_at desc limit 1`
  )[0];

// A coven another coven may claim an address from: its current address and one old address, both live.
async function movedCoven(name: string) {
  const coven = await insertWorkspaceWithSlug(sql, name);
  const old = `fixture-claimable-${token()}`;
  await address(coven.id, coven.slug);
  await address(coven.id, old);
  // Precondition: the old address resolves to this coven, as not its current one.
  const held = await findWorkspaceHoldingSlug(old);
  expect(held?.workspace.id).toBe(coven.id);
  expect(held?.current).toBe(false);
  return { ...coven, old };
}

// Another coven's old address is free to take. The claimer's writer retires the old holder's row itself, under no proof of
// the old holder, so no service ever handles another coven's row (claude-docs/tasks/v1/m17.md, M17.23).
describe("the address writers and another coven's old address", () => {
  it("insertWorkspaceSlug retires another live coven's old-address row, stamped from the session, so one live row holds it", async () => {
    const holder = await movedCoven(`Fixture Old Holder ${token()}`);
    const claimer = await insertWorkspaceWithSlug(sql, `Fixture Claimer ${token()}`, [
      [D.id, 'owner'],
    ]);
    // Why the claim could leave the holder's row: D holds no seat in the holder's coven, so no proof of it exists.
    const [seat] = await sql`
      select 1 from workspace_members where workspace_id = ${holder.id} and user_id = ${D.id}`;
    expect(seat).toBeUndefined();

    const [row] = await withAudit(asUser(D), (write) =>
      write.insertWorkspaceSlug(claimer.id, holder.old),
    );

    expect(row).toMatchObject({ workspaceId: claimer.id, slug: holder.old, deletedAt: null });
    expect(await liveHolders(holder.old)).toEqual([claimer.id]);
    const retired = await rowOf(holder.id, holder.old);
    expect(retired?.deleted_at).not.toBeNull();
    expect(retired?.deleted_by).toBe(D.id);
    expect(await liveAddresses(holder.id)).toEqual([holder.slug]);
    expect((await findWorkspaceHoldingSlug(holder.old))?.workspace.id).toBe(claimer.id);
  });

  it("retires the old holder's row in the claimer's transaction, so a write that fails after the claim leaves it live", async () => {
    const holder = await movedCoven(`Fixture Kept Holder ${token()}`);
    const claimer = await insertWorkspaceWithSlug(sql, `Fixture Failed Claimer ${token()}`);

    await expect(
      withAudit(asUser(A), async (write) => {
        await write.insertWorkspaceSlug(claimer.id, holder.old);
        throw new Error('fixture failure after the claim');
      }),
    ).rejects.toThrow('fixture failure after the claim');

    expect(await liveHolders(holder.old)).toEqual([holder.id]);
    expect(await liveAddresses(claimer.id)).toEqual([]);
  });

  it("insertWorkspaceSlug leaves another live coven's current address alone, and the index refuses the claim", async () => {
    const holder = await movedCoven(`Fixture Current Holder ${token()}`);
    const claimer = await insertWorkspaceWithSlug(sql, `Fixture Current Claimer ${token()}`);

    const refused = await withAudit(asUser(A), (write) =>
      write.insertWorkspaceSlug(claimer.id, holder.slug),
    ).catch((error: unknown) => error);

    expect(violatedUniqueIndex(refused)).toBe(SLUG_UNIQUE);
    expect(await liveHolders(holder.slug)).toEqual([holder.id]);
  });

  it("updateWorkspaceName takes another live coven's old address and retires that coven's row", async () => {
    const holder = await movedCoven(`Fixture Renamed Away ${token()}`);
    const claimer = await insertWorkspaceWithSlug(sql, `Fixture Renamer ${token()}`, [
      [D.id, 'owner'],
    ]);
    await address(claimer.id, claimer.slug);
    const membership = await assertMembership(asUser(D), claimer.id, { workspace: ['update'] });

    const [row] = await withAudit(asUser(D), (write) =>
      write.updateWorkspaceName(membership, { name: 'Fixture Claimed Name', slug: holder.old }),
    );

    expect(row).toMatchObject({ id: claimer.id, slug: holder.old });
    expect(await liveHolders(holder.old)).toEqual([claimer.id]);
    expect((await rowOf(holder.id, holder.old))?.deleted_by).toBe(D.id);
    expect(await liveAddresses(holder.id)).toEqual([holder.slug]);
    expect(await liveAddresses(claimer.id)).toEqual([claimer.slug, holder.old].sort());
  });
});

// A coven keeps one old address: the one it held just before its latest rename (claude-docs/tasks/v1/m17.md, M17.23).
describe('updateWorkspaceName and the one old address', () => {
  async function renamedTwice() {
    const coven = await insertWorkspaceWithSlug(sql, `Fixture Twice Renamed ${token()}`);
    await address(coven.id, coven.slug);
    const second = `fixture-second-${token()}`;
    const third = `fixture-third-${token()}`;
    const membership = await assertMembership(asUser(A), coven.id, { workspace: ['update'] });
    const rename = (name: string, slug: string) =>
      withAudit(asUser(A), (write) => write.updateWorkspaceName(membership, { name, slug }));
    await rename('Fixture Second', second);
    // Precondition: after one rename the first address is the coven's one old address.
    expect(await liveAddresses(coven.id)).toEqual([coven.slug, second].sort());
    await rename('Fixture Third', third);
    return { ...coven, first: coven.slug, second, third, rename };
  }

  it('retires the address before the previous one, stamped from the session, and keeps the previous one', async () => {
    const coven = await renamedTwice();

    expect(await liveAddresses(coven.id)).toEqual([coven.second, coven.third].sort());
    const retired = await rowOf(coven.id, coven.first);
    expect(retired?.deleted_at).not.toBeNull();
    expect(retired?.deleted_by).toBe(A.id);
    expect(await findWorkspaceHoldingSlug(coven.first)).toBeUndefined();
    expect((await findWorkspaceHoldingSlug(coven.second))?.workspace.id).toBe(coven.id);
  });

  it('back to the previous address reuses its row and leaves no live row for an earlier one', async () => {
    const coven = await renamedTwice();

    await coven.rename('Fixture Second Again', coven.second);

    expect(await liveAddresses(coven.id)).toEqual([coven.second, coven.third].sort());
    const rows = await sql`
      select id from workspace_slugs where workspace_id = ${coven.id} and slug = ${coven.second}`;
    expect(rows).toHaveLength(1);
    const [current] = await sql`select slug from workspaces where id = ${coven.id}`;
    expect(current.slug).toBe(coven.second);
  });

  it('takes back an address it dropped, with a new row, and drops the address before the previous one', async () => {
    const coven = await renamedTwice();

    await coven.rename('Fixture First Again', coven.first);

    expect(await liveAddresses(coven.id)).toEqual([coven.first, coven.third].sort());
    const [current] = await sql`select slug from workspaces where id = ${coven.id}`;
    expect(current.slug).toBe(coven.first);
  });
});
