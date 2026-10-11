import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findIngredientsInSpellsIncludingSoftDeleted } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import {
  categoriesOf,
  createWorkspaceIngredient,
  deitiesOf,
  deleteWorkspaceIngredient,
  findPossibleDuplicates,
  folkNamesOf,
  getIngredient,
  getWorkspaceIngredient,
  referencesOf,
  substitutesOf,
  suggestCommonNames,
  suggestIngredients,
  updateWorkspaceIngredient,
  variantsOf,
} from '@/modules/ingredients';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { assertMembership } from '@/modules/coven';
import {
  suggestDeities,
  suggestForms,
  suggestPlanets,
  suggestZodiacSigns,
} from '@/modules/vocabulary';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertVariant } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import {
  liveFormsOf,
  variantChildrenOf,
  variantIdOf,
  variantRowsOf,
} from '../../../support/db/read-variants';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeSpell,
} from '../../../support/fixtures';

// Story 15's service: a coven's own ingredients, written by its owners and
// members and read by its members, never by anyone else. The table is emptied
// per test, so every row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** A W-local fixture: no formal name, and so `none`, unless one is stated. */
function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

/**
 * The fixture as the service's input: everything but the tier and the
 * category names, its substitutes and deities typed.
 */
function inputOf(fixture: IngredientFixture): LocalIngredientInput {
  const { workspaceId: _tier, categories: _categories, substitutes, deities, ...input } = fixture;
  return {
    ...input,
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

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
  it.each([
    ['an owner', A],
    ['a member', B],
  ])('lets %s create one, in their own coven and stamped by them', async (_role, user) => {
    const created = await createWorkspaceIngredient(
      asUser(user),
      WORKSPACE_W_ID,
      inputOf(local({ form: 'root' })),
    );

    expect(created).toMatchObject({
      workspaceId: WORKSPACE_W_ID,
      name: 'Testwort',
      nomenclature: 'none',
      canonicalName: null,
      form: 'root',
      createdBy: user.id,
      updatedBy: user.id,
    });
    expect(created.slug).toBe(ingredientSlug('Testwort', 'root', null));
  });

  // DESIGN.md §5 (MB.134): as many of each as the practice gives it, in the
  // member's order, and never into `element`, the single its list replaced.
  it('saves several elements, planets, signs and colours, each in the order entered', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...inputOf(local()),
      elements: ['water', 'earth'],
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', ' ', 'Silver'],
    });

    expect(created).toMatchObject({
      elements: ['water', 'earth'],
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', 'Silver'],
    });
    expect(await rowOf(created.id)).toMatchObject({
      elements: ['water', 'earth'],
      planets: ['Venus', 'Moon'],
      zodiac_signs: ['Taurus', 'Cancer', 'Libra'],
      colors: ['Green', 'Silver'],
    });
  });

  it('defaults a stub with only a name to `none`, as story 29 saves it', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
    } as LocalIngredientInput);

    expect(created).toMatchObject({ nomenclature: 'none', canonicalName: null, form: null });
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
  it.each([
    ['the compendium', null],
    ['another coven', WORKSPACE_X_ID],
  ])('ignores a workspaceId naming %s in the input', async (_where, workspaceId) => {
    const input = { ...inputOf(local()), workspaceId } as LocalIngredientInput;

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

  it('leaves no folk name behind when the ingredient write fails', async () => {
    await seed(local({ name: 'Testwort' }));

    // The second Testwort in W breaks the label index, after its folk names were parsed.
    await expect(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        inputOf(local({ name: 'testwort', folkNames: ['Orphan Root'] })),
      ),
    ).rejects.toThrow();

    const [orphans] = await sql`
      select count(*)::int as n from ingredient_folk_names where name = ${'Orphan Root'}`;
    expect(orphans.n).toBe(0);
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

  it('refuses a label already in the coven, whatever its case, on `name`', async () => {
    await seed(local({ name: 'Testwort', form: 'herb' }));

    expect(await issuesOf(create({ name: 'testwort', form: 'root' }))).toEqual([
      { path: ['name'], message: expect.any(String) },
    ]);
    expect(await countIngredients()).toBe(1);
  });

  it('refuses a formal name and form already in the coven, on `canonicalName`', async () => {
    await seed(local({ name: 'Testwort', canonicalName: 'Fixtura testalis', form: 'herb' }));

    expect(
      await issuesOf(
        create({ name: 'Fixture Leaf', canonicalName: 'Fixtura testalis', form: 'herb' }),
      ),
    ).toEqual([{ path: ['canonicalName'], message: expect.any(String) }]);
  });

  it('refuses an identity that is only a label on `name`, since the label is the identity', async () => {
    await seed(local({ name: 'Testwort', form: 'root' }));

    const [issue] = await issuesOf(create({ name: 'testwort', form: 'root' }));

    expect(issue.path).toEqual(['name']);
  });

  it('refuses a name whose address another ingredient already has, on `name`', async () => {
    await seed(local({ name: 'Testwort', form: 'root' }));

    // Why only the slug index is left to catch it: label and identity both differ.
    expect(ingredientSlug('Testwort Root', null, null)).toBe(
      ingredientSlug('Testwort', 'root', null),
    );

    expect(await issuesOf(create({ name: 'Testwort Root', form: null }))).toEqual([
      { path: ['name'], message: expect.any(String) },
    ]);
  });

  it('refuses a relabel onto a label already in the coven, leaving the row as it was', async () => {
    await seed(local({ name: 'Taken Wort' }));
    const id = await seed(local());

    const issues = await issuesOf(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ name: 'taken wort' })),
      ),
    );

    expect(issues).toEqual([{ path: ['name'], message: expect.any(String) }]);
    expect((await rowOf(id)).name).toBe('Testwort');
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
      inputOf(local({ name: 'Testroot', form: 'root', description: 'Dug at dusk' })),
    );

    expect(updated).toMatchObject({
      id,
      name: 'Testroot',
      form: 'root',
      description: 'Dug at dusk',
      createdBy: A.id,
      updatedBy: B.id,
    });
  });

  // No route reads a coven ingredient's slug, so it follows the name and
  // nothing redirects from the old one (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").
  it('moves the slug with the label, form and formal name, retiring nothing', async () => {
    const id = await seed(local());

    const updated = await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      inputOf(local({ name: 'Testroot', form: 'root', canonicalName: 'Fixtura radix' })),
    );

    expect(updated.slug).toBe(ingredientSlug('Testroot', 'root', 'Fixtura radix'));
    const [{ n }] = await sql`select count(*)::int as n from retired_ingredient_slugs`;
    expect(n).toBe(0);
  });

  it("refuses a rewrite onto another of the coven's addresses, on `name`, leaving the row", async () => {
    await seed(local({ name: 'Testwort', form: 'root' }));
    const id = await seed(local({ name: 'Testleaf', form: 'leaf' }));
    const before = await rowOf(id);
    // Why only the slug index is left to catch it: label and identity both differ.
    expect(ingredientSlug('Testwort Root', null, null)).toBe(
      ingredientSlug('Testwort', 'root', null),
    );

    await expect(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        inputOf(local({ name: 'Testwort Root', form: null })),
      ),
    ).rejects.toMatchObject({ issues: [{ path: ['name'] }] });
    expect(await rowOf(id)).toEqual(before);
  });

  // The input is the whole ingredient as the form submits it, so a field left
  // out is cleared rather than kept.
  it('replaces the whole row, clearing a field the input leaves out', async () => {
    const id = await seed(local({ description: 'Dug at dusk', colors: ['Green'] }));

    const updated = await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, {
      name: 'Testwort',
    } as LocalIngredientInput);

    expect(updated).toMatchObject({ description: null, colors: null, form: null });
  });

  it('replaces each list whole, an empty one clearing it', async () => {
    const id = await seed(
      local({
        elements: ['earth', 'water'],
        planets: ['Moon', 'Venus'],
        zodiacSigns: ['Cancer'],
        colors: ['Silver', 'White'],
      }),
    );

    const updated = await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, {
      ...inputOf(local()),
      elements: ['air', 'earth'],
      planets: ['Mars'],
      zodiacSigns: [],
      colors: ['White', 'Silver'],
    });

    expect(updated).toMatchObject({
      elements: ['air', 'earth'],
      planets: ['Mars'],
      zodiacSigns: null,
      colors: ['White', 'Silver'],
    });
    expect(await rowOf(id)).toMatchObject({
      elements: ['air', 'earth'],
      planets: ['Mars'],
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

    it('rolls them back with the ingredient when the ingredient write fails', async () => {
      await seed(local({ name: 'Taken Wort' }));
      const id = await seed(local({ folkNames: ['Kept Root'] }));

      await expect(
        updateWorkspaceIngredient(
          asUser(B),
          WORKSPACE_W_ID,
          id,
          inputOf(local({ name: 'taken wort', folkNames: ['Added Root'] })),
        ),
      ).rejects.toThrow();

      expect(await liveNames(id)).toEqual(['Kept Root']);
      expect((await rowOf(id)).name).toBe('Testwort');
    });
  });
});

