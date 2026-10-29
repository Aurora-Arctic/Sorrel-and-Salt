import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { deitySlug } from '@/lib/slugify';
import { createDeity, deityOtherNamesOf, updateDeity } from '@/modules/vocabulary';
import type { DeityInput } from '@/modules/vocabulary/validation/deity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// A deity's other names, written on the deity form as an entry's
// common names are. A save brings the live rows to the list sent; a name is
// refused twice on one deity, or on two deities of one tradition, and the
// refusal names the deity holding it; and only a curator or an admin writes
// them. Every deity this file writes is named `Fixture …`, so the seeded
// vocabulary stays.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let traditions: Map<string, string>;
beforeAll(async () => {
  const rows = await sql<{ id: string; name: string }[]>`
    select id, name from deity_traditions where deleted_at is null`;
  traditions = new Map(rows.map((row) => [row.name, row.id]));
});
const tradition = (name: string) => traditions.get(name) as string;

beforeEach(async () => {
  await sql`delete from deity_other_names where deity_id in (
    select id from deities where name like 'Fixture%')`;
  await sql`delete from deities where name like 'Fixture%'`;
});

const admin = asUser(E);
const curator = asUser(F);

function input(overrides: Partial<DeityInput> = {}): DeityInput {
  return {
    name: 'Fixture Testra',
    description: 'A goddess this test made',
    traditionId: tradition('Greek'),
    ...overrides,
  };
}

/** A deity written directly, stamped by A — not through the code under test. */
async function seed(name: string, otherNames: string[] = [], traditionName = 'Greek') {
  const [row] = await sql<{ id: string }[]>`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    values (${name}, ${deitySlug(name, traditionName)}, 'Seeded by the test',
      ${tradition(traditionName)}, ${A.id}, ${A.id})
    returning id`;
  for (const other of otherNames) {
    await sql`insert into deity_other_names (deity_id, name, created_by, updated_by)
      values (${row.id}, ${other}, ${A.id}, ${A.id})`;
  }
  return row.id;
}

