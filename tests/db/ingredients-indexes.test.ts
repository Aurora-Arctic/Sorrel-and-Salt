import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  type IngredientFixture,
  type Overrides,
  ingredientColumns,
  makeIngredient,
} from '../support/fixtures';
import { MIGRATIONS_DIR } from '../support/paths';
import { ingredients } from '@/db/schema/ingredients';

// DESIGN.md §5's three partial unique indexes, transcribed by name. Identity
// is `canonical_key` — the formal name plus the normalised form — so the
// compendium is unique on identity rather than on the display label, which is
// what lets four entries all display "Cat's Claw". Label uniqueness survives
// in the workspace tier only: inside one drawer an ambiguous label is a
// mistake, not a distinction.
const COMPENDIUM_IDENTITY = 'ingredients_compendium_identity_unique';
const WORKSPACE_IDENTITY = 'ingredients_workspace_identity_unique';
const WORKSPACE_LABEL = 'ingredients_workspace_label_unique';
// DESIGN.md §9's, not §5's, and neither unique nor partial — this file asserts
// only that it is declared and is not one of the three above.
// ingredients-trigram.test.ts (M4.6) owns everything else about it.
const TRIGRAM = 'ingredients_trgm';

describe('ingredients index declarations', () => {
  const { indexes } = getTableConfig(ingredients);
  const byName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));

  // §5's three, plus §9's trigram index (M4.6) — which is asserted in
  // ingredients-trigram.test.ts and named here only so this stays an "exactly"
  // rather than an "at least". A fourth *unique* index is the thing this list
  // exists to catch, and the assertion below is what makes it one.
  it('declares exactly §5’s three unique indexes and §9’s trigram one', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [COMPENDIUM_IDENTITY, WORKSPACE_IDENTITY, WORKSPACE_LABEL, TRIGRAM].sort(),
    );
  });

  it('makes all three unique and all three partial', () => {
    for (const name of [COMPENDIUM_IDENTITY, WORKSPACE_IDENTITY, WORKSPACE_LABEL]) {
      expect(byName[name].config.unique).toBe(true);
      expect(byName[name].config.where).toBeDefined();
    }
  });
});

// The behaviour half, following M4.1's idiom: apply the migrations that ship
// this table and these indexes into this worker's disposable sorrel_test_<n>
// clone rather than hand-copying their DDL, so what is asserted below is the
// SQL production runs. `users` and `workspaces` are stubbed to the one column
// the ingredients foreign keys point at — they are M2.2/M6.2's tables, and
// applying their migrations here would leave a __drizzle_migrations table
// behind for the next test file in this worker to trip over.

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const WORKSPACE_A = '22222222-2222-2222-2222-222222222222';
const WORKSPACE_B = '33333333-3333-3333-3333-333333333333';

// M1.25 — the shared factory, plus this file's own author; the audit stamps
// are not the fixture's to give (CLAUDE.md rule 3). It is the same
// `makeIngredient` ingredients-schema.test.ts writes its rows with, which is
// the point: the two files were carrying byte-identical copies of this helper,
// and a partial identity written into one of them would have gone on
// disagreeing with the other silently.
type IngredientOverrides = Overrides<IngredientFixture>;

function row(overrides: IngredientOverrides = {}): Record<string, unknown> {
  return {
    ...ingredientColumns(makeIngredient(overrides)),
    created_by: AUTHOR,
    updated_by: AUTHOR,
  };
}

let sql: ReturnType<typeof postgres>;

type Inserted = { id: string; canonicalKey: string };

async function insert(overrides: IngredientOverrides = {}): Promise<Inserted> {
  const [inserted] = await sql`
    insert into ingredients ${sql(row(overrides))} returning id, canonical_key
  `;
  return { id: inserted.id as string, canonicalKey: inserted.canonical_key as string };
}

async function failureOf(work: Promise<unknown>) {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}

async function softDelete(id: string): Promise<void> {
  await sql`
    update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
}

async function liveCount(): Promise<number> {
  const [{ count }] =
    await sql`select count(*)::int as count from ingredients where deleted_at is null`;
  return count as number;
}

type IndexRow = { unique: boolean; predicate: string | null; definition: string };

async function indexRow(name: string): Promise<IndexRow | undefined> {
  const [found] = await sql`
    select i.indisunique as unique,
           pg_get_expr(i.indpred, i.indrelid) as predicate,
           pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'ingredients'::regclass and c.relname = ${name}
  `;
  return found as IndexRow | undefined;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists ingredients`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`create table if not exists workspaces (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;
  await sql`
    insert into workspaces (id) values (${WORKSPACE_A}), (${WORKSPACE_B}) on conflict do nothing
  `;

  for (const statement of migrationStatementsContaining('CREATE TABLE "ingredients"')) {
    await sql.unsafe(statement);
  }
  for (const statement of migrationStatementsContaining(COMPENDIUM_IDENTITY)) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from ingredients`;
});