describe('deleteWorkspaceIngredient', () => {
  it.each([
    ['an owner', A],
    ['a member', B],
  ])('lets %s soft-delete one, stamping deleted_by and keeping the row', async (_role, user) => {
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

// Story 25 in the coven: a deleted ingredient is gone from every read its
// members make, and what it held is free again (claude-docs/db/workspace-ingredients.md,
// "Workspace ingredients").
describe('a deleted coven ingredient', () => {
  /** Room for every row a test here writes, so one page is the whole answer. */
  const PAGE: PageRequest = { limit: 26, inverted: false };
  const member = asUser(B);
  const ref = (id: string) => [{ id, workspaceId: WORKSPACE_W_ID }];

  /** Whether `read` answers, rather than refusing with NotFound. */
  const answers = <T>(read: Promise<T>, shows: (answer: T) => boolean) =>
    read.then(shows, (error: unknown) => {
      if (error instanceof NotFound) return false;
      throw error;
    });

  // Every exported read a member reaches the coven's own ingredients through,
  // each asked whether it still shows this one: what owns the soft-delete
  // filter of each, so no reader carries a one-off of its own.
  const READS: [string, (id: string) => Promise<boolean>][] = [
    [
      'a read by id',
      (id) => answers(getWorkspaceIngredient(member, WORKSPACE_W_ID, id), (row) => row.id === id),
    ],
    [
      'a read by id naming the coven',
      (id) => answers(getIngredient(member, id, WORKSPACE_W_ID), (row) => row.id === id),
    ],
    [
      'its folk names',
      async (id) => {
        const [names] = await folkNamesOf(member, ref(id));
        return Array.isArray(names) && names.length > 0;
      },
    ],
    [
      'its categories',
      async (id) => {
        const [filed] = await categoriesOf(member, ref(id));
        return Array.isArray(filed) && filed.length > 0;
      },
    ],
    [
      'its substitutes',
      async (id) => {
        const [listed] = await substitutesOf(member, ref(id));
        return Array.isArray(listed) && listed.length > 0;
      },
    ],
    [
      'its deities',
      async (id) => {
        const [listed] = await deitiesOf(member, ref(id));
        return Array.isArray(listed) && listed.length > 0;
      },
    ],
    [
      'its references',
      async (id) => {
        const [cited] = await referencesOf(member, ref(id));
        return Array.isArray(cited) && cited.length > 0;
      },
    ],
    // The fixture's own form, a variant since MB.216 (MB.218).
    [
      'its variants',
      async (id) => {
        const [forms] = await variantsOf(member, ref(id));
        return Array.isArray(forms) && forms.length > 0;
      },
    ],
    // A new link cannot reach a deleted ingredient, as a new spell layer cannot (M5.3).
    [
      'the substitute picker',
      async (id) =>
        (await suggestIngredients(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(
          ({ node }) => node.id === id,
        ),
    ],
    [
      'the duplicate warning',
      async (id) =>
        (await findPossibleDuplicates(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(
          ({ node }) => node.id === id,
        ),
    ],
    [
      'the common-name suggestions',
      async () =>
        (await suggestCommonNames(member, WORKSPACE_W_ID, 'Testwort', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      'the form suggestions',
      async () =>
        (await suggestForms(member, WORKSPACE_W_ID, 'herb', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      'the planet suggestions',
      async () =>
        (await suggestPlanets(member, WORKSPACE_W_ID, 'fixture star', PAGE)).some(
          ({ node }) => node.value === 'Fixture Star',
        ),
    ],
    [
      'the sign suggestions',
      async () =>
        (await suggestZodiacSigns(member, WORKSPACE_W_ID, 'fixture sign', PAGE)).some(
          ({ node }) => node.value === 'Fixture Sign',
        ),
    ],
    [
      'the deity suggestions',
      async () =>
        (await suggestDeities(member, WORKSPACE_W_ID, 'fixture deity', PAGE)).some(
          ({ node }) => node.value === 'Fixture Deity',
        ),
    ],
  ];

  it.each(READS)('is gone from %s, which showed it until the delete', async (_read, shows) => {
    const id = await seed(
      local({
        folkNames: ['Test Root'],
        categories: ['Protection'],
        substitutes: ['Fixture Stand-in'],
        deities: ['Fixture Deity'],
        planets: ['Fixture Star'],
        zodiacSigns: ['Fixture Sign'],
      }),
    );
    await insertReferenceLink(sql, id, await insertReference(sql, {}, A.id), A.id);
    // Why the read could have gone on showing it: it does, until the delete.
    expect(await shows(id)).toBe(true);

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    expect(await shows(id)).toBe(false);
  });

  // A spell is a record of a working: what went into the jar stays in it
  // (claude-docs/db/spell-visibility.md, "What a spell holds").
  it('stays in a spell that holds it, for every member who may read the spell', async () => {
    const id = await seed(local());
    await insertSpell(sql, makeSpell({ layers: [{ ingredientId: id }] }), A.id);

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    // Why only the spell could still answer it: the coven's own read has let it go.
    await expect(getWorkspaceIngredient(member, WORKSPACE_W_ID, id)).rejects.toThrow(NotFound);
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] });
    await expect(findIngredientsInSpellsIncludingSoftDeleted(viewer, [id])).resolves.toEqual([
      expect.objectContaining({ id, deletedBy: B.id }),
    ]);
  });

  // A layer is the spell's, and leaves it only when a member takes it out (MB.110).
  it('leaves every layer holding it as it was', async () => {
    const id = await seed(local());
    const spellId = await insertSpell(sql, makeSpell({ layers: [{ ingredientId: id }] }), A.id);
    const layerOf = async () => {
      const [layer] = await sql`select * from spell_ingredients where spell_id = ${spellId}`;
      return layer;
    };
    const before = await layerOf();

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    // Why the layer could have been touched: what it holds is a tombstone now.
    const [ingredient] = await sql`select deleted_at from ingredients where id = ${id}`;
    expect(ingredient.deleted_at).toBeInstanceOf(Date);
    const after = await layerOf();
    expect(after.deleted_at).toBeNull();
    expect(after).toEqual(before);
  });

  // The coven's three partial indexes, each shown to be what stood in the way
  // while the ingredient was live. Inside a coven the label is unique too, so
  // here a label coming back does prove its index's predicate.
  it('frees its label, for an ingredient of another form', async () => {
    const id = await seed(local());
    const again = inputOf(local({ form: 'root' }));
    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).rejects.toMatchObject({
      issues: [{ path: ['name'] }],
    });

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).resolves.toMatchObject({
      name: 'Testwort',
      form: 'root',
    });
  });

  it('frees its formal name and form, for an ingredient under another label', async () => {
    const id = await seed(local({ canonicalName: 'Fixtura testalis' }));
    const again = inputOf(local({ name: 'Fixture Leaf', canonicalName: 'Fixtura testalis' }));
    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).rejects.toMatchObject({
      issues: [{ path: ['canonicalName'] }],
    });

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).resolves.toMatchObject({
      name: 'Fixture Leaf',
      canonicalName: 'Fixtura testalis',
      form: 'herb',
    });
  });

  it('frees its address too, so the whole ingredient can be added again', async () => {
    const id = await seed(local());
    await expect(
      createWorkspaceIngredient(member, WORKSPACE_W_ID, inputOf(local())),
    ).rejects.toThrow(ValidationError);

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);
    const created = await createWorkspaceIngredient(member, WORKSPACE_W_ID, inputOf(local()));

    expect(created.id).not.toBe(id);
    expect(created.slug).toBe((await rowOf(id)).slug);
  });
});

// MB.219: an ingredient's forms are written inside its own save, each with its
// own substitutes, references and categories (DESIGN.md §5, "Variants are
// written inside the ingredient's save"). What the schema refuses is
// `validation/ingredient.test.ts`'s; what is read back is MB.218's.
describe('its forms', () => {
  let protection: string;
  let love: string;
  beforeEach(async () => {
    const rows = await sql`
      select name, id from categories where name in ('Protection', 'Love') and deleted_at is null`;
    const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
    protection = byName.get('Protection') as string;
    love = byName.get('Love') as string;
  });

  /** One whole form as the input sends it: every field, `overrides` over blanks. */
  const formOf = (overrides: Record<string, unknown>) => ({
    form: 'Testleaf',
    formId: '',
    description: '',
    safetyNotes: '',
    elements: [],
    planets: [],
    zodiacSigns: [],
    colors: [],
    categoryIds: [],
    substitutes: [],
    references: [],
    ...overrides,
  });

  /** The fixture's input with `variants` sent in place of its top-level form. */
  const withForms = (...variants: Record<string, unknown>[]) => ({
    ...inputOf(local({ form: null })),
    variants: variants.map(formOf),
  });

  /** A compendium entry, with its fixture form a variant: what a coven's substitute may link. */
  async function compendiumEntry(name: string) {
    const id = await seed(makeIngredient({ name, canonicalName: null, nomenclature: 'none' }));
    return { id, herb: await variantIdOf(sql, id, 'herb') };
  }

  it('creates two forms with the ingredient, each with its own categories, substitutes and references', async () => {
    const testroot = await compendiumEntry('Testroot');
    const source = await insertReference(sql, {}, A.id);

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms(
        {
          form: 'Testleaf',
          description: 'Pressed.',
          planets: ['Venus'],
          categoryIds: [protection],
          substitutes: [
            { ingredientId: testroot.id, substituteVariantId: testroot.herb },
            { name: 'Mock Root' },
          ],
          references: [{ referenceId: source, locator: 'p. 3' }],
        },
        { form: 'Testoil', safetyNotes: 'Dilute.', categoryIds: [love] },
      ),
    );

    const [leaf, oil] = await variantRowsOf(sql, created.id);
    expect([leaf, oil]).toMatchObject([
      { form: 'Testleaf', description: 'Pressed.', planets: ['Venus'], deleted_at: null },
      { form: 'Testoil', safety_notes: 'Dilute.', deleted_at: null },
    ]);
    // The dual write, until MB.222: the row mirrors its first form.
    expect((await rowOf(created.id)).form).toBe('Testleaf');
    expect(await variantChildrenOf(sql, leaf.id)).toMatchObject({
      categories: [{ ingredient_id: created.id, category_id: protection }],
      substitutes: [
        { substitute_id: null, name: 'Mock Root' },
        { substitute_id: testroot.id, substitute_variant_id: testroot.herb, name: null },
      ],
      // A form's link names the form alone.
      references: [{ ingredient_id: null, reference_id: source, locator: 'p. 3' }],
    });
    expect((await variantChildrenOf(sql, oil.id)).categories).toMatchObject([
      { category_id: love },
    ]);
    // The ingredient's own lists stay its own: nothing was filed on it.
    expect(
      await sql`select 1 from ingredient_categories where ingredient_id = ${created.id} and variant_id is null`,
    ).toHaveLength(0);
  });

  it('keeps a form by its id across a respelling, and one sent without an id by its text, drops the one left out and adds the new', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms(
        { form: 'Testleaf', categoryIds: [protection] },
        { form: 'Testoil', substitutes: [{ name: 'Mock Root' }] },
        { form: 'Testresin' },
      ),
    );
    const before = await variantRowsOf(sql, created.id);
    const id = (form: string) => before.find((row) => row.form === form)?.id as string;

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      withForms(
        { id: id('Testleaf'), form: 'Testleaves', categoryIds: [protection] },
        { form: ' TESTRESIN ' },
        { form: 'Testpowder' },
      ),
    );

    const after = await variantRowsOf(sql, created.id);
    expect(after.find((row) => row.id === id('Testleaf'))).toMatchObject({
      form: 'Testleaves',
      deleted_at: null,
    });
    expect(after.find((row) => row.id === id('Testresin'))).toMatchObject({
      form: 'TESTRESIN',
      deleted_at: null,
    });
    expect(after.find((row) => row.id === id('Testoil'))).toMatchObject({ deleted_by: B.id });
    expect(after.find((row) => row.form === 'Testpowder')).toMatchObject({ deleted_at: null });
    expect(after).toHaveLength(4);
    // The dropped form keeps its children for a restore; the kept, its pair.
    expect((await variantChildrenOf(sql, id('Testoil'))).substitutes).toMatchObject([
      { name: 'Mock Root' },
    ]);
    expect((await variantChildrenOf(sql, id('Testleaf'))).categories).toMatchObject([
      { category_id: protection },
    ]);
  });

  it("refuses a substitute's form that is not of the ingredient it links, on that form, writing nothing", async () => {
    const testroot = await compendiumEntry('Testroot');
    const mockwort = await compendiumEntry('Mockwort');
    const naming = (ingredientId: string) =>
      withForms({ substitutes: [{ ingredientId, substituteVariantId: mockwort.herb }] });
    // Why it could have saved: the form is live, and is Mockwort's.
    await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...naming(mockwort.id),
      name: 'Testwort, kept',
    });

    const attempt = createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, naming(testroot.id));

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [{ path: ['variants', 0, 'substitutes', 0, 'substituteVariantId'] }],
    });
    expect(await countIngredients()).toBe(3);
  });

  // MB.217's narrowed `not_itself`: the same ingredient and the same form.
  it('lets a form name a sibling form as its substitute, refusing the form itself on that entry', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms({ form: 'Testleaf' }, { form: 'Testoil' }),
    );
    const [leaf, oil] = await variantRowsOf(sql, created.id);
    const naming = (form: string) =>
      withForms(
        { id: leaf.id, form: 'Testleaf' },
        {
          id: oil.id,
          form: 'Testoil',
          substitutes: [{ ingredientId: created.id, substituteVariantId: form }],
        },
      );

    const attempt = updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      naming(oil.id),
    );
    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      issues: [{ path: ['variants', 1, 'substitutes', 0] }],
    });

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, naming(leaf.id));
    expect((await variantChildrenOf(sql, oil.id)).substitutes).toMatchObject([
      { substitute_id: created.id, substitute_variant_id: leaf.id },
    ]);
  });

  it('keeps a substitute link that names another form of what it links, in place', async () => {
    const testroot = await compendiumEntry('Testroot');
    const rootOil = await insertVariant(sql, testroot.id, { form: 'Testoil' }, A.id);
    const naming = (form: string) =>
      withForms({ substitutes: [{ ingredientId: testroot.id, substituteVariantId: form }] });
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      naming(testroot.herb),
    );
    const leaf = await variantIdOf(sql, created.id, 'Testleaf');
    const [before] = await sql`
      select id from ingredient_substitutes where variant_id = ${leaf}`;

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, {
      ...naming(rootOil),
      variants: [{ ...naming(rootOil).variants[0], id: leaf }],
    });

    expect(
      await sql`
        select id, substitute_variant_id from ingredient_substitutes
        where variant_id = ${leaf} and deleted_at is null`,
    ).toEqual([{ id: before.id, substitute_variant_id: rootOil }]);
  });

  it('refuses a form another of its live forms still holds, on that entry, rather than the raw index error', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms({ form: 'Testleaf' }, { form: 'Testoil' }),
    );
    const [leaf, oil] = await variantRowsOf(sql, created.id);

    // Each kept row is rewritten in turn, so the first takes a form the second still holds.
    const attempt = updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      withForms({ id: leaf.id, form: 'Testoil' }, { id: oil.id, form: 'Testleaf' }),
    );

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toMatchObject({ issues: [{ path: ['variants', 0, 'form'] }] });
    expect(await liveFormsOf(sql, created.id)).toEqual(['Testleaf', 'Testoil']);
  });

  // A form's pair carries its ingredient too (MB.217), so a drop from the
  // ingredient's own list names the ingredient's pairs alone.
  it("drops a category from the ingredient's own list, leaving a form filed under it", async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      ...withForms({ form: 'Testleaf', categoryIds: [protection] }),
      categoryIds: [protection],
    });
    const leaf = await variantIdOf(sql, created.id, 'Testleaf');
    // Why the drop could reach it: both pairs name the ingredient and the category.
    expect(
      await sql`select variant_id from ingredient_categories
        where ingredient_id = ${created.id} and category_id = ${protection}`,
    ).toHaveLength(2);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, created.id, {
      ...withForms({ id: leaf, form: 'Testleaf', categoryIds: [protection] }),
      categoryIds: [],
    });

    expect(
      await sql`select variant_id from ingredient_categories where ingredient_id = ${created.id}`,
    ).toEqual([{ variant_id: leaf }]);
  });

  it('refuses a viewer, who reads its forms, and leaves them as they were', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      withForms({ form: 'Testleaf' }),
    );
    // Why it could have succeeded: C holds a live membership of W and reads the forms.
    const [forms] = await variantsOf(asUser(C), [{ id: created.id, workspaceId: WORKSPACE_W_ID }]);
    expect(forms).toMatchObject([{ form: 'Testleaf' }]);

    await expect(
      updateWorkspaceIngredient(
        asUser(C),
        WORKSPACE_W_ID,
        created.id,
        withForms({ form: 'Testoil' }),
      ),
    ).rejects.toThrow(Forbidden);
    expect(await liveFormsOf(sql, created.id)).toEqual(['Testleaf']);
  });

  it('writes no form and none of its children on a save that changes nothing', async () => {
    // The coven's own source, which a form's links are read back beside (MB.218).
    const source = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);
    const input = (ids: string[] = []) =>
      withForms(
        {
          id: ids[0],
          form: 'Testleaf',
          planets: ['Venus'],
          categoryIds: [protection],
          substitutes: [{ name: 'Mock Root' }],
          references: [{ referenceId: source, locator: 'p. 3' }],
        },
        { id: ids[1], form: 'Testoil' },
      );
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input());
    const rows = await variantRowsOf(sql, created.id);
    const written = async () =>
      Promise.all(
        rows.map(async (row) => ({
          row: (await variantRowsOf(sql, created.id)).find((other) => other.id === row.id)?.xmin,
          children: await variantChildrenOf(sql, row.id),
        })),
      );
    const before = await written();

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      input(rows.map((row) => row.id as string)),
    );

    // Why the comparison could fail: the ingredient row itself was rewritten.
    expect(await writtenBy(created.id)).not.toBe(before[0].row);
    expect(await written()).toEqual(before);
  });

  // The shim (MB.219 to MB.222): IngredientForm still sends one top-level form.
  it('saves a top-level form as its one form, kept across a save that sends it again', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      inputOf(local({ form: 'root' })),
    );
    const [root] = await variantRowsOf(sql, created.id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      created.id,
      inputOf(local({ form: 'Root', description: 'Dug.' })),
    );

    expect(await variantRowsOf(sql, created.id)).toMatchObject([
      { id: root.id, form: 'Root', deleted_at: null },
    ]);
    const bare = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      inputOf(local({ name: 'Formless', form: null })),
    );
    expect(await variantRowsOf(sql, bare.id)).toEqual([]);
  });
});
