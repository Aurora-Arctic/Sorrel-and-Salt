import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { deitySlug, slugify } from '@/lib/slugify';
import {
  createDeityTradition,
  deleteDeityTradition,
  getDeityTraditionBySlug,
  updateDeityTradition,
} from '@/modules/vocabulary';
import type { DeityTraditionInput } from '@/modules/vocabulary/validation/deity-tradition';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's tradition half (MB.132): the deity traditions' writes, the site
// admin's alone. A deity's slug is its name and its tradition (MB.132), so a
// rename moves the slug of every deity under the tradition, and a delete first
// moves its live deities to the tradition the admin names, each re-slugged
// there — the deities stay curated, so neither a compendium entry's pick nor a
// coven's is orphaned (claude-docs/design-decisions/mb.132-admin-deities.md).
// The seeded traditions stay, so every tradition and deity a test writes is
// `Fixture …`.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Every row a test writes goes: the entries, then the deities, then the traditions.
beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from deities where name like 'Fixture%'`;
  await sql`delete from deity_traditions where name like 'Fixture %'`;
});

const admin = asUser(E);

// Between them every workspace role there is, and a coven that is not W: none
// of it is the site role, which is the one thing a vocabulary write turns on.
const NON_ADMINS = [
  ['an owner of a coven', A],
  ['a member of a coven', B],
  ['a viewer in a coven', C],
  ['a member of another coven', D],
] as const;

it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

function input(overrides: Partial<DeityTraditionInput> = {}): DeityTraditionInput {
  return { name: 'Fixture Folk', description: 'A tradition this test made', ...overrides };
}

/** Seeds a tradition directly, stamped by A — not through the code under test. */
async function seedTradition(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into deity_traditions (name, slug, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded by the test', ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

/** Seeds a deity under the tradition, slugged as MB.132 slugs one, stamped by A. */
async function seedDeity(name: string, traditionId: string): Promise<string> {
  const [tradition] = await sql<{ name: string }[]>`
    select name from deity_traditions where id = ${traditionId}`;
  const [row] = await sql<{ id: string }[]>`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    values (${name}, ${deitySlug(name, tradition.name)}, 'Seeded by the test', ${traditionId}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function traditionOf(id: string) {
  const [row] = await sql`select * from deity_traditions where id = ${id}`;
  return row;
}

async function deityOf(id: string) {
  const [row] = await sql`select * from deities where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`select count(*)::int as n from deity_traditions where name = ${name}`;
  return row.n as number;
};

/** A fresh compendium entry, or W's own ingredient, linking the deity; the link's id. */
async function picking(deityId: string, workspaceId: string | null = null): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', workspaceId, nomenclature: 'none' }),
    A.id,
  );
  return insertDeityLink(sql, id, deityId, 0, A.id);
}

async function linkOf(id: string) {
  const [row] = await sql`select * from ingredient_deities where id = ${id}`;
  return row;
}

/** An issue list, or the test fails because the write went through. */
async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => expect.fail('the write was not refused'),
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('getDeityTraditionBySlug', () => {
  it('answers the live tradition holding the address', async () => {
    const id = await seedTradition('Fixture Found');

    await expect(getDeityTraditionBySlug('fixture-found')).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seedTradition('Fixture Gone');
    await sql`update deity_traditions set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getDeityTraditionBySlug('fixture-gone')).rejects.toThrow(NotFound);
    await expect(getDeityTraditionBySlug('no-such-tradition')).rejects.toThrow(NotFound);
  });
});

describe('createDeityTradition', () => {
  it('lets the site admin create one, its slug from the name, stamped by them', async () => {
    const created = await createDeityTradition(admin, input({ name: 'Fixture Made' }));

    expect(await traditionOf(created.id)).toMatchObject({
      name: 'Fixture Made',
      slug: 'fixture-made',
      description: 'A tradition this test made',
      seed_key: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });
  });

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createDeityTradition(asUser(user), input())).rejects.toThrow(Forbidden);
    expect(await countNamed('Fixture Folk')).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(createDeityTradition(asUser(A), input({ name: '   ' }))).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('refuses a name whose address a live tradition holds, on `name`, naming it', async () => {
    await seedTradition('Fixture Folk');

    const issues = await issuesOf(createDeityTradition(admin, input({ name: 'Fixture-Folk' })));

    expect(issues).toEqual([
      {
        path: ['name'],
        message: '"Fixture Folk" already has the address "fixture-folk" — choose another name',
      },
    ]);
    expect(await countNamed('Fixture-Folk')).toBe(0);
  });
});