afterAll(async () => {
  await sql`drop table if exists ingredients`;
  await sql`drop type if exists nomenclature_kind`;
  await sql`drop type if exists ingredient_element`;
  await sql`drop table if exists workspaces`;
  await sql`drop table if exists users`;
  await sql.end();
});

describe('ingredients unique indexes', () => {
  // The catalogue-introspection half. Asserting the rendered predicate rather
  // than merely "some predicate exists" is the point: a dropped WHERE clause
  // silently widens the reservation — a soft-deleted entry would keep its
  // identity forever — and every behaviour test below would still pass,
  // because none of them re-uses an identity without deleting it first.
  describe('catalogue introspection', () => {
    it('makes the compendium unique on identity, among live compendium rows only', async () => {
      const index = await indexRow(COMPENDIUM_IDENTITY);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (canonical_key)');
    });

    it('makes each workspace unique on identity, among its live rows only', async () => {
      const index = await indexRow(WORKSPACE_IDENTITY);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NOT NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (workspace_id, canonical_key)');
    });

    it('makes each workspace unique on the folded label, among its live rows only', async () => {
      const index = await indexRow(WORKSPACE_LABEL);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NOT NULL) AND (deleted_at IS NULL))');
      // `lower(name)`, not `name`: the index is what makes Mugwort and
      // mugwort one label inside a workspace.
      expect(index?.definition).toContain('USING btree (workspace_id, lower(name))');
    });

    // A fourth unique index would be a reservation nobody argued for — most
    // likely a label index over the compendium tier, which is exactly the
    // constraint DESIGN.md §5 dropped so four rows may display "Cat's Claw".
    it('carries no unique index beyond those three and the primary key', async () => {
      const rows = await sql`
        select c.relname as name
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'ingredients'::regclass and i.indisunique
        order by c.relname
      `;

      expect(rows.map((r) => r.name)).toEqual(
        [COMPENDIUM_IDENTITY, WORKSPACE_IDENTITY, WORKSPACE_LABEL, 'ingredients_pkey'].sort(),
      );
    });
  });

  describe('the compendium tier', () => {
    // Story: "Cat's Claw" names an Amazonian vine, a desert shrub, and a
    // literal claw. Under the old uniqueness on lower(name) the compendium
    // could hold exactly one of them.
    it('holds two entries that share a label but not a formal name', async () => {
      const vine = await insert({
        name: "Cat's Claw",
        canonicalName: 'Uncaria tomentosa',
        form: 'bark',
      });
      const shrub = await insert({
        name: "Cat's Claw",
        canonicalName: 'Senegalia greggii',
        form: 'bark',
      });

      // The precondition the test exists to exercise: the labels really are
      // identical and the identities really are not. Without this, a schema
      // that rejected nothing at all would pass just as well.
      expect(vine.canonicalKey).not.toBe(shrub.canonicalKey);
      const labels = await sql`select name from ingredients order by canonical_key`;
      expect(labels.map((r) => r.name)).toEqual(["Cat's Claw", "Cat's Claw"]);
      expect(await liveCount()).toBe(2);
    });

    it('refuses a second entry that shares an identity', async () => {
      const first = await insert({
        name: "Cat's Claw",
        canonicalName: 'Uncaria tomentosa',
        form: 'bark',
      });

      // Proof the colliding row is otherwise insertable — same values, a tier
      // this index does not cover — and proof the two really do share an
      // identity rather than merely looking like they do.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_A,
        name: 'Uña de gato',
        canonicalName: 'Uncaria tomentosa',
        form: 'bark',
      });
      expect(elsewhere.canonicalKey).toBe(first.canonicalKey);

      const error = await failureOf(
        insert({ name: 'Uña de gato', canonicalName: 'Uncaria tomentosa', form: 'bark' }),
      );

      // 23505 is unique_violation, and the constraint name pins *which* index
      // refused: the label index would have let this row through, since the
      // labels differ.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(COMPENDIUM_IDENTITY);
    });

    // Folding the form into the key is what makes valerian root and valerian
    // leaf two identities — two sets of correspondences, two safety notes.
    it('holds Valeriana officinalis root and leaf as two entries', async () => {
      const root = await insert({
        name: 'Valerian root',
        canonicalName: 'Valeriana officinalis',
        form: 'root',
      });
      const leaf = await insert({
        name: 'Valerian leaf',
        canonicalName: 'Valeriana officinalis',
        form: 'leaf',
      });

      expect(root.canonicalKey).toBe('valeriana officinalis :: root');
      expect(leaf.canonicalKey).toBe('valeriana officinalis :: leaf');
      expect(await liveCount()).toBe(2);
    });

    // The label index stops at the compendium's edge, and the tier predicates
    // keep the two identity indexes from seeing each other's rows.
    it('holds a compendium entry and a workspace local of the same identity', async () => {
      const global = await insert();
      const local = await insert({ workspaceId: WORKSPACE_A });

      expect(local.canonicalKey).toBe(global.canonicalKey);
      expect(await liveCount()).toBe(2);
    });
  });

  describe('the workspace tier', () => {
    it('lets two workspaces each hold a local of the same formal name', async () => {
      const mine = await insert({ workspaceId: WORKSPACE_A });
      const yours = await insert({ workspaceId: WORKSPACE_B });

      expect(yours.canonicalKey).toBe(mine.canonicalKey);
      expect(await liveCount()).toBe(2);
    });

    it('refuses two locals of one workspace that share an identity', async () => {
      const first = await insert({ workspaceId: WORKSPACE_A, name: 'Mugwort' });

      const elsewhere = await insert({ workspaceId: WORKSPACE_B, name: 'Cronewort' });
      expect(elsewhere.canonicalKey).toBe(first.canonicalKey);

      const error = await failureOf(insert({ workspaceId: WORKSPACE_A, name: 'Cronewort' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_IDENTITY);
    });

    it('refuses two locals of one workspace that share a label', async () => {
      const first = await insert({
        workspaceId: WORKSPACE_A,
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
      });

      // Different identities, same label — so only the label index can be
      // what refuses the second row, and the assertion below says which.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_B,
        name: 'Mugwort',
        canonicalName: 'Artemisia absinthium',
      });
      expect(elsewhere.canonicalKey).not.toBe(first.canonicalKey);

      const error = await failureOf(
        insert({
          workspaceId: WORKSPACE_A,
          name: 'Mugwort',
          canonicalName: 'Artemisia absinthium',
        }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_LABEL);
    });

    it('folds case when comparing labels inside a workspace', async () => {
      await insert({ workspaceId: WORKSPACE_A, name: 'Mugwort' });

      const error = await failureOf(
        insert({
          workspaceId: WORKSPACE_A,
          name: 'mugwort',
          canonicalName: 'Artemisia absinthium',
        }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_LABEL);
    });
  });

  // CLAUDE.md rule 4: without WHERE deleted_at IS NULL, deleting a record
  // permanently reserves its name. Each of these three asserts the collision
  // first, so what the soft delete changes is visible rather than assumed —
  // an index that reserved nothing at all would fail the first half.
  describe('soft delete releases the reservation', () => {
    it('frees a compendium identity', async () => {
      // The same identity under another label — stated on each row rather
      // than left to the fixture's default, which is deliberately one the seed
      // does not carry and so not the one this test names.
      const { id } = await insert({ canonicalName: 'Artemisia vulgaris', form: 'herb' });

      const blocked = await failureOf(
        insert({ name: 'Cronewort', canonicalName: 'Artemisia vulgaris' }),
      );
      expect(blocked.constraint_name).toBe(COMPENDIUM_IDENTITY);

      await softDelete(id);
      const reborn = await insert({ name: 'Cronewort', canonicalName: 'Artemisia vulgaris' });

      expect(reborn.canonicalKey).toBe('artemisia vulgaris :: herb');
      expect(await liveCount()).toBe(1);
    });

    it('frees a workspace identity', async () => {
      const { id } = await insert({ workspaceId: WORKSPACE_A });

      const blocked = await failureOf(insert({ workspaceId: WORKSPACE_A, name: 'Cronewort' }));
      expect(blocked.constraint_name).toBe(WORKSPACE_IDENTITY);

      await softDelete(id);
      await insert({ workspaceId: WORKSPACE_A, name: 'Cronewort' });

      expect(await liveCount()).toBe(1);
    });

    it('frees a workspace label', async () => {
      const { id } = await insert({ workspaceId: WORKSPACE_A, name: 'Mugwort' });

      const blocked = await failureOf(
        insert({
          workspaceId: WORKSPACE_A,
          name: 'Mugwort',
          canonicalName: 'Artemisia absinthium',
        }),
      );
      expect(blocked.constraint_name).toBe(WORKSPACE_LABEL);

      await softDelete(id);
      await insert({
        workspaceId: WORKSPACE_A,
        name: 'Mugwort',
        canonicalName: 'Artemisia absinthium',
      });

      expect(await liveCount()).toBe(1);
    });
  });
});
