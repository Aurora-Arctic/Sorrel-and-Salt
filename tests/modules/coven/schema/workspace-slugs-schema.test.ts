import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableName } from 'drizzle-orm';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { A, B, asUser } from '../../../support/as-user';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { findWorkspaceHoldingSlug, findWorkspaceSlugs, withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { workspaceSlugs } from '@/modules/coven/schema/workspace-slugs';

// Every address a coven has had, its current one and its old ones together, so one partial index refuses an address
// that two live covens would share (claude-docs/tasks/m17.md, M17.22).

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

async function insertCoven(name: string, members: [string, string][] = [[OWNER, 'owner']]) {
  const [coven] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: OWNER, updated_by: OWNER })}
    returning id, slug`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${coven.id}, ${userId}, ${role}, ${OWNER}, ${OWNER})`;
  }
  return { id: coven.id as string, slug: coven.slug as string };
}

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
    const first = await insertCoven(`Fixture First Holder ${token()}`);
    const second = await insertCoven(`Fixture Second Holder ${token()}`);
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
    const coven = await insertCoven(`Fixture Hard Deleted ${token()}`);
    await address(coven.id, coven.slug);

    await sql`delete from workspace_members where workspace_id = ${coven.id}`;
    await sql`delete from workspaces where id = ${coven.id}`;

    expect(await sql`select id from workspace_slugs where workspace_id = ${coven.id}`).toEqual([]);
  });

  it('refuses the same address twice for one coven too', async () => {
    const coven = await insertCoven(`Fixture Twice Holder ${token()}`);
    const slug = `fixture-twice-${token()}`;
    await address(coven.id, slug);

    expect((await failureOf(address(coven.id, slug))).constraint_name).toBe(SLUG_UNIQUE);
  });
});

describe('findWorkspaceHoldingSlug', () => {
  let coven: { id: string; slug: string };
  const old = `fixture-old-address-${token()}`;

  beforeAll(async () => {
    coven = await insertCoven(`Fixture Moved Coven ${token()}`);
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
    const deleted = await insertCoven(`Fixture Deleted Holder ${token()}`);
    const slug = `fixture-deleted-holder-${token()}`;
    await address(deleted.id, slug);
    expect((await findWorkspaceHoldingSlug(slug))?.workspace.id).toBe(deleted.id);

    await sql`update workspaces set deleted_at = now(), deleted_by = ${OWNER} where id = ${deleted.id}`;

    expect(await findWorkspaceHoldingSlug(slug)).toBeUndefined();
  });
});

describe('findWorkspaceSlugs', () => {
  it("lists only the proof's own coven's live addresses", async () => {
    const coven = await insertCoven(`Fixture Listed Coven ${token()}`, [
      [OWNER, 'owner'],
      [B.id, 'member'],
    ]);
    const other = await insertCoven(`Fixture Unlisted Coven ${token()}`);
    const kept = `fixture-kept-${token()}`;
    const [dropped] = await address(coven.id, `fixture-dropped-${token()}`);
    await address(coven.id, coven.slug);
    await address(coven.id, kept);
    await address(other.id, other.slug);
    await sql`update workspace_slugs set deleted_at = now(), deleted_by = ${OWNER} where id = ${dropped.id}`;

    const membership = await assertMembership(asUser(B), coven.id, { workspace: ['read'] });
    const listed = (await findWorkspaceSlugs(membership)).map(({ slug }) => slug).sort();

    expect(listed).toEqual([coven.slug, kept].sort());
  });
});

describe('the address writers', () => {
  it('insertWorkspaceSlug records an address for a coven named by id, stamped from the session', async () => {
    const coven = await insertCoven(`Fixture Recorded Coven ${token()}`);
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
    const coven = await insertCoven(`Fixture Renamed Coven ${token()}`);
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
    const coven = await insertCoven(`Fixture Unrecorded Coven ${token()}`);
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
    const coven = await insertCoven(`Fixture Returning Coven ${token()}`);
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
    const coven = await insertCoven(`Fixture Gone Coven ${token()}`);
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
    const other = await insertCoven(`Fixture Bystander Coven ${token()}`);
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
    const coven = await insertCoven(`Fixture Freed Coven ${token()}`);
    const old = `fixture-freed-old-${token()}`;
    await address(coven.id, coven.slug);
    await address(coven.id, old);
    const bystander = await insertCoven(`Fixture Kept Coven ${token()}`);
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
