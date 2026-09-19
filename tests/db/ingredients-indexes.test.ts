import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  type IngredientFixture,
  type Overrides,
  ingredientColumns,
  makeIngredient,
} from '../support/fixtures';
import { ingredients } from '@/db/schema/ingredients';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';

// §5's three partial unique indexes. Identity is `canonical_key`, so the
// compendium is unique on identity and label uniqueness survives only inside
// a workspace — claude-docs/db.md, "The ingredient identity model".
const COMPENDIUM_IDENTITY = 'ingredients_compendium_identity_unique';
const WORKSPACE_IDENTITY = 'ingredients_workspace_identity_unique';
const WORKSPACE_LABEL = 'ingredients_workspace_label_unique';
// §9's, neither unique nor partial; ingredients-trigram.test.ts owns it.
const TRIGRAM = 'ingredients_trgm';

describe('ingredients index declarations', () => {
  const { indexes } = getTableConfig(ingredients);
  const byName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));

  // "Exactly", not "at least": a fourth unique index is what this list exists to catch.
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

const AUTHOR = FIXTURE_USERS.A.id;
const WORKSPACE_A = WORKSPACE_W_ID;
const WORKSPACE_B = WORKSPACE_X_ID;

// The shared factory plus this file's author; the audit stamps are never the fixture's.
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

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

afterAll(async () => {
  await sql.end();
});

describe('ingredients unique indexes', () => {
  // The rendered predicate, not "some predicate": a dropped WHERE reserves a
  // deleted identity forever, and no test below re-uses one without deleting first.
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
      // `lower(name)`: Mugwort and mugwort are one label inside a workspace.
      expect(index?.definition).toContain('USING btree (workspace_id, lower(name))');
    });

    // A fourth unique index — most likely a label index over the compendium —
    // is exactly the constraint §5 dropped.
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
    // "Cat's Claw" is a vine, a shrub and a claw; uniqueness on lower(name) held one.
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

      // Precondition: the labels are identical and the identities are not.
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

      // Proof the colliding row is otherwise insertable and really shares the identity.
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

      // The constraint name pins which index refused; the labels differ.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(COMPENDIUM_IDENTITY);
    });

    // Folding the form into the key makes valerian root and leaf two identities.
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

      // Different identities, same label: only the label index can refuse.
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

  // Each asserts the collision first, so an index that reserved nothing at all
  // fails the first half.
  describe('soft delete releases the reservation', () => {
    it('frees a compendium identity', async () => {
      // The identity stated on both rows rather than left to the factory's default.
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
