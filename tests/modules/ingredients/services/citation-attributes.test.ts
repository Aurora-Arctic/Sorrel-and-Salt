import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import {
  createCompendiumEntry,
  createReference,
  createWorkspaceIngredient,
  referencesOf,
  updateCompendiumEntry,
  updateReference,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import type { ReferenceLinkFields } from '@/modules/ingredients/validation/types';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { curatedFormId } from '../../../support/db/curated-ids';
import { insertReference } from '../../../support/db/insert-reference';
import { makeIngredient, makeVariant, variantInput } from '../../../support/fixtures';

// A compendium citation records how it names the ingredient (`nameBasis`) and the fields it backs (`supports`), and a compendium source
// whether it is scholarly. A curator writes all three; a coven's citation and a coven's source carry none, each refused with a reason.
// Both tables are emptied per test, so every row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
});

const compendiumBook = (title = 'Fixture Herbal') => insertReference(sql, { title }, E.id);
const covenBook = (title = 'Coven Notes') =>
  insertReference(sql, { workspace_id: WORKSPACE_W_ID, title }, A.id);

/** A stub ingredient as either service takes it, citing `references`, with `variants` as its forms. */
const input = (
  references: ReferenceLinkFields[],
  variants: ReturnType<typeof variantInput>[] = [],
  name = 'Testwort',
) => ({ name, nomenclature: 'none' as const, references, variants });

/** A Herb form citing `references`: picked from the curated forms by `formId` in the compendium, typed in a coven. */
const formCiting = (references: ReferenceLinkFields[], formId = '') =>
  variantInput(makeVariant({ form: 'Herb' }), { formId, references });

/** Every live link of the ingredient or one of its forms, with the two attributes. */
const links = (ingredientId: string) => sql`
  select l.id, l.name_basis, l.supports
    from reference_links l
    left join ingredient_variants v on v.id = l.ingredient_variant_id
   where (l.ingredient_id = ${ingredientId} or v.ingredient_id = ${ingredientId})
     and l.deleted_at is null
   order by l.ingredient_id nulls last`;

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe("a compendium entry's citation", () => {
  it('stores the name basis and the fields it supports, on the entry and on a form, and reads them back', async () => {
    const book = await compendiumBook();

    const created = await createCompendiumEntry(
      asUser(F),
      input(
        [{ referenceId: book, locator: 'p. 9', nameBasis: 'stated', supports: ['description'] }],
        [
          formCiting(
            [{ referenceId: book, nameBasis: 'resolved', supports: ['form'] }],
            await curatedFormId(sql, 'Herb'),
          ),
        ],
      ),
    );

    expect(await links(created.id)).toEqual([
      expect.objectContaining({ name_basis: 'stated', supports: ['description'] }),
      expect.objectContaining({ name_basis: 'resolved', supports: ['form'] }),
    ]);
    const [cited] = await referencesOf(asUser(F), [{ id: created.id, workspaceId: null }]);
    if (cited instanceof Error) throw cited;
    expect(cited).toEqual([
      expect.objectContaining({ locator: 'p. 9', nameBasis: 'stated', supports: ['description'] }),
    ]);
  });

  it('rewrites a changed attribute on the link it has, not a new one', async () => {
    const book = await compendiumBook();
    const created = await createCompendiumEntry(
      asUser(F),
      input([{ referenceId: book, nameBasis: 'stated', supports: ['description'] }]),
    );
    const [before] = await links(created.id);

    await updateCompendiumEntry(
      asUser(F),
      created.id,
      input([{ referenceId: book, nameBasis: 'unaudited', supports: ['description', 'toxic'] }]),
    );

    expect(await links(created.id)).toEqual([
      { id: before.id, name_basis: 'unaudited', supports: ['description', 'toxic'] },
    ]);
  });

  it('refuses a field the cited row does not have: a form on the entry, a deity on a form', async () => {
    const book = await compendiumBook();

    const issues = await refusal(
      createCompendiumEntry(
        asUser(F),
        input(
          [{ referenceId: book, supports: ['description', 'form'] }],
          [
            formCiting(
              [{ referenceId: book, supports: ['deities'] }],
              await curatedFormId(sql, 'Herb'),
            ),
          ],
        ),
      ),
    );

    expect(issues.map(({ path }) => path)).toEqual([
      ['variants', 0, 'references', 0, 'supports', 0],
      ['references', 0, 'supports', 1],
    ]);
    const [{ count }] = await sql`select count(*)::int as count from ingredients`;
    expect(count).toBe(0);
  });
});

describe("a coven's citation", () => {
  // Why each could have saved: the curator's write of the same citation lands, and the coven's without the attribute does.
  it('refuses a name basis or supports, on the entry and on a form, with a reason', async () => {
    const book = await compendiumBook();
    const plain = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input([{ referenceId: book }], [formCiting([{ referenceId: book }])]),
    );
    expect(await links(plain.id)).toHaveLength(2);

    const issues = await refusal(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input(
          [{ referenceId: book, nameBasis: 'stated', supports: ['description'] }],
          [formCiting([{ referenceId: book, supports: ['form'] }])],
          'Samplewort',
        ),
      ),
    );

    expect(issues.map(({ path }) => path)).toEqual([
      ['references', 0, 'nameBasis'],
      ['references', 0, 'supports'],
      ['variants', 0, 'references', 0, 'supports'],
    ]);
    for (const { message } of issues) expect(message).toMatch(/compendium/i);
    const [{ count }] = await sql`select count(*)::int as count from ingredients`;
    expect(count).toBe(1);
  });

  it('refuses them on an update by id, leaving the link as it was', async () => {
    const book = await covenBook();
    const id = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' }),
      A.id,
    );
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([{ referenceId: book }]));

    const issues = await refusal(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input([{ referenceId: book, nameBasis: 'unresolved' }]),
      ),
    );

    expect(issues).toEqual([{ path: ['references', 0, 'nameBasis'], message: expect.any(String) }]);
    expect(await links(id)).toEqual([
      expect.objectContaining({ name_basis: null, supports: null }),
    ]);
  });
});

describe('a scholarly source', () => {
  it('is marked by a curator in the compendium, and cleared when an update leaves it out', async () => {
    const created = await createReference(asUser(F), null, {
      kind: 'book',
      title: 'Fixture Pharmacopoeia',
      published: '2001',
      scholarly: true,
    });
    expect(created.scholarly).toBe(true);

    const updated = await updateReference(asUser(F), null, created.id, {
      kind: 'book',
      title: 'Fixture Pharmacopoeia',
      published: '2001',
    });
    expect(updated.scholarly).toBe(false);
  });

  // Why it could have saved: B writes this coven's sources, as the unmarked create shows.
  it("is refused on a coven's source, at create and on an update by id, with a reason", async () => {
    const source = { kind: 'book' as const, title: 'Coven Notes', published: '2001' };
    const plain = await createReference(asUser(B), WORKSPACE_W_ID, source);
    expect(plain.scholarly).toBe(false);

    const created = await refusal(
      createReference(asUser(B), WORKSPACE_W_ID, { ...source, scholarly: true }),
    );
    const updated = await refusal(
      updateReference(asUser(B), WORKSPACE_W_ID, plain.id, { ...source, scholarly: true }),
    );

    for (const issues of [created, updated]) {
      expect(issues).toEqual([
        { path: ['scholarly'], message: expect.stringMatching(/compendium/i) },
      ]);
    }
    const rows =
      await sql`select scholarly from "references" where workspace_id = ${WORKSPACE_W_ID}`;
    expect(rows).toEqual([{ scholarly: false }]);
  });
});
