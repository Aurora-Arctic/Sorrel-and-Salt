import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientSubstitutes } from '@/modules/ingredients/schema/ingredient-substitutes';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { SubstituteEntry, SubstituteRow } from './types';

// DESIGN.md §5's `ingredient_substitutes` (MB.138): one row per substitute,
// a link to an ingredient or a typed name, never both and never neither. The
// table task, MB.139: nothing reads it until MB.140.
const OWN_COLUMNS = ['id', 'ingredient_id', 'substitute_id', 'name'];

const PARENT_INDEX = 'ingredient_substitutes_ingredient_id';
const LINK_INDEX = 'ingredient_substitutes_link_unique';
const NAME_INDEX = 'ingredient_substitutes_name_unique';
const INDEXES = [PARENT_INDEX, LINK_INDEX, NAME_INDEX].sort();
const INGREDIENT_FK = 'ingredient_substitutes_ingredient_id_ingredients_id_fk';
const SUBSTITUTE_FK = 'ingredient_substitutes_substitute_id_ingredients_id_fk';

const CHECK_LINK_OR_NAME = 'ingredient_substitutes_link_or_name';
const CHECK_NAME_NOT_BLANK = 'ingredient_substitutes_name_not_blank';
const CHECK_NOT_ITSELF = 'ingredient_substitutes_not_itself';
const CHECKS = [CHECK_LINK_OR_NAME, CHECK_NAME_NOT_BLANK, CHECK_NOT_ITSELF].sort();

// What marks the fill among the shipped migrations: it re-runs here.
const FILL_MIGRATION = 'INSERT INTO "ingredient_substitutes"';
// And the refill MB.141 runs before the drop it marks.
const DROP_MIGRATION = 'DROP COLUMN "substitutes"';

describe('ingredient_substitutes schema', () => {
  const {
    byName,
    byIndexName: indexByName,
    checks,
    primaryKeys,
    foreignKeyByColumn,
  } = tableFacts(ingredientSubstitutes);

  // The full six, as folk names carry: a substitute is content, so removing
  // one leaves a tombstone (MB.138, "The audit shape").
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('keys on a surrogate id, so a removed substitute reserves nothing', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
    expect(primaryKeys).toEqual([]);
  });

  it('requires the ingredient, and makes the link and the name each optional', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.substitute_id.notNull).toBe(false);
    expect(byName.name.notNull).toBe(false);
  });

  it('points both ids at an ingredient', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.substitute_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.substitute_id.foreignColumnName).toBe('id');
  });

  it('declares exactly the three indexes DESIGN.md §5 names', () => {
    expect(Object.keys(indexByName).sort()).toEqual(INDEXES);
    expect(indexByName[PARENT_INDEX].config.unique).toBe(false);
    expect(indexByName[LINK_INDEX].config.unique).toBe(true);
    expect(indexByName[NAME_INDEX].config.unique).toBe(true);
  });

  it('declares the three checks', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(CHECKS);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const EDITOR = FIXTURE_USERS.B.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let MUGWORT: string;
let UNCARIA: string;
let ACACIA: string;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

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
      substitute_id: entry.substituteId ?? null,
      name: entry.name ?? null,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return inserted.id as string;
}

