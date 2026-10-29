import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findIngredientsInSpellsIncludingSoftDeleted } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { NotFound, ValidationError } from '@/lib/errors';
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
  variantsOf,
} from '@/modules/ingredients';
import { assertMembership } from '@/modules/coven';
import {
  suggestDeities,
  suggestForms,
  suggestCelestialBodies,
  suggestZodiacSigns,
} from '@/modules/vocabulary';
import type { PageRequest } from '@/lib/types';
import { A, B, C, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { insertSpell } from '../../../support/db/insert-spell';
import { type IngredientFixture, makeSpell, makeVariant } from '../../../support/fixtures';
import { inputOf, local } from '../../../support/workspace-ingredient-input';

// Story 25 in the coven, split from workspace-ingredients.test.ts: what a
// deleted coven ingredient leaves in each read. The table is emptied per test,
// so every row a result could come from is one this file wrote.

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
    // The fixture's own form, a variant since MB.216.
    [
      'its variants',
      async (id) => {
        const [forms] = await variantsOf(member, ref(id));
        return Array.isArray(forms) && forms.length > 0;
      },
    ],
    // A new link cannot reach a deleted ingredient, as a new spell layer cannot.
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
        (await suggestForms(member, WORKSPACE_W_ID, 'testform', PAGE)).some(({ node }) =>
          node.claimants.some((claimant) => claimant.name === 'Testwort'),
        ),
    ],
    [
      'the celestial body suggestions',
      async () =>
        (await suggestCelestialBodies(member, WORKSPACE_W_ID, 'fixture star', PAGE)).some(
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
        celestialBodies: ['Fixture Star'],
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
    await insertSpell(sql, makeSpell({ steps: [{ ingredientId: id }] }), A.id);

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    // Why only the spell could still answer it: the coven's own read has let it go.
    await expect(getWorkspaceIngredient(member, WORKSPACE_W_ID, id)).rejects.toThrow(NotFound);
    const viewer = await assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] });
    await expect(findIngredientsInSpellsIncludingSoftDeleted(viewer, [id])).resolves.toEqual([
      expect.objectContaining({ id, deletedBy: B.id }),
    ]);
  });

  // A layer is the spell's, and leaves it only when a member takes it out.
  it('leaves every layer holding it as it was', async () => {
    const id = await seed(local());
    const spellId = await insertSpell(sql, makeSpell({ steps: [{ ingredientId: id }] }), A.id);
    const layerOf = async () => {
      const [layer] = await sql`select * from spell_steps where spell_id = ${spellId}`;
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
    const again = inputOf(local({ variants: [makeVariant({ form: 'Testroot' })] }));
    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).rejects.toMatchObject({
      issues: [{ path: ['name'] }],
    });

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).resolves.toMatchObject({
      name: 'Testwort',
    });
  });

  it('frees its formal name, for an ingredient under another label', async () => {
    const id = await seed(local({ canonicalName: 'Fixtura testalis' }));
    const again = inputOf(local({ name: 'Fixture Leaf', canonicalName: 'Fixtura testalis' }));
    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).rejects.toMatchObject({
      issues: [{ path: ['canonicalName'] }],
    });

    await deleteWorkspaceIngredient(member, WORKSPACE_W_ID, id);

    await expect(createWorkspaceIngredient(member, WORKSPACE_W_ID, again)).resolves.toMatchObject({
      name: 'Fixture Leaf',
      canonicalName: 'Fixtura testalis',
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
