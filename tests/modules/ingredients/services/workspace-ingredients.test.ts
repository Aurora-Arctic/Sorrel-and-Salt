import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  createWorkspaceIngredient,
  deleteWorkspaceIngredient,
  getWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { liveFormsOf } from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
} from '../../../support/fixtures';
import { inputOf, local } from '../../../support/workspace-ingredient-input';

// Story 15's service: a coven's own ingredients, written by its owners and
// members and read by its members, never by anyone else. The table is emptied
// per test, so every row a result could come from is one this file wrote. What a
// deleted row leaves in each read is workspace-ingredient-deleted-reads.test.ts's,
// and the forms written inside the save are workspace-ingredient-forms.test.ts's.

// The identity holder lookup, wrapped so one test can have the holder gone by
// the time it is read without changing what it answers for the rest.
const repository = vi.hoisted(() => ({ findWorkspaceIngredientByIdentity: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findWorkspaceIngredientByIdentity.mockImplementation(
    actual.findWorkspaceIngredientByIdentity,
  );
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

/** Every folk name of the ingredient, tombstones included, oldest first. */
function folkNameRows(ingredientId: string) {
  return sql`
    select id, name, created_by, deleted_at, deleted_by, xmin::text as xmin
    from ingredient_folk_names where ingredient_id = ${ingredientId}
    order by created_at, name`;
}

const liveNames = async (ingredientId: string) =>
  (await folkNameRows(ingredientId))
    .filter((row) => row.deleted_at === null)
    .map((row) => row.name as string)
    .sort();

/** The id of the transaction that last wrote the row — equal for two rows written in one. */
async function writtenBy(ingredientId: string): Promise<string> {
  const [row] = await sql`select xmin::text as xmin from ingredients where id = ${ingredientId}`;
  return row.xmin as string;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

describe('createWorkspaceIngredient', () => {
  // A member stands for the owner too: both hold `ingredient: ['create']`, which
  // tests/modules/coven/services/access-control.test.ts owns.
  it('lets a member create one, in their own coven and stamped by them', async () => {
    const user = B;
    const created = await createWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, inputOf(local()));

    expect(created).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      name: 'Testwort',
      nomenclature: 'none',
      canonicalName: null,
      createdBy: user.id,
      updatedBy: user.id,
    });
    expect(created.slug).toBe(ingredientSlug('Testwort', null));
  });

  // DESIGN.md §5: as many of each as the practice gives it, in the
  // member's order, and never into `element`, the single its list replaced.
  it('saves several elements, celestial bodies, signs and colours, each in the order entered', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...inputOf(local()),
      elements: ['water', 'earth'],
      celestialBodies: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', ' ', 'Silver'],
    });

    expect(created).toMatchObject({
      elements: ['water', 'earth'],
      celestialBodies: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', 'Silver'],
    });
    expect(await rowOf(created.id)).toMatchObject({
      elements: ['water', 'earth'],
      celestial_bodies: ['Venus', 'Moon'],
      zodiac_signs: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', 'Silver'],
    });
  });

  it('defaults a stub with only a name to `none`, as story 29 saves it', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
    } as LocalIngredientInput);

    expect(created).toMatchObject({ nomenclature: 'none', canonicalName: null });
    expect(await liveFormsOf(sql, created.id)).toEqual([]);
  });

  it('refuses a viewer, who is a member and can read the coven', async () => {
    // Why it could have succeeded: C holds a live membership of W and reads it.
    const id = await seed(local({ name: 'Rootwort' }));
    await expect(getWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      name: 'Rootwort',
    });

    await expect(
      createWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, inputOf(local())),
    ).rejects.toThrow(Forbidden);
    expect(await countIngredients()).toBe(1);
  });

  it.each([
    ['a member of another coven', D],
    ['a site admin', E],
  ])('refuses %s', async (_who, user) => {
    await expect(
      createWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, inputOf(local())),
    ).rejects.toThrow(Forbidden);
    expect(await countIngredients()).toBe(0);
  });

  it('refuses invalid input with the form’s own issues, writing nothing', async () => {
    const attempt = createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...inputOf(local()),
      name: '   ',
    });

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ['name'] })],
    });
    expect(await countIngredients()).toBe(0);
  });

  // No path promotes a local ingredient to global: the tier is the proof's.
  // One foreign value stands for any, null included: the row's coven comes from
  // the `Membership` proof the service holds, never from the input.
  it('ignores a workspaceId naming another coven in the input', async () => {
    const input = { ...inputOf(local()), workspaceId: WORKSPACE_X_ID } as LocalIngredientInput;

    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input);

    expect((await rowOf(created.id)).workspace_id).toBe(WORKSPACE_W_ID);
  });

  it('writes the folk names with the ingredient, in the same transaction', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      inputOf(local({ folkNames: ['Test Root', 'Fixture Herb'] })),
    );

    const rows = await folkNameRows(created.id);
    expect(rows.map((row) => row.name).sort()).toEqual(['Fixture Herb', 'Test Root']);
    expect(rows.every((row) => row.created_by === B.id)).toBe(true);
    const transaction = await writtenBy(created.id);
    for (const row of rows) expect(row.xmin).toBe(transaction);
  });
});

