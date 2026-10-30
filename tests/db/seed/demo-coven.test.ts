import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '@/db/bootstrap';
import { seedDemoCoven } from '@/db/seed/demo-coven';
import {
  DEMO_COVEN_CONTENT,
  DEMO_COVEN_EXCEPTIONS,
  formatContentReport,
  seedDemoCovenContent,
  type DemoCovenContent,
} from '@/db/seed/demo-coven-content';
import { seedReferenceData } from '@/db/seed/reference-data';
import { loadCompendium } from '@/db/seed/compendium/load';
import { identityOf } from '@/db/seed/coven-content';
import { beginSeedTransaction } from '@/db/seed/idempotent';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from '../types';

// The demo coven seed against the standard scenario's users: the workspace row, who is seated and how, and what a second run leaves alone.
// `standard` does not seed the coven, so each case starts from none.

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const run = () => seedDemoCoven(drizzle(sql));

const seats = async (): Promise<Record<string, string>> => {
  const rows = await sql<{ user_id: string; role: string }[]>`
    select user_id, role from workspace_members
    where workspace_id = ${DEMO_WORKSPACE_ID} and deleted_at is null
  `;
  return Object.fromEntries(rows.map((row) => [row.user_id, row.role]));
};

const countRows = async () => {
  const [{ rows }] = await sql<{ rows: number }[]>`
    select (select count(*) from workspaces where demo)::int
         + (select count(*) from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID})::int as rows
  `;
  return rows;
};

