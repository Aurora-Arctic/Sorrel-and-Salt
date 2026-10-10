import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  countPrivilegeChanges,
  listPrivilegeChanges,
  listedOnUserList,
  usersForAdmin,
} from '@/modules/identity';
import type { PrivilegeChangeFilter } from '@/modules/identity';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import type { LedgerRow } from './types';

// MB.199: the read under `/admin/privilege-changes`, the one privilege ledger
// newest first, narrowed by subject and by privilege. A site admin's alone,
// refused at the service by direct call (claude-docs/auth/admin-users.md,
// "The privilege ledger").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

// The ledger as this file writes it, straight into the table: nothing in the
// application inserts a row, and the trigger would stamp every row of one
// transaction with one instant. Two pairs share an instant, as a role grant
// and the creation flag it sets do, and two rows sit a microsecond apart,
// which a cursor read back through a `Date` would merge.
const LEDGER = [
  {
    user: A,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'invitation',
    at: '2026-01-01 09:00:00+00',
    note: null,
  },
  {
    user: B,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'admin',
    at: '2026-01-02 09:00:00+00',
    note: null,
  },
  {
    user: B,
    privilege: 'admin',
    change: 'grant',
    via: 'admin',
    at: '2026-01-03 09:00:00+00',
    note: 'Covering the spring audit',
  },
  {
    user: B,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'admin',
    at: '2026-01-03 09:00:00+00',
    note: 'Covering the spring audit',
  },
  {
    user: D,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'manual',
    at: '2026-01-04 09:00:00.000001+00',
    note: null,
  },
  {
    user: D,
    privilege: 'create_workspace',
    change: 'revoke',
    via: 'admin',
    at: '2026-01-04 09:00:00.000002+00',
    note: null,
  },
  {
    user: B,
    privilege: 'admin',
    change: 'revoke',
    via: 'admin',
    at: '2026-01-05 09:00:00+00',
    note: null,
  },
  {
    user: C,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'admin',
    at: '2026-01-06 09:00:00+00',
    note: null,
  },
  {
    user: C,
    privilege: 'create_workspace',
    change: 'revoke',
    via: 'admin',
    at: '2026-01-06 09:00:00+00',
    note: null,
  },
];

beforeAll(async () => {
  // The seed's own rows go first, so every row read is one this file wrote.
  await sql`truncate user_privilege_changes`;
  for (const row of LEDGER) {
    await sql`
      insert into user_privilege_changes
        (user_id, privilege, change, via, note, created_at, created_by, updated_at, updated_by)
      values (${row.user.id}, ${row.privilege}, ${row.change}, ${row.via}, ${row.note},
              ${row.at}, ${E.id}, ${row.at}, ${E.id})
    `;
  }
});

/** The ledger in the order the service promises: newest first, then by id. */
async function newestFirst(): Promise<LedgerRow[]> {
  return sql<LedgerRow[]>`
    select id, user_id, privilege::text from user_privilege_changes
    order by created_at desc, id
  `;
}

async function ids(filter: PrivilegeChangeFilter): Promise<string[]> {
  return (await listPrivilegeChanges(asUser(E), filter, PAGE)).map((entry) => entry.node.id);
}

