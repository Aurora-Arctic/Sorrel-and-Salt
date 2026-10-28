import { beforeAll, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { findGrimoirePage } from '@/db/repository';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { B, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import type { PageRequest } from '@/lib/types';
import type { Logged } from '../../support/db/types';

// The plan the grimoire search runs (M10.11), read off the connection's log
// and explained, as compendium-search-query.test.ts does for the compendium:
// each arm of the search starts from the spells' expression index over title
// and intent, rather than reading every spell in the coven
// (claude-docs/db/grimoire.md, "The grimoire search").

const logged = vi.hoisted(() => [] as Logged[]);

vi.mock('@/db/connection', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  return {
    db: drizzle(connect(process.env.DATABASE_URL as string), {
      logger: { logQuery: (query, params) => logged.push({ query, params }) },
    }),
  };
});

const UNACCENT_INDEX = 'spells_unaccent_trgm';
const AUTHOR = FIXTURE_USERS.A.id;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** The page read the finder sends — the statement and its parameters, as logged. */
async function statementFor(request: () => Promise<unknown>): Promise<Logged> {
  logged.length = 0;
  await request();
  const read = logged.find(({ query }) => /from "spells"/.test(query));
  if (!read) throw new Error('the finder sent no read of spells');
  return read;
}

/**
 * `explain` of a logged statement, in a transaction holding the search's
 * threshold with sequential scans disabled, so the question is whether the
 * index can be reached at all rather than what the planner prefers.
 */
async function explain({ query, params }: Logged): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('pg_trgm.word_similarity_threshold', '0.5', true)`;
    await tx`set local enable_seqscan = off`;
    const rows = await tx.unsafe(`explain ${query}`, params as never[]);
    return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
  });
}

describe('the grimoire search plan over ~20,000 spells', () => {
  const FIRST: PageRequest = { limit: 24, inverted: false };
  let page: Logged;

  // Seeded once per file (MB.184): twenty thousand spells in W that share no
  // word with `hearth`, and six hundred that do, by title or by intent.
  beforeAll(async () => {
    await sql`
      insert into spells (workspace_id, title, intent, status, visibility, created_by, updated_by)
      select ${WORKSPACE_W_ID}, 'Decoy ' || md5(g::text), 'Intent ' || md5((-g)::text),
             'complete', 'workspace', ${AUTHOR}, ${AUTHOR}
      from generate_series(1, 20000) g`;
    await sql`
      insert into spells (workspace_id, title, intent, status, visibility, created_by, updated_by)
      select ${WORKSPACE_W_ID},
             case g % 2 when 0 then 'Hearth Ward ' || g else 'Fixture ' || md5(g::text) end,
             case g % 2 when 0 then null else 'To keep the hearth lit' end,
             'complete', 'workspace', ${AUTHOR}, ${AUTHOR}
      from generate_series(1, 600) g`;
    await sql`analyze spells`;

    const membership = await assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] });
    page = await statementFor(() =>
      findGrimoirePage(membership, FIRST, {
        order: 'UPDATED_DESC',
        status: 'complete',
        query: 'hearth',
      }),
    );
  }, 120_000);

  it('starts each arm of the search from the spells expression index', async () => {
    const plan = await explain(page);

    expect(plan).toContain(`Index Scan on ${UNACCENT_INDEX}`);
    expect(plan).not.toContain('Seq Scan');
  });
});