// The coven's contents reference its row, so they go first; the cascade also empties the tables that hang off them.
beforeEach(async () => {
  await sql`truncate spell_workings, spells, inventory_items, workspace_compendium_entries, ingredients cascade`;
  await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}`;
  await sql`delete from workspaces where id = ${DEMO_WORKSPACE_ID} or slug = 'sorrel-and-salt-demo'`;
});

describe('the demo coven seed', () => {
  it('gives a database without one a single demo row on the slug sorrel-and-salt-demo', async () => {
    expect(await sql`select 1 from workspaces where demo`).toHaveLength(0);

    await run();

    const rows = await sql<Row[]>`select id, name, slug, demo from workspaces where demo`;
    expect(rows).toEqual([
      {
        id: DEMO_WORKSPACE_ID,
        name: 'Sorrel & Salt Demo',
        slug: 'sorrel-and-salt-demo',
        demo: true,
      },
    ]);
  });

  it('seats the system user and every admin as owner and everyone else as viewer', async () => {
    // Preconditions: an admin, a curator and plain users exist to be told apart.
    const roles = await sql<{ id: string; role: string }[]>`
      select id, role from users where deleted_at is null
    `;
    expect(new Set(roles.map(({ role }) => role))).toEqual(new Set(['user', 'curator', 'admin']));

    await run();

    const expected = Object.fromEntries(
      roles.map(({ id, role }) => [
        id,
        id === BOOTSTRAP_USER_ID || role === 'admin' ? 'owner' : 'viewer',
      ]),
    );
    expect(await seats()).toEqual(expected);
    expect(expected[BOOTSTRAP_USER_ID]).toBe('owner');
    expect(expected[FIXTURE_USERS.E.id]).toBe('owner');
    expect(expected[FIXTURE_USERS.F.id]).toBe('viewer');
    const [{ invited }] = await sql<{ invited: number }[]>`
      select count(invited_by)::int as invited from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}
    `;
    expect(invited).toBe(0);
  });

  it('inserts nothing on a second run', async () => {
    await run();
    const before = await countRows();
    expect(before).toBeGreaterThan(1);

    await run();

    expect(await countRows()).toBe(before);
  });

  it('does not seat again a user whose seat is soft-deleted, an admin included', async () => {
    await run();
    await sql`
      update workspace_members set deleted_at = now(), deleted_by = ${FIXTURE_USERS.C.id}
      where workspace_id = ${DEMO_WORKSPACE_ID} and user_id in (${FIXTURE_USERS.C.id}, ${FIXTURE_USERS.E.id})
    `;

    await run();

    const seated = await seats();
    expect(seated[FIXTURE_USERS.C.id]).toBeUndefined();
    expect(seated[FIXTURE_USERS.E.id]).toBeUndefined();
    const rows = await sql`
      select 1 from workspace_members
      where workspace_id = ${DEMO_WORKSPACE_ID} and user_id in (${FIXTURE_USERS.C.id}, ${FIXTURE_USERS.E.id})
    `;
    expect(rows).toHaveLength(2);
  });

  it('seats a user created since the last run, and leaves a deleted user unseated', async () => {
    await run();
    const lateId = '00000000-0000-0000-0000-0000000000a1';
    const goneId = '00000000-0000-0000-0000-0000000000a2';
    await sql`
      insert into users (id, name, email, created_by, updated_by, deleted_at, deleted_by)
      values (${lateId}, 'Late Testwort', 'late@seed.test', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, null, null),
             (${goneId}, 'Gone Testwort', 'gone@seed.test', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, now(), ${BOOTSTRAP_USER_ID})
    `;

    await run();

    const seated = await seats();
    expect(seated[lateId]).toBe('viewer');
    expect(seated[goneId]).toBeUndefined();
  });

  it('refuses, naming the coven, when another coven already holds the slug', async () => {
    await sql`
      insert into workspaces (id, name, slug, created_by, updated_by)
      values (${'00000000-0000-0000-0000-0000000000b1'}, 'Another Coven', 'sorrel-and-salt-demo', ${FIXTURE_USERS.A.id}, ${FIXTURE_USERS.A.id})
    `;

    await expect(run()).rejects.toThrow(/Another Coven/);
    expect(await sql`select 1 from workspaces where demo`).toHaveLength(0);
  });
});

// The contents against the real compendium: the committed files are loaded as the seed loads them and seeded first, since the
// test database holds only the standard fixtures.

const compendium = loadCompendium(fromRoot('compendium'));
const seedReference = () => seedReferenceData(drizzle(sql), { compendium, manifest: null });

const namedCompendium = (content: DemoCovenContent) => {
  const found = new Map<string, { name: string; canonicalName?: string | null }>();
  const add = (ingredient: {
    tier: string;
    entry?: { name: string; canonicalName?: string | null };
  }) => {
    if (ingredient.tier === 'compendium' && ingredient.entry) {
      found.set(identityOf(ingredient.entry), ingredient.entry);
    }
  };
  content.cupboard.forEach(({ entry }) => add({ tier: 'compendium', entry }));
  content.stock.forEach((jar) => add(jar.ingredient));
  content.spells.forEach((spell) =>
    spell.steps.forEach((step) => step.ingredient && add(step.ingredient)),
  );
  return [...found.values()];
};

const fileOf = (entry: { name: string; canonicalName?: string | null }) =>
  compendium.files.find((file) => identityOf(file.entry) === identityOf(entry));

const countContent = async () => {
  const [row] = await sql<{ rows: number }[]>`
    select (select count(*) from workspace_compendium_entries where workspace_id = ${DEMO_WORKSPACE_ID})::int
         + (select count(*) from ingredients where workspace_id = ${DEMO_WORKSPACE_ID})::int
         + (select count(*) from inventory_items where workspace_id = ${DEMO_WORKSPACE_ID})::int
         + (select count(*) from spells where workspace_id = ${DEMO_WORKSPACE_ID})::int
         + (select count(*) from spell_steps where spell_id in (select id from spells where workspace_id = ${DEMO_WORKSPACE_ID}))::int
         + (select count(*) from spell_workings where spell_id in (select id from spells where workspace_id = ${DEMO_WORKSPACE_ID}))::int as rows
  `;
  return row.rows;
};

describe('the demo coven contents', () => {
  it('names only entries the committed compendium holds, approved', () => {
    const named = namedCompendium(DEMO_COVEN_CONTENT);
    expect(named.length).toBeGreaterThanOrEqual(6);
    for (const entry of named) {
      expect(fileOf(entry)?.status, entry.name).toBe('approved');
    }
  });

  it('names a form its entry file lists for every jar', () => {
    for (const jar of DEMO_COVEN_CONTENT.stock) {
      if (jar.ingredient.tier !== 'compendium') continue;
      const forms = fileOf(jar.ingredient.entry)!.entry.variants.map((v) => v.form.toLowerCase());
      expect(forms, jar.ingredient.entry.name).toContain(jar.form.toLowerCase());
    }
  });

  it('writes the cupboard, jars, spells and workings to the demo coven, all by the system user', async () => {
    await seedReference();

    expect(await countContent()).toBeGreaterThan(20);
    const authors = await sql<{ n: number }[]>`
      select count(*)::int as n from spells
      where workspace_id = ${DEMO_WORKSPACE_ID} and created_by <> ${BOOTSTRAP_USER_ID}
    `;
    expect(authors[0].n).toBe(0);
    const stockAuthors = await sql<{ n: number }[]>`
      select count(*)::int as n from inventory_items
      where workspace_id = ${DEMO_WORKSPACE_ID} and created_by <> ${BOOTSTRAP_USER_ID}
    `;
    expect(stockAuthors[0].n).toBe(0);
    const spells = await sql<{ status: string; visibility: string }[]>`
      select status, visibility from spells where workspace_id = ${DEMO_WORKSPACE_ID}
    `;
    expect(spells).toHaveLength(DEMO_COVEN_CONTENT.spells.length);
    expect(new Set(spells.map((spell) => spell.status))).toEqual(new Set(['draft', 'complete']));
    expect(new Set(spells.map((spell) => spell.visibility))).toEqual(
      new Set(['private', 'workspace']),
    );
  });

  it('inserts nothing on a second run and updates nothing a hand edit changed', async () => {
    await seedReference();
    const before = await countContent();
    await sql`update spells set intent = 'Edited by hand.' where id = ${DEMO_COVEN_CONTENT.spells[0].id}`;

    const second = await seedReference();

    expect(await countContent()).toBe(before);
    expect(second.demoCovenContent.skipped).toEqual([]);
    const [row] = await sql<{ intent: string }[]>`
      select intent from spells where id = ${DEMO_COVEN_CONTENT.spells[0].id}
    `;
    expect(row.intent).toBe('Edited by hand.');
  });

  it('reports an entry the compendium lacks and skips what depends on it, without failing', async () => {
    await seedReference();
    await sql`truncate spell_workings, spells, inventory_items, workspace_compendium_entries cascade`;

    const invented = { name: 'Testwort', canonicalName: 'Testwortia absentia' };
    const stubbed: DemoCovenContent = {
      cupboard: [...DEMO_COVEN_CONTENT.cupboard, { entry: invented }],
      ownEntries: DEMO_COVEN_CONTENT.ownEntries,
      stock: DEMO_COVEN_CONTENT.stock,
      spells: [
        DEMO_COVEN_CONTENT.spells[1],
        {
          ...DEMO_COVEN_CONTENT.spells[0],
          steps: [
            { ingredient: { tier: 'compendium', entry: invented }, quantity: '1.000', unit: 'g' },
          ],
        },
      ],
      workings: DEMO_COVEN_CONTENT.workings.filter(
        (w) => w.spellId === DEMO_COVEN_CONTENT.spells[0].id,
      ),
    };

    const report = await beginSeedTransaction(
      drizzle(sql),
      (tx) => seedDemoCovenContent(tx, stubbed),
      {},
    );

    expect(formatContentReport(report).split('\n')).toEqual([
      "SKIPPED Testwortia absentia: not in this environment's compendium",
      `SKIPPED spell "${DEMO_COVEN_CONTENT.spells[0].title}": names Testwortia absentia, which is skipped`,
    ]);
    const spells = await sql<
      { id: string }[]
    >`select id from spells where workspace_id = ${DEMO_WORKSPACE_ID}`;
    expect(spells.map((spell) => spell.id)).toEqual([DEMO_COVEN_CONTENT.spells[1].id]);
    const [{ n: workings }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from spell_workings where spell_id in (select id from spells where workspace_id = ${DEMO_WORKSPACE_ID})`;
    expect(workings).toBe(0);
  });

  it('does nothing when the environment has no demo coven', async () => {
    const report = await beginSeedTransaction(drizzle(sql), (tx) => seedDemoCovenContent(tx), {});
    expect(report.skipped).toEqual([]);
    expect(await countContent()).toBe(0);
  });

  it('gives every spell ingredient a correspondence matching an assigned category, bar at most two named exceptions', () => {
    expect(DEMO_COVEN_EXCEPTIONS.length).toBeLessThanOrEqual(2);
    for (const exception of DEMO_COVEN_EXCEPTIONS) {
      expect(exception.reason.length).toBeGreaterThan(0);
    }
    const mismatches: string[] = [];
    for (const spell of DEMO_COVEN_CONTENT.spells) {
      for (const step of spell.steps) {
        if (step.ingredient?.tier !== 'compendium') continue;
        const file = fileOf(step.ingredient.entry)!;
        const matches = (file.entry.categories ?? []).some((name) =>
          spell.categories.includes(name),
        );
        const formal = identityOf(step.ingredient.entry);
        const excepted = DEMO_COVEN_EXCEPTIONS.some(
          (e) => e.spellId === spell.id && e.ingredient.toLowerCase() === formal,
        );
        if (!matches) mismatches.push(`${spell.title}: ${formal}${excepted ? ' (excepted)' : ''}`);
        // An exception that matches is stale.
        if (matches) expect(excepted, `${spell.title}: ${formal}`).toBe(false);
      }
    }
    expect(mismatches.filter((line) => !line.endsWith('(excepted)'))).toEqual([]);
    expect(mismatches).toHaveLength(DEMO_COVEN_EXCEPTIONS.length);
  });
});
