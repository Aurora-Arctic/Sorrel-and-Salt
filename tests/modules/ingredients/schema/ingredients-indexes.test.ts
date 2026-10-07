import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { tableFacts } from '../../../support/db/table-metadata';
import { ingredientColumns, makeIngredient } from '../../../support/fixtures';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { IngredientOverrides, Inserted } from './types';

// §5's three partial unique indexes. Identity is `canonical_key`, so the
// compendium is unique on identity and label uniqueness survives only inside
// a workspace — claude-docs/db/identity-model.md, "The ingredient identity model".
const COMPENDIUM_IDENTITY = 'ingredients_compendium_identity_unique';
const WORKSPACE_IDENTITY = 'ingredients_workspace_identity_unique';
const WORKSPACE_LABEL = 'ingredients_workspace_label_unique';
// MB.80's two: the public address unique per tier —
// claude-docs/db/ingredient-slugs.md, "Ingredient slugs".
const COMPENDIUM_SLUG = 'ingredients_compendium_slug_unique';
const WORKSPACE_SLUG = 'ingredients_workspace_slug_unique';
const DECLARED = [
  COMPENDIUM_IDENTITY,
  WORKSPACE_IDENTITY,
  WORKSPACE_LABEL,
  COMPENDIUM_SLUG,
  WORKSPACE_SLUG,
];
// §9's, neither unique nor partial; ingredients-trigram.test.ts owns it, and
// ingredients-unaccent.test.ts its folded twin.
const TRIGRAM = 'ingredients_trgm';
const UNACCENT_TRIGRAM = 'ingredients_unaccent_trgm';
// M5.6a's reverse index on the pick, for the form delete's and rename's reads
// of the live compendium entries picking a form (MB.167).
const COMPENDIUM_FORM_PICKS = 'ingredients_compendium_form_id_idx';