async function softDelete(id: string): Promise<void> {
  await sql`
    update ingredient_substitutes set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
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
  describe('catalogue introspection', () => {
    it('carries the six audit columns beside its own four', async () => {
      expect(await catalogue.columnNames('ingredient_substitutes')).toEqual(
        [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
      );
    });

    // The read by parent (MB.140) reads every live row, links and names alike,
    // which implies neither unique index's predicate.
    it('indexes the parent over live rows, not uniquely', async () => {
      const index = await catalogue.indexRow('ingredient_substitutes', PARENT_INDEX);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (ingredient_id)');
    });

    // The rendered predicate, not "some predicate": a dropped half widens the
    // reservation to tombstones, or to the other kind of row.
    it('makes a link unique per ingredient, among live links only', async () => {
      const index = await catalogue.indexRow('ingredient_substitutes', LINK_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((substitute_id IS NOT NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (ingredient_id, substitute_id)');
    });

    it('makes a folded name unique per ingredient, among live names only', async () => {
      const index = await catalogue.indexRow('ingredient_substitutes', NAME_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((name IS NOT NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (ingredient_id, lower(name))');
    });

    it('carries no unique index beyond the primary key and those two', async () => {
      expect(await catalogue.uniqueIndexNames('ingredient_substitutes')).toEqual(
        ['ingredient_substitutes_pkey', LINK_INDEX, NAME_INDEX].sort(),
      );
    });

    // MB.138's deletion rule: nothing reads from a linked ingredient back to
    // its linkers, so the index MB.139 first named is not built.
    it('builds no index leading on the linked ingredient', async () => {
      const rows = await sql`
        select c.relname from pg_index i
        join pg_class c on c.oid = i.indexrelid
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
        where i.indrelid = 'ingredient_substitutes'::regclass and a.attname = 'substitute_id'
      `;

      expect(rows).toEqual([]);
      // Why the query could find one: it finds the index leading on the parent.
      const parent = await sql`
        select c.relname from pg_index i
        join pg_class c on c.oid = i.indexrelid
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
        where i.indrelid = 'ingredient_substitutes'::regclass and a.attname = 'ingredient_id'
      `;
      expect(parent.map((row) => row.relname)).toContain(PARENT_INDEX);
    });

    it('declares the three checks and no others', async () => {
      const rows = await sql`
        select conname from pg_constraint
        where conrelid = 'ingredient_substitutes'::regclass and contype = 'c'
        order by conname
      `;

      expect(rows.map((row) => row.conname)).toEqual(CHECKS);
    });
  });

  describe('a substitute is a link or a name', () => {
    it('takes a link', async () => {
      await addSubstitute(UNCARIA, { substituteId: ACACIA });
    });

    it('takes a name', async () => {
      await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
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

    it('refuses a link to an id no ingredient holds', async () => {
      const error = await failureOf(addSubstitute(UNCARIA, { substituteId: ABSENT }));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(SUBSTITUTE_FK);
    });

    it('refuses a parent id no ingredient holds', async () => {
      const error = await failureOf(addSubstitute(ABSENT, { name: 'Devil’s Claw' }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });
  });

  // MB.138, "No repeats": the shared schema refuses a repeat first (MB.140),
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

    it('lets one ingredient link several and name several', async () => {
      await addSubstitute(UNCARIA, { substituteId: ACACIA });
      await addSubstitute(UNCARIA, { substituteId: MUGWORT });
      await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
      await addSubstitute(UNCARIA, { name: 'Wait-a-minute' });
    });

    // One is text and the other a link (MB.138).
    it('does not count a name equal to a linked ingredient’s label as a repeat', async () => {
      const [{ name }] = await sql`select name from ingredients where id = ${ACACIA}`;
      await addSubstitute(UNCARIA, { substituteId: ACACIA });

      await addSubstitute(UNCARIA, { name: name as string });
    });

    // Rule 4: a tombstone reserves nothing, so a removed entry can be re-added.
    it('lets a soft-deleted link be linked again', async () => {
      const removed = await addSubstitute(UNCARIA, { substituteId: ACACIA });
      await softDelete(removed);

      const readded = await addSubstitute(UNCARIA, { substituteId: ACACIA });

      expect(readded).not.toBe(removed);
    });

    it('lets a soft-deleted name be typed again', async () => {
      const removed = await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
      await softDelete(removed);

      const readded = await addSubstitute(UNCARIA, { name: 'devil’s claw' });

      expect(readded).not.toBe(removed);
    });
  });
});

// The template is migrated before it is seeded, so each migration's fill is
// re-run here, read off disk, against lists shaped as a deployed database held
// them. MB.141 dropped the list both fills read, so this file's clone takes it
// back first: the template is re-cloned before every file, and no other sees it.
async function restoreTheList(): Promise<void> {
  await sql`alter table ingredients add column if not exists substitutes text[]`;
}

/** The `INSERT` of the first migration containing `marker`, run here. */
async function runFillOf(marker: string): Promise<void> {
  const fill = statementsOfMigrationContaining(marker).filter((statement) =>
    /^insert\b/i.test(statement),
  );
  expect(fill).toHaveLength(1);
  await sql.unsafe(fill[0]);
}

async function listOn(id: string, substitutes: (string | null)[] | null, editor = AUTHOR) {
  await sql`
    update ingredients set substitutes = ${substitutes}, updated_by = ${editor} where id = ${id}
  `;
}

async function everySubstitute(): Promise<SubstituteRow[]> {
  return sql<SubstituteRow[]>`
    select ingredient_id, substitute_id, name, created_by, updated_by, deleted_at
    from ingredient_substitutes
    order by ingredient_id, name
  `;
}

const nameRow = (ingredientId: string, name: string, by = AUTHOR): SubstituteRow => ({
  ingredient_id: ingredientId,
  substitute_id: null,
  name,
  created_by: by,
  updated_by: by,
  deleted_at: null,
});

const byParentAndName = (rows: SubstituteRow[]) =>
  [...rows].sort((a, b) =>
    a.ingredient_id === b.ingredient_id
      ? (a.name ?? '').localeCompare(b.name ?? '')
      : a.ingredient_id.localeCompare(b.ingredient_id),
  );

describe('the fill from ingredients.substitutes (MB.139)', () => {
  const runFill = () => runFillOf(FILL_MIGRATION);

  beforeAll(restoreTheList);

  beforeEach(async () => {
    await sql`update ingredients set substitutes = null`;
  });

  it('copies every entry across as a name row, stamped by the list’s last editor', async () => {
    await listOn(UNCARIA, ['Devil’s Claw', 'Wait-a-minute'], EDITOR);
    await listOn(ACACIA, ['Devil’s Claw']);
    // Why the table could already hold them: nothing else wrote to it.
    expect(await everySubstitute()).toEqual([]);

    await runFill();

    expect(await everySubstitute()).toEqual(
      byParentAndName([
        nameRow(UNCARIA, 'Devil’s Claw', EDITOR),
        nameRow(UNCARIA, 'Wait-a-minute', EDITOR),
        nameRow(ACACIA, 'Devil’s Claw'),
      ]),
    );
  });

  // The unique index would otherwise refuse the fill, and the migration with it.
  it('copies a repeated entry once, in any case, in the spelling it first holds', async () => {
    await listOn(UNCARIA, ['devil’s claw', 'Wait-a-minute', 'Devil’s Claw', 'DEVIL’S CLAW']);
    // Why it could have been refused: the folded names collide in the index.
    const error = await failureOf(
      sql.begin(async (tx) => {
        for (const name of ['devil’s claw', 'Devil’s Claw']) {
          await tx`
            insert into ingredient_substitutes (ingredient_id, name, created_by, updated_by)
            values (${UNCARIA}, ${name}, ${AUTHOR}, ${AUTHOR})`;
        }
      }),
    );
    expect(error.constraint_name).toBe(NAME_INDEX);

    await runFill();

    expect(await everySubstitute()).toEqual(
      byParentAndName([nameRow(UNCARIA, 'devil’s claw'), nameRow(UNCARIA, 'Wait-a-minute')]),
    );
  });

  // `text[]` carries no CHECK, so a list written past the service can hold
  // what `name`'s would refuse, and the fill must not abort on it.
  it('skips a blank or null entry, and trims the rest', async () => {
    await listOn(UNCARIA, ['  ', null, '  Devil’s Claw ', 'devil’s claw']);

    await runFill();

    expect(await everySubstitute()).toEqual([nameRow(UNCARIA, 'Devil’s Claw')]);
  });

  it('writes nothing for a null or empty list', async () => {
    await listOn(UNCARIA, null);
    await listOn(ACACIA, []);

    await runFill();

    expect(await everySubstitute()).toEqual([]);
  });

  // As 0030 filled the lists: a deleted row's list is kept for v2's restore.
  it('fills a soft-deleted ingredient’s list too, as live rows', async () => {
    await listOn(UNCARIA, ['Devil’s Claw']);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${UNCARIA}`;

    await runFill();

    expect(await everySubstitute()).toEqual([nameRow(UNCARIA, 'Devil’s Claw')]);
  });

  it('leaves the list itself as it was', async () => {
    await listOn(UNCARIA, ['Devil’s Claw', 'devil’s claw']);

    await runFill();

    const [row] = await sql`select substitutes from ingredients where id = ${UNCARIA}`;
    expect(row.substitutes).toEqual(['Devil’s Claw', 'devil’s claw']);
  });
});

