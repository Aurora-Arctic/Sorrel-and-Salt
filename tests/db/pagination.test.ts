import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq, sql as fragment } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '@/modules/identity/schema/users';
import {
  type SortPart,
  findPage,
  findPageCount,
  findPageInWorkspace,
  withAudit,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { InvalidCursor } from '@/lib/errors';
import { decodeCursor, encodeCursor, resolvePage } from '@/lib/pagination';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, D, asUser } from '../support/as-user';
import type { ConnectionArgs, Page } from '@/lib/types';

// CLAUDE.md rule 8, end to end below the transport: `resolvePage` drives the
// repository's keyset finders exactly as a connection resolver will.

// Scratch tables, as in tests/db/repository/: the contract is about the shape,
// not any one domain table.
const leaves = pgTable('pagination_probe_leaves', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  note: text('note'),
  pickedAt: timestamp('picked_at', { withTimezone: true }).notNull().defaultNow(),
  ...auditColumns,
});

const jars = pgTable('pagination_probe_jars', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull(),
  label: text('label').notNull(),
  ...auditColumns,
});

const session = { userId: '11111111-1111-1111-1111-111111111111' };

let sql: ReturnType<typeof postgres>;

const AUDIT_DDL = `
  created_at timestamp not null default now(),
  created_by uuid not null,
  updated_at timestamp not null default now(),
  updated_by uuid not null,
  deleted_at timestamp,
  deleted_by uuid`;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  await sql.unsafe(`
    create table pagination_probe_leaves (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      note text,
      picked_at timestamptz not null default now(),
      ${AUDIT_DDL}
    )`);
  await sql.unsafe(`
    create table pagination_probe_jars (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null,
      label text not null,
      ${AUDIT_DDL}
    )`);
});