describe('updateDeityTradition', () => {
  it('lets the site admin rewrite it, the slug following the name, created_by kept', async () => {
    const id = await seedTradition('Fixture Old');

    await updateDeityTradition(admin, id, { name: 'Fixture New', description: 'Rewritten' });

    expect(await traditionOf(id)).toMatchObject({
      name: 'Fixture New',
      slug: 'fixture-new',
      description: 'Rewritten',
      created_by: A.id,
      updated_by: E.id,
    });
  });

  // An entry's link holds the deity's name and id, never its slug, so the
  // re-slug carries onto no ingredient.
  it('moves the slug of every live deity under it, in the same write, and touches no ingredient', async () => {
    const id = await seedTradition('Fixture Old');
    const deity = await seedDeity('Fixture Testra', id);
    const retired = await seedDeity('Fixture Retired', id);
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${retired}`;
    const link = await picking(deity);
    const before = await Promise.all([linkOf(link), deityOf(retired)]);

    await updateDeityTradition(admin, id, input({ name: 'Fixture New' }));

    expect(await deityOf(deity)).toMatchObject({
      slug: 'fixture-testra-fixture-new',
      tradition_id: id,
      updated_by: E.id,
    });
    expect(await Promise.all([linkOf(link), deityOf(retired)])).toEqual(before);
  });

  it("leaves its deities' slugs alone when the name stays", async () => {
    const id = await seedTradition('Fixture Old');
    const deity = await seedDeity('Fixture Testra', id);
    const before = await deityOf(deity);

    await updateDeityTradition(admin, id, input({ name: 'Fixture Old', description: 'Reworded' }));

    expect(await deityOf(deity)).toEqual(before);
  });

  it("refuses a rename that would move a deity onto another deity's address, on `name`, writing nothing", async () => {
    const id = await seedTradition('Fixture Old');
    const deity = await seedDeity('Fixture Testra', id);
    const odd = await seedTradition('Fixture Odd');
    await seedDeity('Fixture Testra Fixture', odd);
    // Why the rename could have gone through: no tradition holds its address.
    expect(await countNamed('Fixture Fixture Odd')).toBe(0);
    const before = await Promise.all([traditionOf(id), deityOf(deity)]);

    const issues = await issuesOf(
      updateDeityTradition(admin, id, input({ name: 'Fixture Fixture Odd' })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          'Renaming the tradition would move "Fixture Testra" to the address "fixture-testra-fixture-fixture-odd", which "Fixture Testra Fixture" already has — rename one of them first',
      },
    ]);
    expect(await Promise.all([traditionOf(id), deityOf(deity)])).toEqual(before);
  });

  it("refuses a rename onto another tradition's address, on `name`, leaving the row as it was", async () => {
    const id = await seedTradition('Fixture Mine');
    await seedTradition('Fixture Theirs');
    const before = await traditionOf(id);

    const issues = await issuesOf(
      updateDeityTradition(admin, id, input({ name: 'Fixture theirs' })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message: '"Fixture Theirs" already has the address "fixture-theirs" — choose another name',
      },
    ]);
    expect(await traditionOf(id)).toEqual(before);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seedTradition('Fixture Standing');
    const before = await traditionOf(id);

    await expect(updateDeityTradition(asUser(user), id, input())).rejects.toThrow(Forbidden);
    expect(await traditionOf(id)).toEqual(before);
  });

  it('answers NotFound for a deleted tradition, for an id that names nothing, and for one that is not a uuid', async () => {
    const id = await seedTradition('Fixture Deleted');
    await sql`update deity_traditions set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

    await expect(updateDeityTradition(admin, id, input())).rejects.toThrow(NotFound);
    await expect(
      updateDeityTradition(admin, '99999999-9999-4999-8999-999999999999', input()),
    ).rejects.toThrow(NotFound);
    await expect(updateDeityTradition(admin, 'not-a-uuid', input())).rejects.toThrow(NotFound);
  });
});

