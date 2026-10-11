import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { run } from '../../../support/graphql/run';
import type { PrivilegeChangesResult } from './types';

// MB.199's `privilegeChanges`, the transport's half
// (claude-docs/testing/layer-ownership.md): an admin's page with every field,
// the filters reaching the service, subject and actor in one read per page,
// and the `admin` scope's refusal. The order, the
// page boundary and who the service refuses are
// services/privilege-changes.test.ts's; a signed-out caller is
// tests/db/graphql-query-scopes.test.ts's.

// The query count, observed at the repository: the user read is wrapped so
// the test counts calls without changing what they answer.
const repository = vi.hoisted(() => ({ findManyByIds: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findManyByIds.mockClear();
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Ten rows over four subjects and three actors, the bootstrap user among the
// actors as a seeded row's is, so one page names seven users.
const SUBJECTS = [A, B, C, D];
const ACTORS = [E.id, BOOTSTRAP_USER_ID, A.id];

beforeAll(async () => {
  await sql`truncate user_privilege_changes`;
  for (let index = 0; index < 10; index += 1) {
    const at = `2026-02-${String(index + 1).padStart(2, '0')} 09:00:00+00`;
    const actor = ACTORS[index % ACTORS.length];
    await sql`
      insert into user_privilege_changes
        (user_id, privilege, change, via, note, created_at, created_by, updated_at, updated_by)
      values (${SUBJECTS[index % SUBJECTS.length].id},
              ${index === 9 ? 'admin' : 'create_workspace'}, 'grant', 'admin',
              ${index === 9 ? 'Covering the spring audit' : null},
              ${at}, ${actor}, ${at}, ${actor})
    `;
  }
});

const PAGE_OF_CHANGES = `
  query ($userId: ID, $privilege: UserPrivilege, $query: String) {
    privilegeChanges(userId: $userId, privilege: $privilege, query: $query) {
      edges {
        node {
          id privilege change via note
          subject { id name }
          actor { id name }
          audit { createdAt }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

describe('Query.privilegeChanges', () => {
  it('answers an admin the ledger, newest first, with every field', async () => {
    const result = await run<PrivilegeChangesResult>(asUser(E), PAGE_OF_CHANGES);

    expect(result.errors).toBeUndefined();
    const { edges } = result.data?.privilegeChanges ?? { edges: [] };
    expect(edges).toHaveLength(10);
    expect(edges[0].node).toEqual({
      id: expect.any(String),
      privilege: 'admin',
      change: 'grant',
      via: 'admin',
      note: 'Covering the spring audit',
      subject: { id: B.id, name: B.name },
      actor: { id: E.id, name: E.name },
      audit: { createdAt: '2026-02-10T09:00:00.000Z' },
    });
    expect(edges[1].node).toMatchObject({ note: null, subject: { id: A.id } });
  });

  it('reads subject and actor for the whole page in one query', async () => {
    const result = await run<PrivilegeChangesResult>(asUser(E), PAGE_OF_CHANGES);

    const named = new Set(
      result.data?.privilegeChanges.edges.flatMap(({ node }) => [node.subject?.id, node.actor?.id]),
    );
    expect(named.size).toBe(SUBJECTS.length + ACTORS.length - 1);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
  });

  it('passes the query to the service', async () => {
    const result = await run<PrivilegeChangesResult>(asUser(E), PAGE_OF_CHANGES, {
      query: C.email,
    });

    const nodes = result.data?.privilegeChanges.edges.map((edge) => edge.node) ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((node) => node.subject?.id === C.id)).toBe(true);
  });

  it('passes both filters to the service', async () => {
    const result = await run<PrivilegeChangesResult>(asUser(E), PAGE_OF_CHANGES, {
      userId: B.id,
      privilege: 'create_workspace',
    });

    const nodes = result.data?.privilegeChanges.edges.map((edge) => edge.node) ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((node) => node.subject?.id === B.id)).toBe(true);
    expect(nodes.every((node) => node.privilege === 'create_workspace')).toBe(true);
  });

  it('answers a subject that is not an id as VALIDATION', async () => {
    const result = await run(asUser(E), PAGE_OF_CHANGES, { userId: 'not-an-id' });

    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION');
  });

  // One non-admin: the scope reads the site role alone. The same query
  // answers an admin these rows, the caller's own among them.
  it('refuses a non-admin as FORBIDDEN', async () => {
    expect(asUser(A).role).toBe('user');
    const asAdmin = await run<PrivilegeChangesResult>(asUser(E), PAGE_OF_CHANGES, {
      userId: A.id,
    });
    expect(asAdmin.data?.privilegeChanges.edges.length).toBeGreaterThan(0);

    const result = await run(asUser(A), PAGE_OF_CHANGES, { userId: A.id });

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: ['privilegeChanges'],
      extensions: { code: 'FORBIDDEN' },
    });
    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
  });
});
