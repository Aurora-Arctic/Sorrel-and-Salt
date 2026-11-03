import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { beginSeedTransaction } from '@/db/seed/idempotent';
import { SANCTIONED_USERS, seedSanctionedUsers } from '@/db/seed/sanctioned-users';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The two held-back accounts the `demo` scenario seeds, run against the `standard` cast: H with a site access pause that has
// no end, I a sender the support seed times out.

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const { H, I } = SANCTIONED_USERS;
const run = () => beginSeedTransaction(drizzle(sql), seedSanctionedUsers);

const counts = async () => {
  const [row] = await sql<{ users: number; pauses: number }[]>`
    select (select count(*) from users)::int as users,
           (select count(*) from user_access_pauses)::int as pauses
  `;
  return row;
};

describe('the held-back accounts seed', () => {
  it('starts from a database with neither account and no pause', async () => {
    const present = await sql`select id from users where id in (${H.id}, ${I.id})`;
    expect(present).toHaveLength(0);
    expect((await counts()).pauses).toBe(0);
  });

  describe('once run', () => {
    beforeAll(run);

    it('seeds H and I as verified plain users who have agreed to the terms and may create no coven, and not as any fixture', async () => {
      const rows = await sql<
        { id: string; verified: boolean; role: string; creates: boolean; terms: boolean }[]
      >`
        select id, email_verified as verified, role, can_create_workspace as creates,
               terms_accepted_at is not null as terms
        from users where id in (${H.id}, ${I.id}) order by id
      `;
      expect(rows).toEqual([
        { id: H.id, verified: true, role: 'user', creates: false, terms: true },
        { id: I.id, verified: true, role: 'user', creates: false, terms: true },
      ]);
      const fixtureIds = Object.values(FIXTURE_USERS).map((user) => user.id);
      expect(fixtureIds).not.toContain(H.id);
      expect(fixtureIds).not.toContain(I.id);
    });

    it('gives H one standing pause with no end and a note, set by a keeper, and I none', async () => {
      const pauses = await sql<
        { user_id: string; until: Date | null; lifted: boolean; note: string; by_admin: boolean }[]
      >`
        select p.user_id, p.until, p.lifted_at is not null as lifted, p.note, a.role = 'admin' as by_admin
        from user_access_pauses p join users a on a.id = p.created_by
      `;
      expect(pauses).toHaveLength(1);
      expect(pauses[0]).toMatchObject({
        user_id: H.id,
        until: null,
        lifted: false,
        by_admin: true,
      });
      expect(pauses[0].note.trim()).not.toBe('');
    });

    it('adds nothing on a second run', async () => {
      const before = await counts();
      const pauses = await sql`select id, created_at from user_access_pauses order by id`;
      await run();
      expect(await counts()).toEqual(before);
      expect(await sql`select id, created_at from user_access_pauses order by id`).toEqual(pauses);
    });
  });
});

describe('where the held-back accounts seed runs', () => {
  const source = (file: string) => readFileSync(fromRoot('src/db/seed', file), 'utf8');

  it('is called by the demo scenario, before the support seed, and by no other scenario nor reference seed', () => {
    const demo = source('demo.ts');
    expect(demo.indexOf('await seedSanctionedUsers(')).toBeGreaterThan(-1);
    expect(demo.indexOf('await seedSanctionedUsers(')).toBeLessThan(
      demo.indexOf('await seedSupportRequests('),
    );
    for (const file of ['minimal.ts', 'standard.ts', 'reference-data.ts', 'index.ts']) {
      expect(source(file), file).not.toContain('sanctioned-users');
    }
    expect(readFileSync(fromRoot('scripts/db-seed.ts'), 'utf8')).not.toContain('sanctioned-users');
  });
});
