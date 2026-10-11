import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { ingredientColumns, makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { IngredientOverrides, Inserted } from './types';

// §5's five unique indexes, by what each refuses; that each is partial on
// deleted_at, and frees its slot on a soft delete, is
// tests/db/partial-unique-indexes.test.ts's. Identity is `canonical_key`, so
// the compendium is unique on identity and label uniqueness survives only
// inside a workspace — claude-docs/db/identity-model.md, "The ingredient identity model".
const COMPENDIUM_IDENTITY = 'ingredients_compendium_identity_unique';
const WORKSPACE_IDENTITY = 'ingredients_workspace_identity_unique';
const WORKSPACE_LABEL = 'ingredients_workspace_label_unique';
// MB.80's two: the public address unique per tier —
// claude-docs/db/ingredient-slugs.md, "Ingredient slugs".
const COMPENDIUM_SLUG = 'ingredients_compendium_slug_unique';
const WORKSPACE_SLUG = 'ingredients_workspace_slug_unique';

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
useTestDatabase((client) => (sql = client));

async function insert(overrides: IngredientOverrides = {}): Promise<Inserted> {
  const [inserted] = await sql`
    insert into ingredients ${sql(row(overrides))} returning id, canonical_key
  `;
  return { id: inserted.id as string, canonicalKey: inserted.canonical_key as string };
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
  });
});