describe('deleteDeityTradition', () => {
  it('lets the site admin soft-delete one with no deities, keeping the row', async () => {
    const id = await seedTradition('Fixture Empty');

    await deleteDeityTradition(admin, id);

    const row = await traditionOf(id);
    expect(row).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

  it('moves its live deities to the tradition named, re-slugged there, then deletes it, in one write', async () => {
    const id = await seedTradition('Fixture Leaving');
    const target = await seedTradition('Fixture Staying');
    const first = await seedDeity('Fixture Testra', id);
    const second = await seedDeity('Fixture Mockra', id);
    const retired = await seedDeity('Fixture Retired', id);
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${retired}`;

    await deleteDeityTradition(admin, id, target);

    expect((await traditionOf(id)).deleted_at).toBeInstanceOf(Date);
    for (const deity of [first, second]) {
      expect(await deityOf(deity)).toMatchObject({
        tradition_id: target,
        slug: expect.stringMatching(/^fixture-[a-z]+-fixture-staying$/),
        updated_by: E.id,
        deleted_at: null,
      });
    }
    // A retired deity is no longer the tradition's to move.
    expect(await deityOf(retired)).toMatchObject({ tradition_id: id, updated_by: A.id });
  });

  // The amendment to MB.162 for traditions, as M5.6b's for form groups: the
  // moved deities stay curated, so no entry's link is orphaned.
  it("is not refused by a compendium entry's pick, and leaves every pick curated and every link as it was", async () => {
    const id = await seedTradition('Fixture Leaving');
    const target = await seedTradition('Fixture Staying');
    const deity = await seedDeity('Fixture Testra', id);
    const compendium = await picking(deity);
    const coven = await picking(deity, WORKSPACE_W_ID);
    const before = await Promise.all([linkOf(compendium), linkOf(coven)]);
    // Why it could have been refused: a live compendium entry links a deity under it.
    expect(before[0]).toMatchObject({ deity_id: deity, deleted_at: null });

    await deleteDeityTradition(admin, id, target);

    expect(await deityOf(deity)).toMatchObject({ tradition_id: target, deleted_at: null });
    expect(await Promise.all([linkOf(compendium), linkOf(coven)])).toEqual(before);
  });

  it("refuses a move onto a same-named deity's address, on `moveTo`, writing nothing", async () => {
    const id = await seedTradition('Fixture Leaving');
    const target = await seedTradition('Fixture Staying');
    const deity = await seedDeity('Fixture Testra', id);
    await seedDeity('Fixture Testra', target);
    const before = await Promise.all([traditionOf(id), deityOf(deity)]);

    const issues = await issuesOf(deleteDeityTradition(admin, id, target));

    expect(issues).toEqual([
      {
        path: ['moveTo'],
        message:
          'Moving "Fixture Testra" would give it the address "fixture-testra-fixture-staying", which "Fixture Testra" already has — rename one of them first',
      },
    ]);
    expect(await Promise.all([traditionOf(id), deityOf(deity)])).toEqual(before);
  });

  it('refuses one with live deities and no tradition to move them to, on `moveTo`, writing nothing', async () => {
    const id = await seedTradition('Fixture Leaving');
    const deity = await seedDeity('Fixture Testra', id);
    await seedDeity('Fixture Mockra', id);
    const before = await Promise.all([traditionOf(id), deityOf(deity)]);

    const issues = await issuesOf(deleteDeityTradition(admin, id));

    expect(issues).toEqual([
      { path: ['moveTo'], message: 'Choose a tradition to move its 2 deities to' },
    ]);
    expect(await Promise.all([traditionOf(id), deityOf(deity)])).toEqual(before);
  });

  it('refuses a `moveTo` naming itself, a deleted tradition or nothing, on `moveTo`', async () => {
    const id = await seedTradition('Fixture Leaving');
    await seedDeity('Fixture Testra', id);
    const gone = await seedTradition('Fixture Gone');
    await sql`update deity_traditions set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

    for (const moveTo of [id, gone, '99999999-9999-4999-8999-999999999999', 'greek']) {
      const issues = await issuesOf(deleteDeityTradition(admin, id, moveTo));
      expect(issues).toEqual([
        { path: ['moveTo'], message: 'Choose another live tradition to move its 1 deity to' },
      ]);
    }
    expect((await traditionOf(id)).deleted_at).toBeNull();
  });

  it.each(NON_ADMINS)(
    'refuses %s and leaves the tradition and its deities as they were',
    async (_who, user) => {
      const id = await seedTradition('Fixture Standing');
      const target = await seedTradition('Fixture Staying');
      const deity = await seedDeity('Fixture Testra', id);
      const before = await Promise.all([traditionOf(id), deityOf(deity)]);

      await expect(deleteDeityTradition(asUser(user), id, target)).rejects.toThrow(Forbidden);
      expect(await Promise.all([traditionOf(id), deityOf(deity)])).toEqual(before);
    },
  );

  it('answers NotFound for a tradition already deleted, for an id that names nothing, and for one that is not a uuid', async () => {
    const id = await seedTradition('Fixture Twice');
    await sql`update deity_traditions set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await traditionOf(id);

    await expect(deleteDeityTradition(admin, id)).rejects.toThrow(NotFound);
    await expect(
      deleteDeityTradition(admin, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(NotFound);
    await expect(deleteDeityTradition(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
    expect(await traditionOf(id)).toEqual(before);
  });
});