describe('listPrivilegeChanges', () => {
  it('reads an admin every change, newest first, with what each row says', async () => {
    const expected = await newestFirst();
    expect(expected).toHaveLength(LEDGER.length);

    const page = await listPrivilegeChanges(asUser(E), {}, PAGE);

    expect(page.map((entry) => entry.node.id)).toEqual(expected.map((row) => row.id));
    expect(page[0].node).toMatchObject({
      userId: C.id,
      privilege: 'create_workspace',
      createdBy: E.id,
      createdAt: expect.any(Date),
    });
    expect(page.map((entry) => entry.node.note).filter(Boolean)).toEqual([
      'Covering the spring audit',
      'Covering the spring audit',
    ]);
  });

  it('narrows to one subject', async () => {
    const expected = (await newestFirst()).filter((row) => row.user_id === B.id);
    expect(expected).toHaveLength(4);

    expect(await ids({ userId: B.id })).toEqual(expected.map((row) => row.id));
  });

  it('narrows to one privilege', async () => {
    const expected = (await newestFirst()).filter((row) => row.privilege === 'admin');
    expect(expected).toHaveLength(2);

    expect(await ids({ privilege: 'admin' })).toEqual(expected.map((row) => row.id));
  });

  it('narrows by both at once', async () => {
    const expected = (await newestFirst()).filter(
      (row) => row.user_id === B.id && row.privilege === 'create_workspace',
    );
    expect(expected).toHaveLength(2);

    expect(await ids({ userId: B.id, privilege: 'create_workspace' })).toEqual(
      expected.map((row) => row.id),
    );
  });

  it('answers a subject with no changes an empty page', async () => {
    expect(await ids({ userId: E.id })).toEqual([]);
  });

  // Pages of two cut through both shared instants and the microsecond pair.
  it('walks the ledger two at a time, neither repeating nor dropping a row', async () => {
    const expected = (await newestFirst()).map((row) => row.id);
    const seen: string[] = [];
    let after: string | undefined;
    for (let pages = 0; pages < LEDGER.length; pages += 1) {
      const page = await resolvePage({ first: 2, after }, (request) =>
        listPrivilegeChanges(asUser(E), {}, request),
      );
      seen.push(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor ?? undefined;
    }

    expect(seen).toEqual(expected);
  });

  it('walks back from the end the same way', async () => {
    const expected = (await newestFirst()).map((row) => row.id);
    const seen: string[] = [];
    let before: string | undefined;
    for (let pages = 0; pages < LEDGER.length; pages += 1) {
      const page = await resolvePage({ last: 2, before }, (request) =>
        listPrivilegeChanges(asUser(E), {}, request),
      );
      seen.unshift(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasPreviousPage) break;
      before = page.pageInfo.startCursor ?? undefined;
    }

    expect(seen).toEqual(expected);
  });

  it('refuses a subject that is not an id as invalid, rather than reading', async () => {
    await expect(listPrivilegeChanges(asUser(E), { userId: 'not-an-id' }, PAGE)).rejects.toThrow(
      ValidationError,
    );
  });

  // Why the refusal is the role's: the same call as an admin reads these rows,
  // including the ones about the caller themselves.
  it.each([
    ['A, a coven owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s with Forbidden', async (_name, user) => {
    expect(asUser(user).role).toBe('user');
    const theirs = (await newestFirst()).filter((row) => row.user_id === user.id);
    expect(theirs.length).toBeGreaterThan(0);
    expect(await ids({ userId: user.id })).toEqual(theirs.map((row) => row.id));

    await expect(listPrivilegeChanges(asUser(user), {}, PAGE)).rejects.toThrow(Forbidden);
    await expect(listPrivilegeChanges(asUser(user), { userId: user.id }, PAGE)).rejects.toThrow(
      'Only a site admin may read the privilege ledger',
    );
  });
});

describe('usersForAdmin', () => {
  it('answers an admin each live user named, in the order asked, null for no one', async () => {
    const nowhere = '00000000-0000-0000-0000-0000000000f9';

    const answers = await usersForAdmin(asUser(E), [B.id, nowhere, A.id, B.id]);

    expect(answers.map((user) => (user instanceof Error ? user : (user?.id ?? null)))).toEqual([
      B.id,
      null,
      A.id,
      B.id,
    ]);
  });

  it('refuses every slot to a non-admin, whose own row an admin would be answered', async () => {
    expect(asUser(A).role).toBe('user');
    const [own] = await usersForAdmin(asUser(E), [A.id]);
    expect(own).toMatchObject({ id: A.id });

    const answers = await usersForAdmin(asUser(A), [A.id, B.id]);

    expect(answers).toEqual([expect.any(Forbidden), expect.any(Forbidden)]);
  });
});

describe('countPrivilegeChanges', () => {
  it('counts the ledger under a filter, and the rows before a page', async () => {
    const expected = (await newestFirst()).filter((row) => row.user_id === B.id);
    const page = await resolvePage({ first: 2 }, (request) =>
      listPrivilegeChanges(asUser(E), { userId: B.id }, request),
    );
    const second = await resolvePage(
      { first: 2, after: page.pageInfo.endCursor ?? undefined },
      (request) => listPrivilegeChanges(asUser(E), { userId: B.id }, request),
    );
    const start = decodeCursor(second.pageInfo.startCursor ?? '');

    expect(await countPrivilegeChanges(asUser(E), { userId: B.id }, start)).toEqual({
      totalCount: expected.length,
      countBefore: 2,
    });
    expect(await countPrivilegeChanges(asUser(E), {}, undefined)).toEqual({
      totalCount: LEDGER.length,
      countBefore: null,
    });
    expect(await countPrivilegeChanges(asUser(E), { privilege: 'admin' }, undefined)).toMatchObject(
      { totalCount: 2 },
    );
  });

  it('refuses a non-admin with Forbidden, whose count an admin reads', async () => {
    expect(asUser(A).role).toBe('user');
    expect((await countPrivilegeChanges(asUser(E), { userId: A.id }, undefined)).totalCount).toBe(
      1,
    );

    await expect(countPrivilegeChanges(asUser(A), { userId: A.id }, undefined)).rejects.toThrow(
      Forbidden,
    );
  });

  it('refuses a subject that is not an id as invalid', async () => {
    await expect(countPrivilegeChanges(asUser(E), { userId: 'x' }, undefined)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('listedOnUserList', () => {
  it('lists every user but the seed bootstrap user, as the user list does', () => {
    expect(listedOnUserList(A.id)).toBe(true);
    expect(listedOnUserList(BOOTSTRAP_USER_ID)).toBe(false);
  });
});