/** The deity's live other names, as stored, alphabetically. */
async function liveNames(deityId: string): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select name from deity_other_names
    where deity_id = ${deityId} and deleted_at is null order by name`;
  return rows.map((row) => row.name);
}

/** Every row the deity ever held, live or not, with who stamped it. */
async function allRows(deityId: string) {
  return sql<{ id: string; name: string; deleted_at: Date | null; deleted_by: string | null }[]>`
    select id, name, deleted_at, deleted_by, created_by from deity_other_names
    where deity_id = ${deityId} order by name, created_at`;
}

async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => expect.fail('the write was not refused'),
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('who writes other names', () => {
  // B is a member of W, whose workspace role writes a coven's ingredients and
  // is no site role, which is all a vocabulary write turns on. F is a curator.
  it('refuses a member a create carrying other names, writing nothing', async () => {
    const sent = input({ name: 'Fixture Refused', otherNames: ['Fixture Refusa'] });
    expect(asUser(B).role).toBe('user');

    await expect(createDeity(asUser(B), sent)).rejects.toThrow(Forbidden);
    const [row] = await sql`select count(*)::int as n from deity_other_names
      where name = 'Fixture Refusa'`;
    expect(row.n).toBe(0);

    // Why it could have passed: the same input is written for a curator.
    expect(curator.role).toBe('curator');
    const created = await createDeity(curator, sent);
    expect(await liveNames(created.id)).toEqual(['Fixture Refusa']);
  });

  it("refuses a member an update by the deity's own id, leaving its names as they were", async () => {
    const id = await seed('Fixture Testra', ['Fixture Kept']);
    const sent = input({ otherNames: ['Fixture Forged'] });
    expect(asUser(B).role).toBe('user');

    await expect(updateDeity(asUser(B), id, sent)).rejects.toThrow(Forbidden);
    expect(await liveNames(id)).toEqual(['Fixture Kept']);

    // Why it could have passed: the id is real and live, and the same call by
    // a curator rewrites the list.
    expect(curator.role).toBe('curator');
    await updateDeity(curator, id, sent);
    expect(await liveNames(id)).toEqual(['Fixture Forged']);
  });
});

describe('saving the list', () => {
  it('writes the names sent with a new deity, trimmed, blanks dropped, stamped by the writer', async () => {
    const created = await createDeity(
      admin,
      input({ otherNames: ['  Fixture Testrina ', '', 'Fixture Tess'] }),
    );

    expect(await liveNames(created.id)).toEqual(['Fixture Tess', 'Fixture Testrina']);
    for (const row of await allRows(created.id)) {
      expect(row).toMatchObject({ created_by: E.id, deleted_at: null });
    }
  });

  it('brings the live rows to the list sent: a kept name keeps its row, a dropped one is soft-deleted, a new one added', async () => {
    const id = await seed('Fixture Testra', ['Fixture Kept', 'Fixture Dropped']);
    const [kept] = (await allRows(id)).filter((row) => row.name === 'Fixture Kept');

    await updateDeity(admin, id, input({ otherNames: ['Fixture Kept', 'Fixture New'] }));

    expect(await liveNames(id)).toEqual(['Fixture Kept', 'Fixture New']);
    const rows = await allRows(id);
    expect(rows.find((row) => row.name === 'Fixture Kept')?.id).toBe(kept.id);
    expect(rows.find((row) => row.name === 'Fixture Dropped')).toMatchObject({
      deleted_by: E.id,
    });
    expect(rows.find((row) => row.name === 'Fixture Dropped')?.deleted_at).not.toBeNull();
  });

  it('clears every name when the list sent is empty, or absent', async () => {
    const emptied = await seed('Fixture Testra', ['Fixture One']);
    const absent = await seed('Fixture Mockra', ['Fixture Two']);

    await updateDeity(admin, emptied, input({ otherNames: [] }));
    await updateDeity(admin, absent, input({ name: 'Fixture Mockra' }));

    expect(await liveNames(emptied)).toEqual([]);
    expect(await liveNames(absent)).toEqual([]);
  });

  it('takes a change of case as a new name, the old row soft-deleted first', async () => {
    const id = await seed('Fixture Testra', ['Fixture testrina']);

    await updateDeity(admin, id, input({ otherNames: ['Fixture Testrina'] }));

    expect(await liveNames(id)).toEqual(['Fixture Testrina']);
  });
});

describe('a repeated other name', () => {
  it('is refused twice in one list, in any case, on the repeat, naming the deity', async () => {
    const issues = await issuesOf(
      createDeity(admin, input({ otherNames: ['Fixture Testrina', 'fixture testrina'] })),
    );

    expect(issues).toEqual([
      { path: ['otherNames', 1], message: 'Fixture Testra already has this other name' },
    ]);
    expect(await sql`select 1 from deities where name = 'Fixture Testra'`).toHaveLength(0);
  });

  it('is refused when another deity of the tradition holds it, in any case, naming that deity and writing nothing', async () => {
    await seed('Fixture Holder', ['Fixture Shared']);
    const id = await seed('Fixture Testra', ['Fixture Own']);

    const issues = await issuesOf(
      updateDeity(admin, id, input({ otherNames: ['Fixture Own', 'fixture shared'] })),
    );

    expect(issues).toEqual([
      { path: ['otherNames', 1], message: 'Fixture Holder already has this other name' },
    ]);
    expect(await liveNames(id)).toEqual(['Fixture Own']);
  });

  it('is held by a deity of another tradition, a retired deity, or a dropped name', async () => {
    await seed('Fixture Roman', ['Fixture Shared'], 'Roman');
    const retired = await seed('Fixture Retired', ['Fixture Retiree']);
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${retired}`;
    const dropped = await seed('Fixture Dropper', ['Fixture Dropped']);
    await sql`update deity_other_names set deleted_at = now(), deleted_by = ${A.id}
      where deity_id = ${dropped}`;

    const created = await createDeity(
      admin,
      input({ otherNames: ['Fixture Shared', 'Fixture Retiree', 'Fixture Dropped'] }),
    );

    expect(await liveNames(created.id)).toEqual([
      'Fixture Dropped',
      'Fixture Retiree',
      'Fixture Shared',
    ]);
  });

  it("is not refused against the deity's own names on an update", async () => {
    const id = await seed('Fixture Testra', ['Fixture Own']);

    await updateDeity(admin, id, input({ otherNames: ['Fixture Own'] }));

    expect(await liveNames(id)).toEqual(['Fixture Own']);
  });
});

describe('deityOtherNamesOf', () => {
  it("answers each deity's live names alphabetically, in the order asked, a dropped one left out", async () => {
    const first = await seed('Fixture Testra', ['Fixture Zeta', 'Fixture Alpha']);
    const second = await seed('Fixture Mockra');
    await sql`update deity_other_names set deleted_at = now(), deleted_by = ${A.id}
      where deity_id = ${first} and name = 'Fixture Zeta'`;

    expect(await deityOtherNamesOf([second, first])).toEqual([[], ['Fixture Alpha']]);
  });
});