afterAll(async () => {
  await sql`drop table if exists pagination_probe_leaves`;
  await sql`drop table if exists pagination_probe_jars`;
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate pagination_probe_leaves`;
  await sql`truncate pagination_probe_jars`;
});

/**
 * Sixty live leaves, thirty names each held twice — so half the page
 * boundaries fall between two rows sharing a sort key, and only the id
 * decides which side each lands on — plus one soft-deleted leaf.
 */
async function seedLeaves() {
  await sql`
    insert into pagination_probe_leaves (name, created_by, updated_by)
    select 'Leaf ' || lpad(n::text, 2, '0'), ${session.userId}, ${session.userId}
    from generate_series(1, 30) as n, generate_series(1, 2)`;
  await sql`
    insert into pagination_probe_leaves (name, created_by, updated_by, deleted_at, deleted_by)
    values ('Leaf 15', ${session.userId}, ${session.userId}, now(), ${session.userId})`;
}

/** The ids of every live leaf in the order `ORDER BY name, id` gives — the answer key. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from pagination_probe_leaves where deleted_at is null order by name, id`;
  return rows.map((row) => row.id);
}

type Leaf = typeof leaves.$inferSelect;

function leafPage(args: ConnectionArgs): Promise<Page<Leaf>> {
  return resolvePage(args, (request) => findPage(leaves, [leaves.name], request));
}

/** Follows `endCursor` until the last page, collecting ids and page sizes. */
async function walkForward(first?: number, between?: (seen: string[]) => Promise<void>) {
  const ids: string[] = [];
  const sizes: number[] = [];
  let after: string | null = null;
  for (;;) {
    const page: Page<Leaf> = await leafPage({ first, after });
    ids.push(...page.edges.map((edge) => edge.node.id));
    sizes.push(page.edges.length);
    if (!page.pageInfo.hasNextPage) return { ids, sizes };
    after = page.pageInfo.endCursor;
    await between?.(ids);
  }
}

describe('Keyset pagination through the repository', () => {
  it('walks every live row once, in sort order, at the default page size', async () => {
    await seedLeaves();
    const expected = await expectedOrder();
    // The precondition: more rows than two pages, so a third is walked.
    expect(expected).toHaveLength(60);

    const { ids, sizes } = await walkForward();

    expect(sizes).toEqual([25, 25, 10]);
    expect(ids).toEqual(expected);
  });

  it('walks every live row once at a page size that splits tied sort keys', async () => {
    await seedLeaves();
    const expected = await expectedOrder();

    const { ids, sizes } = await walkForward(7);

    // 7 is odd, so page boundaries fall between two rows named alike.
    expect(sizes).toHaveLength(9);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expected);
  });

  it('never returns a soft-deleted row', async () => {
    await seedLeaves();
    const [deleted] = await sql<{ id: string }[]>`
      select id from pagination_probe_leaves where deleted_at is not null`;
    // Precondition: there is one to leak.
    expect(deleted).toBeDefined();

    const { ids } = await walkForward(100);

    expect(ids).not.toContain(deleted.id);
  });

  it('stays stable when rows are inserted and soft-deleted mid-traversal', async () => {
    await seedLeaves();
    const original = await expectedOrder();
    let insertedAhead = '';
    let insertedBehind = '';
    let deletedAhead = '';
    let deletedAtCursor = '';

    const { ids } = await walkForward(10, async (seen) => {
      if (seen.length !== 10) return;
      // One row lands behind the reader and one ahead; one unseen row goes,
      // and so does the very row the cursor names.
      [{ id: insertedBehind }] = await withAudit(session, (write) =>
        write.insert(leaves, { name: 'Leaf 00' }),
      );
      [{ id: insertedAhead }] = await withAudit(session, (write) =>
        write.insert(leaves, { name: 'Leaf 29½' }),
      );
      deletedAhead = original[40];
      deletedAtCursor = seen[9];
      await withAudit(session, (write) => write.softDelete(leaves, eq(leaves.id, deletedAhead)));
      await withAudit(session, (write) => write.softDelete(leaves, eq(leaves.id, deletedAtCursor)));
    });

    // Every row that lived throughout is seen exactly once, in order.
    const survivors = original.filter((id) => id !== deletedAhead);
    expect(ids.filter((id) => survivors.includes(id))).toEqual(survivors);
    expect(new Set(ids).size).toBe(ids.length);
    // Ahead of the cursor, a change shows; behind it, none replays.
    expect(ids).toContain(insertedAhead);
    expect(ids).not.toContain(insertedBehind);
    expect(ids).not.toContain(deletedAhead);
  });

  it('walks backwards from the end with `last`, mirroring the forward walk', async () => {
    await seedLeaves();
    const expected = await expectedOrder();

    const ids: string[] = [];
    let before: string | null = null;
    for (;;) {
      const page: Page<Leaf> = await leafPage({ last: 7, before });
      ids.unshift(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasPreviousPage) break;
      before = page.pageInfo.startCursor;
    }

    expect(ids).toEqual(expected);
  });

  // A JS Date holds milliseconds; Postgres holds microseconds. A cursor built
  // from the Date would sit before every row in the millisecond, and replay them.
  it('keeps microseconds in a timestamp sort key', async () => {
    await sql`
      insert into pagination_probe_leaves (name, picked_at, created_by, updated_by)
      select 'Leaf', '2026-01-01 00:00:00+00'::timestamptz + make_interval(secs => n / 1000000.0),
             ${session.userId}, ${session.userId}
      from generate_series(1, 9) as n`;

    const ids: string[] = [];
    let after: string | null = null;
    // Bounded: a cursor that replays rows would otherwise walk forever.
    for (let pages = 0; pages < 10; pages += 1) {
      const page: Page<Leaf> = await resolvePage({ first: 2, after }, (request) =>
        findPage(leaves, [leaves.pickedAt], request),
      );
      ids.push(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }

    const expected = await sql<{ id: string }[]>`
      select id from pagination_probe_leaves order by picked_at, id`;
    expect(ids).toEqual(expected.map((row) => row.id));
  });

  it('refuses a cursor whose key is not a value of the sort column', async () => {
    await seedLeaves();
    const forged = encodeCursor({ key: ['Leaf 07'], id: '0f9c2b1e-6a51-4c3f-9d7e-2b8a4e1c5d60' });

    // The same cursor is a fine position in a list sorted by name, so the
    // refusal is the timestamp cast and not the cursor's shape.
    await expect(leafPage({ after: forged })).resolves.toBeDefined();
    await expect(
      resolvePage({ after: forged }, (request) => findPage(leaves, [leaves.pickedAt], request)),
    ).rejects.toThrow(InvalidCursor);
  });

  // Only a cursor is client text, so only a data exception is a bad cursor;
  // a fault in the query itself is not the client's to hear about.
  it('passes any other database error through unchanged', async () => {
    const attempt = resolvePage({}, (request) => findPage(leaves, [jars.label], request));

    await expect(attempt).rejects.toThrow(/pagination_probe_jars/);
    await expect(attempt).rejects.not.toBeInstanceOf(InvalidCursor);
  });

  it('refuses a cursor whose id is not an id', async () => {
    await expect(
      leafPage({ after: encodeCursor({ key: ['Leaf 07'], id: 'seven' }) }),
    ).rejects.toThrow(InvalidCursor);
  });

  it('refuses a cursor whose key has the wrong number of parts, before any read', async () => {
    await seedLeaves();
    const id = '0f9c2b1e-6a51-4c3f-9d7e-2b8a4e1c5d60';

    // The one-part cursor is a fine position here, so the refusals are the count.
    await expect(
      leafPage({ after: encodeCursor({ key: ['Leaf 07'], id }) }),
    ).resolves.toBeDefined();
    await expect(
      leafPage({ after: encodeCursor({ key: ['Leaf 07', 'Leaf 08'], id }) }),
    ).rejects.toThrow(InvalidCursor);
    await expect(
      resolvePage({ before: encodeCursor({ key: ['Leaf 07'], id }) }, (request) =>
        findPage(leaves, COMPUTED, request),
      ),
    ).rejects.toThrow(InvalidCursor);
  });

  it('sorts only on a column that cannot be null', () => {
    const request = { limit: 1, inverted: false };
    // A NULL sort key makes the row comparison NULL, and the row vanishes
    // from every page.
    // @ts-expect-error — `note` is nullable.
    void (() => findPage(leaves, [leaves.note], request));
  });
});

/**
 * A key of two parts, the first computed: the name's length over three,
 * negated, so longer names come first and the part is a fraction a cursor
 * has to carry exactly — then the name. `real`, as the compendium's score is.
 */
const COMPUTED: SortPart[] = [
  { expression: fragment`-(length(${leaves.name})::real / 3)`, type: 'real' },
  leaves.name,
];

// "Page X of Y" for a list read through `findPage`: the count of its own rows,
// soft-deleted ones left out, and how many come before a page's first row in
// its own order, ties split by id as the page splits them.
describe('findPageCount', () => {
  it('counts the live rows findPage pages, and how many come before a page’s first row', async () => {
    await seedLeaves();
    const first = await leafPage({ first: 25 });
    const second = await leafPage({ first: 25, after: first.pageInfo.endCursor });
    // The precondition: the second page opens between two rows sharing a name,
    // so only the id can place its first row.
    const [{ name: lastOfFirst }] = await sql<{ name: string }[]>`
      select name from pagination_probe_leaves
      where id = ${first.edges[24].node.id}`;
    expect(second.edges[0].node.name).toBe(lastOfFirst);

    await expect(findPageCount(leaves, [leaves.name], undefined)).resolves.toEqual({
      totalCount: 60,
      countBefore: null,
    });
    await expect(
      findPageCount(leaves, [leaves.name], decodeCursor(second.pageInfo.startCursor as string)),
    ).resolves.toEqual({ totalCount: 60, countBefore: 25 });
  });
});

describe('Keyset pagination on a compound, computed key', () => {
  /**
   * Forty leaves over five lengths and fifteen names, so rows tie on the
   * computed part, on both parts, and only the id tells them apart.
   */
  async function seedTies() {
    await sql`
      insert into pagination_probe_leaves (name, created_by, updated_by)
      select repeat('x', n % 5 + 1) || ' ' || (n % 3), ${session.userId}, ${session.userId}
      from generate_series(1, 40) as n`;
  }

  async function expectedComputedOrder(): Promise<string[]> {
    const rows = await sql<{ id: string }[]>`
      select id from pagination_probe_leaves
      order by -(length(name)::real / 3), name, id`;
    return rows.map((row) => row.id);
  }

  const computedPage = (args: ConnectionArgs) =>
    resolvePage(args, (request) => findPage(leaves, COMPUTED, request));

  it('walks every row once, in order, across ties on either part', async () => {
    await seedTies();
    const expected = await expectedComputedOrder();
    // The precondition for the ties: fewer distinct keys than rows, at either depth.
    const [{ lengths, names }] = await sql<{ lengths: number; names: number }[]>`
      select count(distinct length(name))::int as lengths, count(distinct name)::int as names
      from pagination_probe_leaves`;
    expect([lengths, names]).toEqual([5, 15]);

    const ids: string[] = [];
    let after: string | null = null;
    for (;;) {
      const page: Page<Leaf> = await computedPage({ first: 7, after });
      ids.push(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }

    expect(ids).toEqual(expected);
  });

  it('walks it backwards with `last`, mirroring the forward walk', async () => {
    await seedTies();
    const expected = await expectedComputedOrder();

    const ids: string[] = [];
    let before: string | null = null;
    for (;;) {
      const page: Page<Leaf> = await computedPage({ last: 7, before });
      ids.unshift(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasPreviousPage) break;
      before = page.pageInfo.startCursor;
    }

    expect(ids).toEqual(expected);
  });

  it('keys each row by every part, as Postgres prints it', async () => {
    await sql`
      insert into pagination_probe_leaves (name, created_by, updated_by)
      values ('xx', ${session.userId}, ${session.userId})`;

    const page = await computedPage({ first: 1 });

    // -2/3 as a `real` prints shortest-exact, and casts back to the same value.
    expect(decodeCursor(page.pageInfo.endCursor as string).key).toEqual(['-0.6666667', 'xx']);
  });
});

describe('Keyset pagination inside a workspace', () => {
  let inW: Membership;

  beforeEach(async () => {
    inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['create'] });
    const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create'] });
    for (const [membership, label] of [
      [inW, 'W jar'],
      [inX, 'X jar'],
    ] as const) {
      for (let n = 0; n < 3; n += 1) {
        await withAudit(asUser(membership === inW ? A : D), (write) =>
          write.insertInWorkspace(membership, jars, { label: `${label} ${n}` }),
        );
      }
    }
  });

  it('pages only the proof’s workspace', async () => {
    // Precondition: X has rows a leak would show.
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from pagination_probe_jars where workspace_id = ${WORKSPACE_X_ID}`;
    expect(count).toBe(3);

    const page = await resolvePage({ first: 100 }, (request) =>
      findPageInWorkspace(inW, jars, [jars.label], request),
    );

    expect(page.edges.map((edge) => edge.node.label)).toEqual(['W jar 0', 'W jar 1', 'W jar 2']);
  });

  it('reaches a workspace-scoped table only with a proof', () => {
    const request = { limit: 1, inverted: false };
    // @ts-expect-error — `jars` carries `workspace_id`, so the unscoped finder refuses it.
    void (() => findPage(jars, [jars.label], request));
  });
});