// MB.141's migration copies whatever the live deploy wrote to the list after
// MB.139's fill, then drops it. By then MB.140 owns the table, so the refill
// only adds: what a row already holds is newer than the list, a removal
// included, since nothing but MB.140's code ever soft-deleted one.
describe('the refill before the list is dropped (MB.141)', () => {
  const runRefill = () => runFillOf(DROP_MIGRATION);

  beforeAll(restoreTheList);

  beforeEach(async () => {
    await sql`update ingredients set substitutes = null`;
  });

  it('copies an entry written since the fill, beside every row the table holds', async () => {
    await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
    await addSubstitute(UNCARIA, { substituteId: ACACIA });
    await listOn(UNCARIA, ['Devil’s Claw', 'Wait-a-minute'], EDITOR);
    await listOn(MUGWORT, ['Wormwood'], EDITOR);
    const held = await everySubstitute();

    await runRefill();

    expect(byParentAndName(await everySubstitute())).toEqual(
      byParentAndName([
        ...held,
        nameRow(UNCARIA, 'Wait-a-minute', EDITOR),
        nameRow(MUGWORT, 'Wormwood', EDITOR),
      ]),
    );
  });

  // The unique index would otherwise refuse the refill, and the drop with it.
  it('leaves a name the table holds in another case as it was', async () => {
    await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
    await listOn(UNCARIA, ['DEVIL’S CLAW'], EDITOR);
    // Why it could have been refused: the folded names collide in the index.
    const error = await failureOf(
      sql`
        insert into ingredient_substitutes (ingredient_id, name, created_by, updated_by)
        values (${UNCARIA}, 'DEVIL’S CLAW', ${EDITOR}, ${EDITOR})`,
    );
    expect(error.constraint_name).toBe(NAME_INDEX);

    await runRefill();

    expect(await everySubstitute()).toEqual([nameRow(UNCARIA, 'Devil’s Claw')]);
  });

  // A soft-deleted row reserves nothing in the index, so only the refill's own
  // check keeps the list from undoing a member's removal.
  it('does not restore a name removed since the switch', async () => {
    await softDelete(await addSubstitute(UNCARIA, { name: 'Devil’s Claw' }));
    await listOn(UNCARIA, ['devil’s claw']);

    await runRefill();

    const live = (await everySubstitute()).filter((row) => row.deleted_at === null);
    expect(live).toEqual([]);
  });

  it('skips a blank or null entry, trims the rest, and copies a repeat once', async () => {
    await listOn(UNCARIA, ['  ', null, '  wait-a-minute ', 'Wait-a-minute']);

    await runRefill();

    expect(await everySubstitute()).toEqual([nameRow(UNCARIA, 'wait-a-minute')]);
  });

  // As MB.139's fill: a deleted row's list is kept for v2's restore.
  it('refills a soft-deleted ingredient’s list too', async () => {
    await listOn(UNCARIA, ['Devil’s Claw']);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${UNCARIA}`;

    await runRefill();

    expect(await everySubstitute()).toEqual([nameRow(UNCARIA, 'Devil’s Claw')]);
  });

  it('writes nothing for a null or empty list', async () => {
    await addSubstitute(UNCARIA, { name: 'Devil’s Claw' });
    await listOn(ACACIA, []);
    const held = await everySubstitute();

    await runRefill();

    expect(await everySubstitute()).toEqual(held);
  });
});