describe('ingredients index declarations', () => {
  const { byIndexName: byName } = tableFacts(ingredients);

  // "Exactly", not "at least": a sixth unique index is what this list exists to catch.
  it('declares exactly §5’s five unique indexes, the two trigram ones and the pick index', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [...DECLARED, TRIGRAM, UNACCENT_TRIGRAM, COMPENDIUM_FORM_PICKS].sort(),
    );
  });

  it('makes all five unique and all five partial', () => {
    for (const name of DECLARED) {
      expect(byName[name].config.unique).toBe(true);
      expect(byName[name].config.where).toBeDefined();
    }
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const WORKSPACE_A = WORKSPACE_W_ID;
const WORKSPACE_B = WORKSPACE_X_ID;

// The shared factory plus this file's author; the audit stamps are never the fixture's.
function row(overrides: IngredientOverrides = {}): Record<string, unknown> {
  return {
    ...ingredientColumns(makeIngredient(overrides)),
    created_by: AUTHOR,
    updated_by: AUTHOR,
  };
}

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function insert(overrides: IngredientOverrides = {}): Promise<Inserted> {
  const [inserted] = await sql`
    insert into ingredients ${sql(row(overrides))} returning id, canonical_key
  `;
  return { id: inserted.id as string, canonicalKey: inserted.canonical_key as string };
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

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

describe('ingredients unique indexes', () => {
  // The rendered predicate, not "some predicate": a dropped WHERE reserves a
  // deleted identity forever, and no test below re-uses one without deleting first.
  describe('catalogue introspection', () => {
    it('makes the compendium unique on identity, among live compendium rows only', async () => {
      const index = await catalogue.indexRow('ingredients', COMPENDIUM_IDENTITY);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (canonical_key)');
    });

    it('makes each workspace unique on identity, among its live rows only', async () => {
      const index = await catalogue.indexRow('ingredients', WORKSPACE_IDENTITY);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NOT NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (workspace_id, canonical_key)');
    });

    it('makes each workspace unique on the folded label, among its live rows only', async () => {
      const index = await catalogue.indexRow('ingredients', WORKSPACE_LABEL);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NOT NULL) AND (deleted_at IS NULL))');
      // `lower(name)`: Mugwort and mugwort are one label inside a workspace.
      expect(index?.definition).toContain('USING btree (workspace_id, lower(name))');
    });

    // The address, unique per tier among live rows: `(slug)` over the
    // compendium, `(workspace_id, slug)` over the locals — the latter with no
    // tier predicate, as DESIGN.md §5 writes it, since a null workspace_id
    // collides with nothing in a btree.
    it('makes the compendium unique on slug, among live compendium rows only', async () => {
      const index = await catalogue.indexRow('ingredients', COMPENDIUM_SLUG);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((workspace_id IS NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (slug)');
    });

    it('makes each workspace unique on slug, among live rows only', async () => {
      const index = await catalogue.indexRow('ingredients', WORKSPACE_SLUG);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (workspace_id, slug)');
    });

    // Not unique: many entries pick one form. Partial on the compendium's live
    // rows, the only ones the form writes read, since a coven's pick never
    // blocks a delete or follows a rename.
    it('indexes form_id over live compendium rows only, not uniquely', async () => {
      const index = await catalogue.indexRow('ingredients', COMPENDIUM_FORM_PICKS);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBe('((workspace_id IS NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (form_id)');
    });

    // A sixth unique index — most likely a label index over the compendium —
    // is exactly the constraint §5 dropped.
    it('carries no unique index beyond those five and the primary key', async () => {
      expect(await catalogue.uniqueIndexNames('ingredients')).toEqual(
        [...DECLARED, 'ingredients_pkey'].sort(),
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

  // MB.80/MB.81: the slug is the label, the form and the formal name, so it
  // collides only where `slugify` folds two different identities together —
  // punctuation or accents in a formal name, or a label differing only in
  // punctuation. Those pairs are refused here, not by identity or the label.
  describe('the slug indexes', () => {
    it('holds two compendium entries that share a label and a form, under distinct slugs', async () => {
      const first = await insert({
        name: "Cat's Claw",
        canonicalName: 'Uncaria tomentosa',
        form: 'bark',
      });
      const second = await insert({
        name: "Cat's Claw",
        canonicalName: 'Uncaria guianensis',
        form: 'bark',
      });

      // Precondition: nothing but the formal name separates them.
      expect(first.canonicalKey).not.toBe(second.canonicalKey);
      const rows = await sql`select name, form, slug from ingredients order by slug`;
      expect(rows.map((r) => [r.name, r.form])).toEqual([
        ["Cat's Claw", 'bark'],
        ["Cat's Claw", 'bark'],
      ]);
      expect(rows.map((r) => r.slug)).toEqual([
        'cats-claw-bark-uncaria-guianensis',
        'cats-claw-bark-uncaria-tomentosa',
      ]);
      expect(await liveCount()).toBe(2);
    });

    it('refuses two compendium entries whose formal names the slug rule folds together', async () => {
      const first = await insert({ canonicalName: 'Fixtura testalis' });

      // Why identity could not refuse it: `canonical_key` keeps the hyphen that
      // `slugify` turns into the same separator a space becomes, so the keys differ.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_A,
        canonicalName: 'Fixtura-testalis',
      });
      expect(first.canonicalKey).toBe('fixtura testalis :: herb');
      expect(elsewhere.canonicalKey).toBe('fixtura-testalis :: herb');

      const error = await failureOf(insert({ canonicalName: 'Fixtura-testalis' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(COMPENDIUM_SLUG);
    });

    it('refuses two locals of one workspace whose labels the slug rule folds together, though neither the label nor the identity index sees them as one', async () => {
      const first = await insert({
        workspaceId: WORKSPACE_A,
        name: "Cat's Claw",
        nomenclature: 'none',
        form: 'bark',
      });

      // With no formal name the key is the label, apostrophe kept, so the
      // identity index cannot refuse; `lower()` keeps it too, so nor can the
      // label index.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_B,
        name: 'Cats Claw',
        nomenclature: 'none',
        form: 'bark',
      });
      expect(first.canonicalKey).toBe("cat's claw :: bark");
      expect(elsewhere.canonicalKey).toBe('cats claw :: bark');
      const [{ same_label }] = await sql`
        select lower('Cats Claw') = lower(${"Cat's Claw"}) as same_label
      `;
      expect(same_label).toBe(false);

      const error = await failureOf(
        insert({ workspaceId: WORKSPACE_A, name: 'Cats Claw', nomenclature: 'none', form: 'bark' }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_SLUG);
    });

    it('lets one slug recur across the tiers and across workspaces', async () => {
      await insert();
      await insert({ workspaceId: WORKSPACE_A });
      await insert({ workspaceId: WORKSPACE_B });

      expect(await sql`select distinct slug from ingredients`).toHaveLength(1);
      expect(await liveCount()).toBe(3);
    });

    it('frees a compendium slug on soft delete', async () => {
      const { id } = await insert({ canonicalName: 'Fixtura testalis' });
      const blocked = await failureOf(insert({ canonicalName: 'Fixtura-testalis' }));
      expect(blocked.constraint_name).toBe(COMPENDIUM_SLUG);

      await softDelete(id);
      await insert({ canonicalName: 'Fixtura-testalis' });

      expect(await liveCount()).toBe(1);
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
