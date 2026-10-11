import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import {
  type CuratedField,
  countAstrologyValues,
  createAstrologyValue,
  deleteAstrologyValue,
  getAstrologyValueBySlug,
  listAstrologyValues,
  updateAstrologyValue,
} from '@/modules/vocabulary';
import type { AstrologyValueInput } from '@/modules/vocabulary/validation/astrology-value';
import { slugify } from '@/lib/slugify';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's planet and sign half (MB.95): the two flat astrology
// vocabularies' writes, the site admin's alone, and the reads the admin pages
// list them by. A compendium entry's planets and signs are spellings the
// vocabulary curates (MB.162), so a value a live entry's list holds is held:
// its delete is refused, and its rename is carried onto the list. A coven's
// ingredient is neither. Every test runs once per vocabulary; the seeded rows
// stay, so every row a test writes is named `Fixture …`.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const admin = asUser(E);

// The site role is the one thing a vocabulary write turns on, so one non-admin
// stands for every one (claude-docs/testing/acting-as-fixture-users.md): an
// owner, whose workspace role is the highest and is still no site role.
const NON_ADMINS = [['an owner of a coven', A]] as const;

it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

const VOCABULARIES: {
  field: CuratedField;
  table: 'planets' | 'zodiac_signs';
  column: 'planets' | 'zodiac_signs';
}[] = [
  {
    field: 'planets',
    table: 'planets',
    column: 'planets',
  },
  {
    field: 'zodiacSigns',
    table: 'zodiac_signs',
    column: 'zodiac_signs',
  },
];

