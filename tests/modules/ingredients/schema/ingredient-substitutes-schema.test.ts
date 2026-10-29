import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientSubstitutes } from '@/modules/ingredients/schema/ingredient-substitutes';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { SubstituteEntry } from './types';

// DESIGN.md §5's `ingredient_substitutes`: one row per substitute,
// a link to an ingredient or a typed name, never both and never neither.
const OWN_COLUMNS = [
  'id',
  'ingredient_id',
  'variant_id',
  'substitute_id',
  'substitute_variant_id',
  'name',
];

const LINK_INDEX = 'ingredient_substitutes_link_unique';
const NAME_INDEX = 'ingredient_substitutes_name_unique';
const CHECK_LINK_OR_NAME = 'ingredient_substitutes_link_or_name';
const CHECK_NAME_NOT_BLANK = 'ingredient_substitutes_name_not_blank';
const CHECK_NOT_ITSELF = 'ingredient_substitutes_not_itself';
const CHECK_FORM_NEEDS_LINK = 'ingredient_substitutes_substitute_variant_has_link';
const SUBSTITUTE_VARIANT_KEY = 'ingredient_substitutes_substitute_variant_fk';

describe('ingredient_substitutes schema', () => {
  const { byName } = tableFacts(ingredientSubstitutes);

  // The full six, as folk names carry: a substitute is content, so removing
  // one leaves a tombstone ("The audit shape").
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

let MUGWORT: string;
let UNCARIA: string;
let ACACIA: string;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function compendiumIdOf(canonicalName: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients
    where workspace_id is null and canonical_name = ${canonicalName} and deleted_at is null
  `;
  if (!found) throw new Error(`The standard seed carries no compendium row for ${canonicalName}`);
  return found.id as string;
}

async function addSubstitute(ingredientId: string, entry: SubstituteEntry): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_substitutes ${sql({
      ingredient_id: ingredientId,
      variant_id: entry.variantId ?? null,
      substitute_id: entry.substituteId ?? null,
      substitute_variant_id: entry.substituteVariantId ?? null,
      name: entry.name ?? null,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return inserted.id as string;
}

beforeAll(async () => {
  MUGWORT = await compendiumIdOf('Artemisia vulgaris');
  UNCARIA = await compendiumIdOf('Uncaria tomentosa');
  ACACIA = await compendiumIdOf('Senegalia greggii');
});

beforeEach(async () => {
  await sql`truncate ingredient_substitutes`;
});

describe('ingredient_substitutes table', () => {
  describe('a substitute is a link or a name', () => {
    it('takes a link, or a name', async () => {
      await addSubstitute(UNCARIA, { substituteId: ACACIA });
      await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });

      const rows = await sql`
        select substitute_id, name from ingredient_substitutes
        where ingredient_id = ${UNCARIA} order by name nulls first
      `;
      expect(rows).toEqual([
        { substitute_id: ACACIA, name: null },
        { substitute_id: null, name: 'Devil’s Claw' },
      ]);
    });

    // 23514 is check_violation, named: the refusal is this CHECK's.
    it('refuses a row that is both', async () => {
      const error = await failureOf(
        addSubstitute(UNCARIA, { substituteId: ACACIA, name: 'Acacia' }),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_LINK_OR_NAME);
    });

    it('refuses a row that is neither', async () => {
      const error = await failureOf(addSubstitute(UNCARIA, {}));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_LINK_OR_NAME);
    });

    // A blank name satisfies `num_nonnulls` and names nothing.
    it('refuses a blank name', async () => {
      const error = await failureOf(addSubstitute(UNCARIA, { name: '   ' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_NAME_NOT_BLANK);
    });

    // The link above is why this could have succeeded: the same column takes
    // another ingredient's id.
    it('refuses a link to its own ingredient', async () => {
      const error = await failureOf(addSubstitute(UNCARIA, { substituteId: UNCARIA }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_NOT_ITSELF);
    });
  });

  // "No repeats": the shared schema refuses a repeat first,
  // so these indexes are the floor beneath it.
  describe('an ingredient lists a substitute once', () => {
    it('refuses a second live link to the same ingredient', async () => {
      await addSubstitute(UNCARIA, { substituteId: ACACIA });

      const error = await failureOf(addSubstitute(UNCARIA, { substituteId: ACACIA }));

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LINK_INDEX);
    });

    it('refuses a second live name folding alike', async () => {
      await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });

      const error = await failureOf(addSubstitute(UNCARIA, { name: 'DEVIL’S CLAW' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(NAME_INDEX);
    });

    // Why the refusals above are per ingredient, not global.
    it('lets two ingredients link the same one, and type the same name', async () => {
      await addSubstitute(UNCARIA, { substituteId: MUGWORT });
      await addSubstitute(ACACIA, { substituteId: MUGWORT });
      await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
      await addSubstitute(ACACIA, { name: 'Devil’s Claw' });

      const [{ count }] = await sql`select count(*)::int as count from ingredient_substitutes`;
      expect(count).toBe(4);
    });

    // One is text and the other a link.
    it('does not count a name equal to a linked ingredient’s label as a repeat', async () => {
      const [{ name }] = await sql`select name from ingredients where id = ${ACACIA}`;
      await addSubstitute(UNCARIA, { substituteId: ACACIA });

      await addSubstitute(UNCARIA, { name: name as string });
    });
  });
});

// A row may stand in for one form of its ingredient (`variant_id`),
// and a link may name one form of the linked ingredient
// (`substitute_variant_id`), which must be that ingredient's.
describe('ingredient_substitutes, by form', () => {
  let MUGWORT_HERB: string;
  let MUGWORT_OIL: string;
  let UNCARIA_BARK: string;

  async function formOf(ingredientId: string): Promise<string> {
    const [found] = await sql`
      select id from ingredient_variants where ingredient_id = ${ingredientId} and deleted_at is null
    `;
    return found.id as string;
  }

  beforeAll(async () => {
    MUGWORT_HERB = await formOf(MUGWORT);
    UNCARIA_BARK = await formOf(UNCARIA);
    const [oil] = await sql`
      insert into ingredient_variants ${sql({
        ingredient_id: MUGWORT,
        form: 'Testoil',
        created_by: AUTHOR,
        updated_by: AUTHOR,
      })}
      returning id
    `;
    MUGWORT_OIL = oil.id as string;
  });

  it("links a form of the linked ingredient, and refuses another ingredient's", async () => {
    await addSubstitute(UNCARIA, { substituteId: MUGWORT, substituteVariantId: MUGWORT_OIL });

    const error = await failureOf(
      addSubstitute(ACACIA, { substituteId: UNCARIA, substituteVariantId: MUGWORT_OIL }),
    );

    // 23503 is foreign_key_violation, named: the composite key refused.
    expect(error.code).toBe('23503');
    expect(error.constraint_name).toBe(SUBSTITUTE_VARIANT_KEY);
  });

  // MATCH SIMPLE skips the key when the link is null, so a CHECK holds it.
  it('refuses a form with no linked ingredient beside it', async () => {
    const error = await failureOf(
      addSubstitute(UNCARIA, { name: 'Testoil', substituteVariantId: MUGWORT_OIL }),
    );

    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe(CHECK_FORM_NEEDS_LINK);
  });

  it('refuses a form standing in for itself, and admits a sibling form or another ingredient', async () => {
    const itself = await failureOf(
      addSubstitute(MUGWORT, {
        variantId: MUGWORT_HERB,
        substituteId: MUGWORT,
        substituteVariantId: MUGWORT_HERB,
      }),
    );
    await addSubstitute(MUGWORT, {
      variantId: MUGWORT_HERB,
      substituteId: MUGWORT,
      substituteVariantId: MUGWORT_OIL,
    });
    await addSubstitute(MUGWORT, {
      variantId: MUGWORT_HERB,
      substituteId: UNCARIA,
      substituteVariantId: UNCARIA_BARK,
    });

    expect(itself.code).toBe('23514');
    expect(itself.constraint_name).toBe(CHECK_NOT_ITSELF);
    const rows = await sql`
      select substitute_variant_id from ingredient_substitutes
      where ingredient_id = ${MUGWORT} and variant_id = ${MUGWORT_HERB}
    `;
    expect(rows.map((row) => row.substitute_variant_id).sort()).toEqual(
      [MUGWORT_OIL, UNCARIA_BARK].sort(),
    );
  });

  // The form a row stands in for has its own list beside the parent's.
  it('lists a substitute once per form, beside the same link on the parent', async () => {
    await addSubstitute(UNCARIA, { substituteId: ACACIA });
    await addSubstitute(UNCARIA, { variantId: UNCARIA_BARK, substituteId: ACACIA });

    const error = await failureOf(
      addSubstitute(UNCARIA, { variantId: UNCARIA_BARK, substituteId: ACACIA }),
    );

    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe('ingredient_substitutes_variant_link_unique');
  });
});
