import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { users } from '@/db/schema/users';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { workspaceInvitations } from '@/db/schema/workspace-invitations';
import { workspaces } from '@/db/schema/workspaces';

// The full six: an invitation is a record of an owner's act, not a link, so
// withdrawing one leaves a tombstone and the hash index below is partial.
const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = [
  'id',
  'workspace_id',
  'email',
  'role',
  'token_hash',
  'expires_at',
  'accepted_at',
  'accepted_by',
  'revoked_at',
];

const TOKEN_HASH_INDEX = 'workspace_invitations_token_hash_unique';
const ROLE_CHECK = 'workspace_invitations_role_invitable';
const WORKSPACE_FK = 'workspace_invitations_workspace_id_workspaces_id_fk';
const ACCEPTED_BY_FK = 'workspace_invitations_accepted_by_users_id_fk';

describe('workspace_invitations schema', () => {
  const { columns, indexes, foreignKeys, checks } = getTableConfig(workspaceInvitations);
  const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
  const indexByName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // As a property of the table: a later `token`/`plaintext_token` column
  // reddens this. A leaked row cannot be redeemed (story 4).
  it('holds the token only as a hash', () => {
    const tokenish = Object.keys(byName).filter((name) => name.includes('token'));

    expect(tokenish).toEqual(['token_hash']);
  });

  it('requires a workspace, an email, a role, a hash and an expiry', () => {
    for (const column of ['workspace_id', 'email', 'role', 'token_hash', 'expires_at']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // Null on a pending invitation: the state that tells expired from revoked from used.
  it('leaves acceptance and revocation nullable', () => {
    for (const column of ['accepted_at', 'accepted_by', 'revoked_at']) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('points at the workspace being joined and the user who accepted', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.accepted_by.foreignTable).toBe(users);
    expect(foreignKeyByColumn.accepted_by.foreignColumnName).toBe('id');
  });

  it('spreads the six audit columns, the four stamps required', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    for (const column of ['created_at', 'created_by', 'updated_at', 'updated_by']) {
      expect(byName[column].notNull).toBe(true);
    }
    expect(byName.deleted_at.notNull).toBe(false);
    expect(byName.deleted_by.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
  });

  it('gives the expiry a default, so no caller can forget one', () => {
    expect(byName.expires_at.hasDefault).toBe(true);
  });

  it('declares the role check DESIGN.md §5 requires', () => {
    expect(checks.map((constraint) => constraint.name)).toEqual([ROLE_CHECK]);
  });

  it('declares exactly one index, on the token hash', () => {
    expect(Object.keys(indexByName)).toEqual([TOKEN_HASH_INDEX]);
    expect(indexByName[TOKEN_HASH_INDEX].config.unique).toBe(true);
    expect(indexByName[TOKEN_HASH_INDEX].config.where).toBeDefined();
  });
});

// A owns W; B is the one who accepts.
const OWNER = FIXTURE_USERS.A.id;
const INVITEE = FIXTURE_USERS.B.id;
const COVEN = WORKSPACE_W_ID;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;

// 64 hex characters, the shape of a sha-256 of a `crypto.randomBytes` token;
// nothing here generates one.
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

async function invite(
  role: string,
  { tokenHash = HASH_A, email = 'rowan@example.com' } = {},
): Promise<string> {
  const [inserted] = await sql`
    insert into workspace_invitations (workspace_id, email, role, token_hash, created_by, updated_by)
    values (${COVEN}, ${email}, ${role}::workspace_role, ${tokenHash}, ${OWNER}, ${OWNER})
    returning id
  `;
  return inserted.id as string;
}

async function failureOf(work: Promise<unknown>) {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}

async function columnNames(table: string): Promise<string[]> {
  const rows = await sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by column_name
  `;
  return rows.map((row) => row.column_name as string);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

beforeEach(async () => {
  await sql`truncate workspace_invitations`;
});

afterAll(async () => {
  await sql.end();
});

describe('workspace_invitations table', () => {
  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await columnNames('workspace_invitations')).toEqual(
      [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
    );
  });

  // Against the shipped DDL rather than the Drizzle object: a dumped row is not a credential.
  it('has no column that could hold a plaintext token', async () => {
    const stored = await columnNames('workspace_invitations');

    expect(stored.filter((name) => name.includes('token'))).toEqual(['token_hash']);
  });

  describe('owner is not invitable', () => {
    it('rejects an invitation with role owner', async () => {
      const error = await failureOf(invite('owner'));

      // 23514 is check_violation, named: this constraint refused, not something earlier.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(ROLE_CHECK);
    });

    // Why the rejection above could have succeeded: the row is well-formed and
    // the enum admits `owner`. Drop the CHECK and these stay green while the
    // one above reddens.
    it('accepts viewer', async () => {
      await expect(invite('viewer')).resolves.toBeDefined();
    });

    it('accepts member', async () => {
      await expect(invite('member')).resolves.toBeDefined();
    });

    it('rejects a role no workspace role names at all', async () => {
      const error = await failureOf(invite('admin'));

      // 22P02 is invalid_text_representation: the enum refusing the cast before the CHECK.
      expect(error.code).toBe('22P02');
    });
  });

  describe('expiry', () => {
    it('defaults to seven days out when the caller names none', async () => {
      const id = await invite('member');

      const [row] = await sql`
        select expires_at, extract(epoch from (expires_at - now())) as remaining
        from workspace_invitations where id = ${id}
      `;

      expect(row.expires_at).toBeInstanceOf(Date);
      // Seconds rather than a parsed interval, which the driver renders as its
      // own shape; a second of slack covers the gap between the two `now()`s.
      expect(Number(row.remaining)).toBeCloseTo(7 * 24 * 60 * 60, -1);
    });

    it('is not nullable, so no row outlives every clock', async () => {
      const id = await invite('member');

      const error = await failureOf(sql`
        update workspace_invitations set expires_at = null where id = ${id}
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('expires_at');
    });

    it('lets a caller set an expiry of its own', async () => {
      const [inserted] = await sql`
        insert into workspace_invitations
          (workspace_id, email, role, token_hash, expires_at, created_by, updated_by)
        values (${COVEN}, 'rowan@example.com', 'member', ${HASH_A},
                now() + interval '1 hour', ${OWNER}, ${OWNER})
        returning extract(epoch from (expires_at - now())) as remaining
      `;

      expect(Number(inserted.remaining)).toBeCloseTo(60 * 60, -1);
    });
  });

  describe('lookup by token hash', () => {
    it('indexes the hash uniquely, among live rows only', async () => {
      const [index] = await sql`
        select i.indisunique as unique,
               pg_get_expr(i.indpred, i.indrelid) as predicate,
               pg_get_indexdef(i.indexrelid) as definition
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'workspace_invitations'::regclass and c.relname = ${TOKEN_HASH_INDEX}
      `;

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (token_hash)');
    });

    it('refuses two live invitations sharing one hash', async () => {
      await invite('member');

      const error = await failureOf(invite('viewer', { email: 'ash@example.com' }));

      // 23505: one hash must resolve to one invitation, or redeeming is a coin toss.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(TOKEN_HASH_INDEX);
    });

    it('lets two invitations differ by hash alone', async () => {
      await invite('member');

      await expect(invite('member', { tokenHash: HASH_B })).resolves.toBeDefined();
    });

    // Rule 4 end to end; weaker here than on a slug, but the rule is absolute
    // and the predicate costs nothing.
    it('stops a soft-deleted row from reserving its hash', async () => {
      const id = await invite('member');
      await sql`
        update workspace_invitations set deleted_at = now(), deleted_by = ${OWNER} where id = ${id}
      `;

      const readded = await invite('member');

      expect(readded).not.toBe(id);
    });
  });

  describe('an invitation belongs to a real workspace and a real accepter', () => {
    it('refuses a workspace id no workspace holds', async () => {
      const error = await failureOf(sql`
        insert into workspace_invitations
          (workspace_id, email, role, token_hash, created_by, updated_by)
        values (${ABSENT}, 'rowan@example.com', 'member', ${HASH_A}, ${OWNER}, ${OWNER})
      `);

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(WORKSPACE_FK);
    });

    it('refuses an accepter no user holds', async () => {
      const id = await invite('member');

      const error = await failureOf(sql`
        update workspace_invitations
        set accepted_at = now(), accepted_by = ${ABSENT}
        where id = ${id}
      `);

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(ACCEPTED_BY_FK);
    });

    it('records who accepted, and when', async () => {
      const id = await invite('member');

      await sql`
        update workspace_invitations
        set accepted_at = now(), accepted_by = ${INVITEE}
        where id = ${id}
      `;

      const [row] = await sql`
        select accepted_by, accepted_at, revoked_at from workspace_invitations where id = ${id}
      `;
      expect(row.accepted_by).toBe(INVITEE);
      expect(row.accepted_at).toBeInstanceOf(Date);
      // Revocation and acceptance are separate states, so one reason can be reported.
      expect(row.revoked_at).toBeNull();
    });
  });

  it('refuses an invitation carrying no email', async () => {
    const error = await failureOf(sql`
      insert into workspace_invitations
        (workspace_id, role, token_hash, created_by, updated_by)
      values (${COVEN}, 'member', ${HASH_A}, ${OWNER}, ${OWNER})
    `);

    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('email');
  });

  it('refuses an invitation carrying no token hash', async () => {
    const error = await failureOf(sql`
      insert into workspace_invitations
        (workspace_id, email, role, created_by, updated_by)
      values (${COVEN}, 'rowan@example.com', 'member', ${OWNER}, ${OWNER})
    `);

    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('token_hash');
  });
});