describe.each(VOCABULARIES)('$field', ({ field, table, column }) => {
  beforeEach(async () => {
    await sql`truncate ingredients cascade`;
    await sql`delete from ${sql(table)} where name like 'Fixture%'`;
  });

  function input(overrides: Partial<AstrologyValueInput> = {}): AstrologyValueInput {
    return { name: 'Fixture Body', description: 'A value this test made', ...overrides };
  }

  /** Seeds a row directly, stamped by A — not through the code under test. */
  async function seed(name: string): Promise<string> {
    const slug = slugify(name);
    const [row] = await sql<{ id: string }[]>`
      insert into ${sql(table)} (name, slug, description, created_by, updated_by)
      values (${name}, ${slug}, 'Seeded by the test', ${A.id}, ${A.id})
      returning id`;
    return row.id;
  }

  async function rowOf(id: string) {
    const [row] = await sql`select * from ${sql(table)} where id = ${id}`;
    return row;
  }

  async function ingredientOf(id: string) {
    const [row] = await sql`select * from ingredients where id = ${id}`;
    return row;
  }

  const countNamed = async (name: string) => {
    const [row] = await sql`select count(*)::int as n from ${sql(table)} where name = ${name}`;
    return row.n as number;
  };

  /** A fresh compendium entry, or W's own ingredient, whose list holds `values`. */
  const entry = (
    name: string,
    values: string[],
    overrides: Parameters<typeof makeIngredient>[0] = {},
  ) =>
    insertIngredient(
      sql,
      makeIngredient({ name, nomenclature: 'none', form: null, [field]: values, ...overrides }),
      A.id,
    );

  /** An issue list, or the test fails because the write went through. */
  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  describe('listAstrologyValues and countAstrologyValues', () => {
    const listed = async (query?: string): Promise<string[]> => {
      const page = await resolvePage({ first: 100 }, (request) =>
        listAstrologyValues(field, { query }, request),
      );
      return page.edges.map((edge) => edge.node.name);
    };

    it('lists the live rows alphabetically by name, a deleted one left out', async () => {
      const gone = await seed('Fixture Gone');
      await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
      const expected = await sql<{ name: string }[]>`
        select name from ${sql(table)} where deleted_at is null order by name, id`;
      expect(expected.length).toBeGreaterThan(10);

      expect(await listed()).toEqual(expected.map((row) => row.name));
      await expect(countAstrologyValues(field, {}, undefined)).resolves.toEqual({
        totalCount: expected.length,
        countBefore: null,
      });
    });

    it('narrows by a name fragment, and reads a blank one as none', async () => {
      await seed('Fixture Bramble');
      await seed('Fixture Thistle');

      expect(await listed('BRAMBLE')).toEqual(['Fixture Bramble']);
      expect(await listed('   ')).toEqual(await listed());
      await expect(countAstrologyValues(field, { query: 'fixture' }, undefined)).resolves.toEqual({
        totalCount: 2,
        countBefore: null,
      });
    });
  });

  describe('getAstrologyValueBySlug', () => {
    it('answers the live row holding the address, and NotFound for a deleted or empty one', async () => {
      const id = await seed('Fixture Found');
      const gone = await seed('Fixture Gone');
      await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

      await expect(getAstrologyValueBySlug(field, 'fixture-found')).resolves.toMatchObject({ id });
      await expect(getAstrologyValueBySlug(field, 'fixture-gone')).rejects.toThrow(NotFound);
      await expect(getAstrologyValueBySlug(field, 'no-such-value')).rejects.toThrow(NotFound);
    });
  });

  describe('createAstrologyValue', () => {
    it('lets the site admin create one, its slug from the name, stamped by them', async () => {
      const created = await createAstrologyValue(admin, field, input({ name: 'Fixture Made' }));

      expect(await rowOf(created.id)).toMatchObject({
        name: 'Fixture Made',
        slug: 'fixture-made',
        description: 'A value this test made',
        seed_key: null,
        created_by: E.id,
        updated_by: E.id,
        deleted_at: null,
      });
    });

    it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
      await expect(createAstrologyValue(asUser(user), field, input())).rejects.toThrow(Forbidden);
      expect(await countNamed('Fixture Body')).toBe(0);
    });

    it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
      await expect(
        createAstrologyValue(asUser(A), field, input({ name: '   ' })),
      ).rejects.toBeInstanceOf(Forbidden);
    });

    it('refuses a blank name and a blank description, each on its field', async () => {
      const issues = await issuesOf(
        createAstrologyValue(admin, field, input({ name: ' ', description: ' ' })),
      );

      expect(issues).toEqual([
        { path: ['name'], message: expect.any(String) },
        { path: ['description'], message: expect.any(String) },
      ]);
    });

    it('refuses a name whose address a live row holds, on `name`, naming it', async () => {
      await seed('Fixture Body');

      const issues = await issuesOf(
        createAstrologyValue(admin, field, input({ name: 'fixture-BODY' })),
      );

      expect(issues).toEqual([
        {
          path: ['name'],
          message: expect.stringContaining('Fixture Body'),
        },
      ]);
      expect(await countNamed('fixture-BODY')).toBe(0);
    });

    it("takes a deleted row's address", async () => {
      const gone = await seed('Fixture Again');
      await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

      const created = await createAstrologyValue(admin, field, input({ name: 'Fixture Again' }));

      expect(created.slug).toBe('fixture-again');
    });
  });

  describe('updateAstrologyValue', () => {
    it('lets the site admin rewrite it, the slug following the name, created_by kept', async () => {
      const id = await seed('Fixture Old');

      await updateAstrologyValue(admin, field, id, {
        name: 'Fixture New',
        description: 'Rewritten',
      });

      expect(await rowOf(id)).toMatchObject({
        name: 'Fixture New',
        slug: 'fixture-new',
        description: 'Rewritten',
        created_by: A.id,
        updated_by: E.id,
      });
    });

    // MB.171: the seed recognises its own rows by the key.
    it("keeps a seeded row's seed key through a rename", async () => {
      const [seeded] = await sql<{ id: string; seed_key: string }[]>`
        select id, seed_key from ${sql(table)}
        where seed_key is not null and deleted_at is null order by name limit 1`;
      expect(seeded.seed_key).toEqual(expect.any(String));

      await updateAstrologyValue(admin, field, seeded.id, input({ name: 'Fixture Renamed Seed' }));

      expect(await rowOf(seeded.id)).toMatchObject({
        name: 'Fixture Renamed Seed',
        seed_key: seeded.seed_key,
      });
    });

    it.each(NON_ADMINS)('refuses %s by id, and leaves the row as it was', async (_who, user) => {
      const id = await seed('Fixture Kept');
      const before = await rowOf(id);

      await expect(updateAstrologyValue(asUser(user), field, id, input())).rejects.toThrow(
        Forbidden,
      );
      expect(await rowOf(id)).toEqual(before);
    });

    it("refuses a rename onto another row's address, on `name`, leaving the row as it was", async () => {
      await seed('Fixture Taken');
      const id = await seed('Fixture Mine');
      const before = await rowOf(id);

      const issues = await issuesOf(
        updateAstrologyValue(admin, field, id, input({ name: 'Fixture-Taken' })),
      );

      expect(issues).toEqual([
        {
          path: ['name'],
          message: expect.any(String),
        },
      ]);
      expect(await rowOf(id)).toEqual(before);
    });

    it('answers NotFound for a deleted row, and for an id that is not a uuid', async () => {
      const id = await seed('Fixture Deleted Once');
      await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
      const before = await rowOf(id);

      await expect(updateAstrologyValue(admin, field, id, input())).rejects.toThrow(NotFound);
      await expect(updateAstrologyValue(admin, field, 'not-a-uuid', input())).rejects.toThrow(
        NotFound,
      );
      expect(await rowOf(id)).toEqual(before);
    });

    it('carries a rename onto every live compendium entry holding the value, in place, in the same write', async () => {
      const id = await seed('Fixture Body');
      const first = await entry('Testwort', ['Moon', 'Fixture Body', 'Sun']);
      const second = await entry('Testleaf', ['Fixture Body']);
      const gone = await entry('Testgone', ['Fixture Body']);
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

      await updateAstrologyValue(admin, field, id, input({ name: 'Fixture Renamed' }));

      expect(await ingredientOf(first)).toMatchObject({
        [column]: ['Moon', 'Fixture Renamed', 'Sun'],
        slug: 'testwort',
        updated_by: E.id,
      });
      expect((await ingredientOf(second))[column]).toEqual(['Fixture Renamed']);
      // A soft-deleted entry keeps the old spelling.
      expect((await ingredientOf(gone))[column]).toEqual(['Fixture Body']);
    });

    it('carries a change of case alone', async () => {
      const id = await seed('Fixture Body');
      const held = await entry('Testwort', ['Fixture Body']);

      await updateAstrologyValue(admin, field, id, input({ name: 'Fixture BODY' }));

      expect((await ingredientOf(held))[column]).toEqual(['Fixture BODY']);
    });

    it('rewrites no entry when the name is unchanged', async () => {
      const id = await seed('Fixture Body');
      const held = await entry('Testwort', ['Fixture Body']);
      const before = await ingredientOf(held);

      await updateAstrologyValue(admin, field, id, input({ description: 'Only this' }));

      expect(await ingredientOf(held)).toEqual(before);
    });

    it("never rewrites a coven's ingredient", async () => {
      const id = await seed('Fixture Body');
      const coven = await entry('Testwort', ['Fixture Body'], { workspaceId: WORKSPACE_W_ID });
      const before = await ingredientOf(coven);
      // The precondition: it holds the value the rename would rewrite.
      expect(before[column]).toEqual(['Fixture Body']);

      await updateAstrologyValue(admin, field, id, input({ name: 'Fixture Renamed' }));

      expect(await ingredientOf(coven)).toEqual(before);
    });

    it('leaves the entries as they were when the rename is refused', async () => {
      await seed('Fixture Taken');
      const id = await seed('Fixture Body');
      const held = await entry('Testwort', ['Fixture Body']);
      const before = await ingredientOf(held);

      await issuesOf(updateAstrologyValue(admin, field, id, input({ name: 'Fixture Taken' })));

      expect(await ingredientOf(held)).toEqual(before);
    });
  });

  describe('deleteAstrologyValue', () => {
    it('lets the site admin soft-delete one no live compendium entry holds', async () => {
      const id = await seed('Fixture Doomed');

      await deleteAstrologyValue(admin, field, id);

      expect(await rowOf(id)).toMatchObject({ deleted_by: E.id, deleted_at: expect.any(Date) });
    });

    it.each(NON_ADMINS)('refuses %s by id, and the row stays live', async (_who, user) => {
      const id = await seed('Fixture Kept');

      await expect(deleteAstrologyValue(asUser(user), field, id)).rejects.toThrow(Forbidden);
      expect((await rowOf(id)).deleted_at).toBeNull();
    });

    it('refuses while one live compendium entry holds it, naming it, and the row stays live', async () => {
      const id = await seed('Fixture Body');
      await entry('Testwort', ['Fixture Body']);

      const attempt = deleteAstrologyValue(admin, field, id);
      await expect(attempt).rejects.toThrow(Forbidden);
      await expect(attempt).rejects.toThrow('Testwort');
      expect((await rowOf(id)).deleted_at).toBeNull();
    });

    it('names the first three holding entries and no more', async () => {
      const id = await seed('Fixture Body');
      for (const name of ['Testa', 'Testb', 'Testc', 'Testd', 'Teste']) {
        await entry(name, ['fixture body']);
      }

      const attempt = deleteAstrologyValue(admin, field, id);
      await expect(attempt).rejects.toThrow('Testc');
      await expect(attempt).rejects.not.toThrow('Testd');
    });

    it('passes once no live entry holds it: a deleted entry and a coven’s ingredient never block it', async () => {
      const id = await seed('Fixture Body');
      const held = await entry('Testwort', ['Fixture Body']);
      const coven = await entry('Testleaf', ['Fixture Body'], { workspaceId: WORKSPACE_W_ID });
      await expect(deleteAstrologyValue(admin, field, id)).rejects.toThrow(Forbidden);
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${held}`;
      const covenBefore = await ingredientOf(coven);
      // The precondition: the coven's ingredient still holds the value.
      expect(covenBefore[column]).toEqual(['Fixture Body']);

      await deleteAstrologyValue(admin, field, id);

      expect((await rowOf(id)).deleted_at).toEqual(expect.any(Date));
      expect(await ingredientOf(coven)).toEqual(covenBefore);
    });

    it('answers NotFound for a deleted row, and for an id that is not a uuid', async () => {
      const id = await seed('Fixture Gone');
      await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

      await expect(deleteAstrologyValue(admin, field, id)).rejects.toThrow(NotFound);
      await expect(deleteAstrologyValue(admin, field, 'not-a-uuid')).rejects.toThrow(NotFound);
    });
  });
});
