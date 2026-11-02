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

    it('seeds eight to twenty requests from at least four senders, all seven subjects', async () => {
      const [row] = await sql<{ n: number; senders: number; kinds: number }[]>`
        select count(*)::int as n, count(distinct created_by)::int as senders,
               count(distinct about)::int as kinds from support_requests
      `;
      expect(row.n).toBeGreaterThanOrEqual(8);
      expect(row.n).toBeLessThanOrEqual(20);
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

    it('records who resolved a resolved request and when, and nothing on an open or waiting one', async () => {
      const rows = await sql<{ status: string; ok: boolean }[]>`
        select status, case when status = 'resolved'
               then resolved_by is not null and resolved_at is not null and resolved_at >= created_at
               when status in ('open', 'waiting_on_sender')
               then resolved_by is null and resolved_at is null
               else true end as ok
        from support_requests
      `;
      expect(rows.every((r) => r.ok)).toBe(true);
    });

    it('seeds waiting requests whose latest public reply is staff and sets the lifecycle times', async () => {
      const waiting = await sql<
        { id: string; sender: string; staff_last: boolean; stamped: boolean }[]
      >`
        select q.id, q.created_by as sender,
               (select r.author_role = 'staff' from support_replies r
                 where r.request_id = q.id and r.visibility = 'public'
                 order by r.created_at desc limit 1) as staff_last,
               q.last_staff_activity_at is not null and q.last_sender_activity_at is not null as stamped
        from support_requests q where q.status = 'waiting_on_sender'
      `;
      expect(waiting.length).toBeGreaterThanOrEqual(2);
      expect(new Set(waiting.map((w) => w.sender)).size).toBe(waiting.length);
      expect(waiting.every((w) => w.staff_last && w.stamped)).toBe(true);
    });

    it('seeds closed requests with a close time after the resolution, one idle seven days and one followed up', async () => {
      const closed = await sql<{ id: string; ok: boolean; idle: boolean; followed: boolean }[]>`
        select q.id,
               q.closed_at is not null and q.resolved_at is not null and q.closed_at > q.resolved_at as ok,
               q.closed_at - q.resolved_at >= interval '7 days' as idle,
               exists (select 1 from support_requests n where n.linked_from = q.id) as followed
        from support_requests q where q.status = 'closed'
      `;
      expect(closed.length).toBeGreaterThanOrEqual(2);
      expect(closed.every((c) => c.ok)).toBe(true);
      expect(closed.some((c) => c.idle)).toBe(true);
      expect(closed.some((c) => c.followed)).toBe(true);
    });

    it('links a follow-up to a closed request of the same sender, as the service does', async () => {
      const links = await sql<{ ok: boolean }[]>`
        select n.created_by = c.created_by and c.status = 'closed' and n.status = 'open'
               and n.about = c.about and n.created_at > c.closed_at as ok
        from support_requests n join support_requests c on c.id = n.linked_from
      `;
      expect(links.length).toBeGreaterThan(0);
      expect(links.every((l) => l.ok)).toBe(true);
    });

    it('has waiting and closed requests from card sign-ups (Fixtures A to D) and from staff accounts holding no card (E, F)', async () => {
      const staff = [FIXTURE_USERS.E.id, FIXTURE_USERS.F.id];
      for (const status of ['waiting_on_sender', 'closed']) {
        const senders = (
          await sql<
            { created_by: string }[]
          >`select created_by from support_requests where status = ${status}`
        ).map((r) => r.created_by);
        expect(
          senders.some((id) => staff.includes(id)),
          status,
        ).toBe(true);
        expect(
          senders.some((id) => !staff.includes(id)),
          status,
        ).toBe(true);
      }
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