// The coven's three unique indexes, each met as a `ValidationError` pathed to
// the field that caused it rather than as the raw index error.
describe('a collision with another of the coven’s ingredients', () => {
  /** The issues a refused write carried; fails the test if it was not refused that way. */
  async function issuesOf(attempt: Promise<unknown>) {
    const error = await attempt.then(
      () => expect.fail('the write was not refused'),
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  const create = (overrides: Overrides<IngredientFixture>) =>
    createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, inputOf(local(overrides)));

  it('refuses a label already in the coven under another formal name, whatever its case, on `name`', async () => {
    await seed(local({ name: 'Testwort', canonicalName: 'Fixtura testalis' }));

    expect(await issuesOf(create({ name: 'testwort', canonicalName: 'Fixtura altera' }))).toEqual([
      { path: ['name'], message: expect.any(String) },
    ]);
    expect(await countIngredients()).toBe(1);
  });

  // One formal name is one ingredient, so an oil beside the herb is a
  // form of it. Under the herb's own label the label index breaks first, and
  // the refusal is still the formal name's, naming the ingredient holding it.
  it('refuses a formal name already in the coven whatever its form, on `canonicalName`, naming the ingredient', async () => {
    await seed(
      local({
        name: 'Testwort',
        canonicalName: 'Fixtura testalis',
        variants: [makeVariant({ form: 'Testleaf' })],
      }),
    );

    expect(
      await issuesOf(
        create({
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          variants: [makeVariant({ form: 'Testoil' })],
        }),
      ),
    ).toEqual([{ path: ['canonicalName'], message: expect.stringContaining('Testwort') }]);
    expect(await countIngredients()).toBe(1);
  });

  it('names no ingredient when the holder is gone by the time it is read, rather than surfacing the raw error', async () => {
    await seed(local({ name: 'Testwort', canonicalName: 'Fixtura testalis' }));
    repository.findWorkspaceIngredientByIdentity.mockResolvedValueOnce(undefined);

    // Another label and address, so only the identity index can refuse it.
    expect(await issuesOf(create({ name: 'Testleaf', canonicalName: 'Fixtura testalis' }))).toEqual(
      [{ path: ['canonicalName'], message: expect.not.stringContaining('Testwort') }],
    );
  });

  it('refuses an identity that is only a label on `name`, since the label is the identity', async () => {
    await seed(local({ name: 'Testwort' }));

    const [issue] = await issuesOf(create({ name: 'testwort' }));

    expect(issue.path).toEqual(['name']);
  });

  it('refuses a name whose address another ingredient already has, on `name`', async () => {
    await seed(local({ name: 'Testwort', nomenclature: 'unknown', canonicalName: 'Fixtura root' }));

    // Why only the slug index is left to catch it: label and identity both differ.
    expect(ingredientSlug('Testwort Fixtura', 'Root')).toBe(
      ingredientSlug('Testwort', 'Fixtura root'),
    );

    expect(
      await issuesOf(
        create({ name: 'Testwort Fixtura', nomenclature: 'unknown', canonicalName: 'Root' }),
      ),
    ).toEqual([{ path: ['name'], message: expect.any(String) }]);
  });

  // The identity holder looked up on an address collision is the row itself
  // when the update keeps its formal name, and is no collision of its own.
  it("refuses a relabel onto another ingredient's address on `name`, though its own formal name is held, by itself", async () => {
    await seed(local({ name: 'Testwort', nomenclature: 'unknown', canonicalName: 'Fixtura root' }));
    const id = await seed(
      local({ name: 'Testleaf', nomenclature: 'unknown', canonicalName: 'Root' }),
    );

    const issues = await issuesOf(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(
          local({ name: 'Testwort Fixtura', nomenclature: 'unknown', canonicalName: 'Root' }),
        ),
      ),
    );

    expect(issues).toEqual([{ path: ['name'], message: expect.any(String) }]);
    expect((await rowOf(id)).name).toBe('Testleaf');
  });

  it('does not collide with the compendium or another coven, whose rows are not the coven’s', async () => {
    await seed(makeIngredient());
    await seed(makeIngredient({ workspaceId: WORKSPACE_X_ID }));

    await expect(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, inputOf(makeIngredient())),
    ).resolves.toMatchObject({ workspaceId: WORKSPACE_W_ID });
  });
});

