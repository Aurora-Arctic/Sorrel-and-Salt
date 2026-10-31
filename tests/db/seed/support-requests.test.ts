import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { beginSeedTransaction } from '@/db/seed/idempotent';
import { seedSupportRequests } from '@/db/seed/support-requests';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The fake support requests the `demo` scenario seeds for the admin Support tab and the account's own requests, run against the `standard` cast.

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const run = () => beginSeedTransaction(drizzle(sql), seedSupportRequests);

const counts = async () => {
  const [row] = await sql<{ requests: number; replies: number; timeouts: number }[]>`
    select (select count(*) from support_requests)::int as requests,
           (select count(*) from support_replies)::int as replies,
           (select count(*) from support_timeouts)::int as timeouts
  `;
  return row;
};

describe('the support request seed', () => {
  it('starts from a database with no support rows, as the production-bound scenarios leave it', async () => {
    expect(await counts()).toEqual({ requests: 0, replies: 0, timeouts: 0 });
  });

  describe('once run', () => {
    beforeAll(run);

    it('seeds eight to twelve requests from at least four senders, all seven subjects', async () => {
      const [row] = await sql<{ n: number; senders: number; kinds: number }[]>`
        select count(*)::int as n, count(distinct created_by)::int as senders,
               count(distinct about)::int as kinds from support_requests
      `;
      expect(row.n).toBeGreaterThanOrEqual(8);
      expect(row.n).toBeLessThanOrEqual(12);
      expect(row.senders).toBeGreaterThanOrEqual(4);
      expect(row.kinds).toBe(7);
    });

    it('covers open and unassigned, assigned, shared, linked to an issue and resolved', async () => {
      const [row] = await sql<Record<string, number>[]>`
        select count(*) filter (where status = 'open' and assigned_to is null)::int as unassigned,
               count(*) filter (where assigned_to = ${FIXTURE_USERS.E.id})::int as to_admin,
               count(*) filter (where assigned_to = ${FIXTURE_USERS.F.id})::int as to_curator,
               count(*) filter (where curator_visible)::int as shared,
               count(*) filter (where curator_visible and assigned_to is null)::int as shared_unassigned,
               count(*) filter (where issue_url is not null)::int as with_issue,
               count(*) filter (where status = 'resolved')::int as resolved,
               count(*) filter (where status = 'open')::int as open,
               count(*) filter (where error_code is not null)::int as with_error
        from support_requests
      `;
      for (const [name, n] of Object.entries(row)) expect(n, name).toBeGreaterThan(0);
    });

    it('records who resolved a resolved request and when, and nothing on an open one', async () => {
      const rows = await sql<{ status: string; ok: boolean }[]>`
        select status, case when status = 'resolved'
               then resolved_by is not null and resolved_at is not null and resolved_at >= created_at
               else resolved_by is null and resolved_at is null end as ok
        from support_requests
      `;
      expect(rows.every((r) => r.ok)).toBe(true);
    });

    it('gives every reply a seeded request and a staff author, with one request replied to twice', async () => {
      const orphans = await sql`
        select r.id from support_replies r
        left join support_requests q on q.id = r.request_id
        left join users u on u.id = r.created_by
        where q.id is null or u.role not in ('admin', 'curator')
      `;
      expect(orphans).toHaveLength(0);
      const [row] = await sql<{ replied: number; most: number }[]>`
        select count(*)::int as replied, max(n)::int as most
        from (select count(*) as n from support_replies group by request_id) t
      `;
      expect(row.replied).toBeGreaterThan(2);
      expect(row.most).toBeGreaterThanOrEqual(2);
      const [unreplied] = await sql<{ n: number }[]>`
        select count(*)::int as n from support_requests q
        where not exists (select 1 from support_replies r where r.request_id = q.id)
      `;
      expect(unreplied.n).toBeGreaterThan(0);
    });

    it('lets a curator reply only to a request assigned to them', async () => {
      const bad = await sql`
        select r.id from support_replies r
        join users u on u.id = r.created_by and u.role = 'curator'
        join support_requests q on q.id = r.request_id
        where q.assigned_to is distinct from r.created_by
      `;
      expect(bad).toHaveLength(0);
    });

    it('puts a reply after its request', async () => {
      const bad = await sql`
        select r.id from support_replies r join support_requests q on q.id = r.request_id
        where r.created_at <= q.created_at
      `;
      expect(bad).toHaveLength(0);
    });

    it('seeds one sender with an active time-out and one whose time-out has expired', async () => {
      const rows = await sql<{ user_id: string; active: boolean; expired: boolean }[]>`
        select user_id, (until > now() and lifted_at is null) as active,
               (until <= now() and lifted_at is null) as expired
        from support_timeouts
      `;
      const active = rows.filter((r) => r.active);
      const expired = rows.filter((r) => r.expired);
      expect(active).toHaveLength(1);
      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(active[0].user_id).not.toBe(expired[0].user_id);
    });

    it('sets every time-out by an admin on a sender who has sent a request', async () => {
      const bad = await sql`
        select t.id from support_timeouts t
        join users a on a.id = t.created_by
        where a.role <> 'admin'
           or not exists (select 1 from support_requests q where q.created_by = t.user_id)
      `;
      expect(bad).toHaveLength(0);
    });

    it('spreads the request times over days', async () => {
      const [row] = await sql<{ distinct: number; n: number }[]>`
        select count(distinct date_trunc('hour', created_at))::int as distinct, count(*)::int as n
        from support_requests
      `;
      expect(row.distinct).toBe(row.n);
    });

    it('adds nothing on a second run', async () => {
      const before = await counts();
      const times = await sql`select id, created_at from support_requests order by id`;
      await run();
      expect(await counts()).toEqual(before);
      expect(await sql`select id, created_at from support_requests order by id`).toEqual(times);
    });
  });
});

describe('where the support seed runs', () => {
  const source = (file: string) => readFileSync(fromRoot('src/db/seed', file), 'utf8');

  it('is called by the demo scenario and by no other scenario nor reference seed', () => {
    expect(source('demo.ts')).toContain('seedSupportRequests');
    for (const file of ['minimal.ts', 'standard.ts', 'reference-data.ts', 'index.ts']) {
      expect(source(file), file).not.toContain('support-requests');
    }
    expect(readFileSync(fromRoot('scripts/db-seed.ts'), 'utf8')).not.toContain('support-requests');
  });
});
