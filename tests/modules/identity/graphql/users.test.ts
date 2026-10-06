import { getNamedType, graphql, isObjectType, type GraphQLObjectType } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { noSender } from '../../../support/email-verification';
import type { UsersQueryResult } from './types';

// MB.52's `users` query, the admin user list's GraphQL half: the same service
// the page calls, its nodes the ordinary `User`, so `email` resolves through
// the scope it already carries rather than a second path around it
// (claude-docs/auth/admin-users.md, "The user list").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Thirty invented accounts past the cast, so the default page of 25 is a
// page and not the whole table.
const EXTRA = 30;

beforeAll(async () => {
  for (let index = 0; index < EXTRA; index += 1) {
    const id = `00000000-0000-0000-0000-0000000001${String(index).padStart(2, '0')}`;
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${id}, ${`Listed Fixture ${String(index).padStart(2, '0')}`},
              ${`listed-${index}@users.test`}, ${id}, ${id})
    `;
  }
  await sql`
    insert into accounts (account_id, provider_id, user_id, updated_at)
    values ('a-google', 'google', ${A.id}, now())
  `;
});

async function usersAs(session: Session | null, source: string, variables = {}) {
  return graphql({
    schema,
    source,
    variableValues: variables,
    contextValue: { session, loaders: createLoaders(session), emailVerification: noSender },
  });
}

const PAGE_OF_USERS = `
  query ($query: String, $awaitingApproval: Boolean, $after: String) {
    users(query: $query, awaitingApproval: $awaitingApproval, after: $after) {
      edges {
        cursor
        node { id name email role canCreateWorkspace emailVerified providers audit { createdAt } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

describe('Query.users', () => {
  it('answers an admin the default page of 25, with every listed field', async () => {
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from users where deleted_at is null
    `;
    expect(count).toBeGreaterThan(25);

    const result = await usersAs(asUser(E), PAGE_OF_USERS);

    expect(result.errors).toBeUndefined();
    const { users } = result.data as unknown as UsersQueryResult;
    expect(users.edges).toHaveLength(25);
    expect(users.pageInfo.hasNextPage).toBe(true);
    expect(users.edges.find((edge) => edge.node.id === A.id)?.node).toEqual({
      id: A.id,
      name: A.name,
      email: A.email,
      role: 'user',
      canCreateWorkspace: true,
      emailVerified: expect.any(Boolean),
      providers: ['google'],
      audit: { createdAt: expect.any(String) },
    });
  });

  it('resumes from the cursor it handed out, to the end of the list', async () => {
    const first = (await usersAs(asUser(E), PAGE_OF_USERS)).data as unknown as UsersQueryResult;
    const rest = (
      await usersAs(asUser(E), PAGE_OF_USERS, { after: first.users.pageInfo.endCursor })
    ).data as unknown as UsersQueryResult;

    const seen = [...first.users.edges, ...rest.users.edges].map((edge) => edge.node.id);
    expect(new Set(seen).size).toBe(seen.length);
    expect(rest.users.pageInfo.hasNextPage).toBe(false);
  });

  it('passes the filters to the service', async () => {
    const result = await usersAs(asUser(E), PAGE_OF_USERS, {
      query: 'listed fixture 0',
      awaitingApproval: true,
    });

    const { users } = result.data as unknown as UsersQueryResult;
    expect(users.edges.map((edge) => edge.node.name)).toEqual(
      Array.from({ length: 10 }, (_, index) => `Listed Fixture 0${index}`),
    );
  });

  // Why it could have succeeded: the same query answers E, and A is signed in.
  it('refuses a signed-in user who is not an admin, and a signed-out one', async () => {
    expect((await usersAs(asUser(E), PAGE_OF_USERS)).errors).toBeUndefined();

    for (const session of [asUser(A), null]) {
      const result = await usersAs(session, PAGE_OF_USERS);

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.path).toEqual(['users']);
      expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
    }
  });

  // One `User`, so `email`'s scope is the one `me` already passes through.
  it('lists the ordinary User type, whose email carries its scope', () => {
    const typeOf = (type: GraphQLObjectType, field: string): GraphQLObjectType => {
      const named = getNamedType(type.getFields()[field]?.type);
      if (!isObjectType(named)) throw new Error(`${type.name}.${field} is not an object`);
      return named;
    };
    const query = schema.getQueryType();
    if (!query) throw new Error('no Query type');

    const node = typeOf(typeOf(typeOf(query, 'users'), 'edges'), 'node');

    expect(node).toBe(schema.getType('User'));
    expect(typeOf(query, 'me')).toBe(node);
  });
});

describe('User.providers and User.emailVerified', () => {
  const ME = '{ me { id emailVerified providers } }';

  it("refuses the providers on a user's own row, whose account page reads them instead", async () => {
    const result = await usersAs(asUser(A), ME);

    expect(result.errors?.[0]?.path).toEqual(['me', 'providers']);
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(Forbidden);
  });

  it('answers emailVerified on the user’s own row', async () => {
    const result = await usersAs(asUser(A), '{ me { id emailVerified } }');

    expect(result.errors).toBeUndefined();
    expect(result.data?.me).toEqual({ id: A.id, emailVerified: expect.any(Boolean) });
  });
});