describe('getWorkspaceIngredient', () => {
  it('answers every member of the coven, viewers included', async () => {
    const id = await seed(local());

    for (const user of [A, B, C]) {
      await expect(getWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, id)).resolves.toMatchObject(
        { id, name: 'Testwort' },
      );
    }
  });

  describe('a W ingredient asked for by direct id from outside W', () => {
    let id: string;

    beforeEach(async () => {
      id = await seed(local());
      // Why each read below could have succeeded: the id is live and W reads it.
      await expect(getWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, id)).resolves.toMatchObject({
        id,
      });
    });

    it('refuses a member of another coven naming W', async () => {
      await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, id)).rejects.toThrow(
        Forbidden,
      );
    });

    it('is not found under the other coven’s own proof', async () => {
      await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, id)).rejects.toThrow(NotFound);
    });

    it('refuses a site admin, who reaches no coven', async () => {
      await expect(getWorkspaceIngredient(asUser(E), WORKSPACE_W_ID, id)).rejects.toThrow(
        Forbidden,
      );
    });
  });

  it('does not answer a compendium entry, which is not the coven’s own', async () => {
    const id = await seed(makeIngredient());

    await expect(getWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, id)).rejects.toThrow(NotFound);
  });
});

describe('updateWorkspaceIngredient', () => {
  it('lets a member rewrite it, stamping updated_by and keeping created_by', async () => {
    const id = await seed(local());

    const updated = await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testroot', description: 'Dug at dusk' })),
    );

    expect(updated).toMatchObject({
      id,
      name: 'Testroot',
      description: 'Dug at dusk',
      createdBy: A.id,
      updatedBy: B.id,
    });
  });

  // No route reads a coven ingredient's slug, so it follows the name and
  // nothing redirects from the old one (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
  it('moves the slug with the label and formal name, retiring nothing', async () => {
    const id = await seed(local());

    const updated = await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testroot', canonicalName: 'Fixtura radix' })),
    );

    expect(updated.slug).toBe('testroot-fixtura-radix');
    const [{ n }] = await sql`select count(*)::int as n from retired_ingredient_slugs`;
    expect(n).toBe(0);
  });

  // The input is the whole ingredient as the form submits it, so a field left
  // out is cleared rather than kept.
  it('replaces the whole row, clearing a field the input leaves out', async () => {
    const id = await seed(local({ description: 'Dug at dusk', colors: ['Green'] }));

    const updated = await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, {
      name: 'Testwort',
    } as LocalIngredientInput);

    expect(updated).toMatchObject({ description: null, colors: null });
    expect(await liveFormsOf(sql, id)).toEqual([]);
  });

  it('replaces each list whole, an empty one clearing it', async () => {
    const id = await seed(
      local({
        elements: ['earth', 'water'],
        celestialBodies: ['Moon', 'Venus'],
        zodiacSigns: ['Cancer'],
        colors: ['Silver', 'White'],
      }),
    );

    const updated = await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, {
      ...inputOf(local()),
      elements: ['air', 'earth'],
      celestialBodies: ['Mars'],
      zodiacSigns: [],
      colors: ['White', 'Silver'],
    });

    expect(updated).toMatchObject({
      elements: ['air', 'earth'],
      celestialBodies: ['Mars'],
      zodiacSigns: null,
      colors: ['White', 'Silver'],
    });
    expect(await rowOf(id)).toMatchObject({
      elements: ['air', 'earth'],
      celestial_bodies: ['Mars'],
      zodiac_signs: null,
      colors: ['White', 'Silver'],
    });
  });

  it('refuses a viewer and leaves the row as it was', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live and C can read it.
    await expect(getWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();

    await expect(
      updateWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id, inputOf(local({ name: 'Nope' }))),
    ).rejects.toThrow(Forbidden);
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('does not reach another coven’s ingredient by direct id', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the id is live, and W's own member rewrites it.
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, inputOf(local()));

    await expect(
      updateWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, id, inputOf(local({ name: 'Nope' }))),
    ).rejects.toThrow(NotFound);
    await expect(
      updateWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, id, inputOf(local({ name: 'Nope' }))),
    ).rejects.toThrow(Forbidden);
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('refuses the site admin, whose role reaches no coven', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live, and E's role is admin.
    await expect(getWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id)).resolves.toBeDefined();
    expect(asUser(E).role).toBe('admin');

    await expect(
      updateWorkspaceIngredient(asUser(E), WORKSPACE_W_ID, id, inputOf(local({ name: 'Nope' }))),
    ).rejects.toThrow(Forbidden);
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('does not reach a compendium entry, and leaves it as it was', async () => {
    const id = await seed(makeIngredient());

    await expect(
      updateWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, id, inputOf(local({ name: 'Nope' }))),
    ).rejects.toThrow(NotFound);
    const row = await rowOf(id);
    expect(row).toMatchObject({ name: 'Testwort', workspace_id: null, updated_by: A.id });
  });

  // No path promotes a local ingredient to global.
  it('ignores a workspaceId in the input, so the row stays in its coven', async () => {
    const id = await seed(local());
    const input = { ...inputOf(local()), workspaceId: null } as LocalIngredientInput;

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input);

    expect((await rowOf(id)).workspace_id).toBe(WORKSPACE_W_ID);
  });

  it('answers NotFound for a soft-deleted ingredient, leaving it as it was', async () => {
    const id = await seed(local());
    // Why it could have been written: the row is there, and a live one is reached by this call.
    await expect(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, inputOf(local())),
    ).resolves.toMatchObject({ id });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ name: 'Testwort, relabelled' })),
      ),
    ).rejects.toThrow(NotFound);
    expect(await rowOf(id)).toEqual(before);
  });

  // Asked of the database, an id that is not a uuid is a driver error, not a miss.
  it('answers an id that is not a uuid as NotFound', async () => {
    await expect(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, 'not-an-ingredient', inputOf(local())),
    ).rejects.toThrow(NotFound);
  });

  it('refuses invalid input with the form’s own issues, changing nothing', async () => {
    const id = await seed(local());

    await expect(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, {
        ...inputOf(local()),
        folkNames: ['Test Root', 'test root'],
      }),
    ).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ['folkNames', 1] })] });
    expect(await liveNames(id)).toEqual([]);
  });

  describe('its folk names', () => {
    it('keeps the ones still listed, tombstones the dropped, and adds the new', async () => {
      const id = await seed(local({ folkNames: ['Kept Root', 'Dropped Root'] }));
      const [kept] = (await folkNameRows(id)).filter((row) => row.name === 'Kept Root');

      await updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ folkNames: ['Kept Root', 'Added Root'] })),
      );

      const rows = await folkNameRows(id);
      expect(await liveNames(id)).toEqual(['Added Root', 'Kept Root']);
      // Kept, not re-created: the same row, still A's.
      expect(rows.find((row) => row.name === 'Kept Root')).toMatchObject({
        id: kept.id,
        created_by: A.id,
        deleted_at: null,
      });
      expect(rows.find((row) => row.name === 'Dropped Root')).toMatchObject({ deleted_by: B.id });
      expect(rows.find((row) => row.name === 'Added Root')).toMatchObject({ created_by: B.id });
    });

    it('writes them in the same transaction as the ingredient', async () => {
      const id = await seed(local({ folkNames: ['Dropped Root'] }));
      const before = await writtenBy(id);

      await updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ folkNames: ['Added Root'] })),
      );

      const after = await writtenBy(id);
      // Precondition: the update is a new transaction, not the seed's.
      expect(after).not.toBe(before);
      for (const row of await folkNameRows(id)) {
        if (row.name === 'Dropped Root') expect(row.xmin).toBe(after);
        if (row.name === 'Added Root') expect(row.xmin).toBe(after);
      }
    });

    it('takes a change of case as a new name', async () => {
      const id = await seed(local({ folkNames: ['test root'] }));

      await updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ folkNames: ['Test Root'] })),
      );

      expect(await liveNames(id)).toEqual(['Test Root']);
    });
  });
});

describe('deleteWorkspaceIngredient', () => {
  // A member stands for the owner too, as on create.
  it('lets a member soft-delete one, stamping deleted_by and keeping the row', async () => {
    const user = B;
    const id = await seed(local());

    await deleteWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, id);

    const row = await rowOf(id);
    expect(row).toMatchObject({
      workspace_id: WORKSPACE_W_ID,
      created_by: A.id,
      deleted_by: user.id,
    });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

  it('refuses a viewer and leaves the row as it was', async () => {
    const id = await seed(local());
    const before = await rowOf(id);
    // Why it could have succeeded: the row is live and C can read it.
    await expect(getWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id)).resolves.toBeDefined();

    await expect(deleteWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id)).rejects.toThrow(
      Forbidden,
    );
    expect(await rowOf(id)).toEqual(before);
  });

  it('does not reach another coven’s ingredient by direct id', async () => {
    const id = await seed(local());
    const before = await rowOf(id);
    // Why it could have succeeded: the id is live, and W's own member reaches it.
    await expect(getWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id)).resolves.toMatchObject({
      id,
    });

    await expect(deleteWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, id)).rejects.toThrow(
      NotFound,
    );
    await expect(deleteWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, id)).rejects.toThrow(
      Forbidden,
    );
    expect(await rowOf(id)).toEqual(before);
  });

  it('refuses the site admin, whose role reaches no coven', async () => {
    const id = await seed(local());
    const before = await rowOf(id);
    expect(asUser(E).role).toBe('admin');

    await expect(deleteWorkspaceIngredient(asUser(E), WORKSPACE_W_ID, id)).rejects.toThrow(
      Forbidden,
    );
    expect(await rowOf(id)).toEqual(before);
  });

  it('does not reach a compendium entry, and leaves it as it was', async () => {
    const id = await seed(makeIngredient());
    const before = await rowOf(id);

    await expect(deleteWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, id)).rejects.toThrow(
      NotFound,
    );
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an ingredient already deleted, leaving who deleted it', async () => {
    const id = await seed(local());
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await rowOf(id);

    await expect(deleteWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id)).rejects.toThrow(
      NotFound,
    );
    expect(await rowOf(id)).toEqual(before);
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      deleteWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, '99999999-9999-9999-9999-999999999999'),
    ).rejects.toThrow(NotFound);
    await expect(
      deleteWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, 'not-an-ingredient'),
    ).rejects.toThrow(NotFound);
  });
});
