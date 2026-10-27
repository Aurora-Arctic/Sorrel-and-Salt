import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { ingredientColumns, makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { IngredientOverrides, Inserted } from './types';

// §5's five declared unique indexes, by what each refuses; that each is
// partial on deleted_at, and frees its slot on a soft delete, is
// tests/db/partial-unique-indexes.test.ts's. Identity is `identity_key`, the
// formal name alone, once per tier whatever the form, which is a variant's
// (MB.215, MB.220), so the compendium is unique on identity and label
// uniqueness survives only inside a workspace —
// claude-docs/db/identity-model.md, "The ingredient identity model".
const WORKSPACE_LABEL = 'ingredients_workspace_label_unique';
const COMPENDIUM_IDENTITY_KEY = 'ingredients_compendium_identity_key_unique';
const WORKSPACE_IDENTITY_KEY = 'ingredients_workspace_identity_key_unique';
// MB.80's two: the public address unique per tier —
// claude-docs/db/ingredient-slugs.md, "Ingredient slugs".
const COMPENDIUM_SLUG = 'ingredients_compendium_slug_unique';
const WORKSPACE_SLUG = 'ingredients_workspace_slug_unique';

const AUTHOR = FIXTURE_USERS.A.id;
const WORKSPACE_A = WORKSPACE_W_ID;
const WORKSPACE_B = WORKSPACE_X_ID;

/**
 * The shared factory plus this file's author; the audit stamps are never the
 * fixture's.
 */
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
    insert into ingredients ${sql(row(overrides))} returning id, identity_key
  `;
  return { id: inserted.id as string, identityKey: inserted.identity_key as string };
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
      const vine = await insert({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
      const shrub = await insert({ name: "Cat's Claw", canonicalName: 'Senegalia greggii' });

      // Precondition: the labels are identical and the identities are not.
      expect(vine.identityKey).not.toBe(shrub.identityKey);
      const labels = await sql`select name from ingredients order by identity_key`;
      expect(labels.map((r) => r.name)).toEqual(["Cat's Claw", "Cat's Claw"]);
      expect(await liveCount()).toBe(2);
    });

    // Valerian root and leaf are one entry with two forms (MB.215), so a
    // second entry of the formal name is refused whatever its label.
    it('refuses a second entry of one formal name under another label', async () => {
      const root = await insert({ name: 'Valerian root', canonicalName: 'Valeriana officinalis' });

      // Why it could have been admitted: the label and the slug differ, and
      // the same formal name stands in a coven.
      const leaf = await insert({
        workspaceId: WORKSPACE_A,
        name: 'Valerian leaf',
        canonicalName: 'Valeriana officinalis',
      });
      expect(leaf.identityKey).toBe(root.identityKey);

      const error = await failureOf(
        insert({ name: 'Valerian leaf', canonicalName: 'Valeriana Officinalis' }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(COMPENDIUM_IDENTITY_KEY);
    });

    // The label index stops at the compendium's edge, and the tier predicates
    // keep the two identity indexes from seeing each other's rows.
    it('holds a compendium entry and a workspace local of the same identity', async () => {
      const global = await insert();
      const local = await insert({ workspaceId: WORKSPACE_A });

      expect(local.identityKey).toBe(global.identityKey);
      expect(await liveCount()).toBe(2);
    });
  });

  describe('the workspace tier', () => {
    it('lets two workspaces each hold a local of the same formal name', async () => {
      const mine = await insert({ workspaceId: WORKSPACE_A });
      const yours = await insert({ workspaceId: WORKSPACE_B });

      expect(yours.identityKey).toBe(mine.identityKey);
      expect(await liveCount()).toBe(2);
    });

    it('refuses two locals of one workspace sharing a formal name under different labels', async () => {
      const first = await insert({ workspaceId: WORKSPACE_A, name: 'Mugwort' });

      // Why it could have been admitted: the label differs, and the other
      // workspace holds the pair.
      const elsewhere = await insert({ workspaceId: WORKSPACE_B, name: 'Cronewort' });
      expect(elsewhere.identityKey).toBe(first.identityKey);

      const error = await failureOf(insert({ workspaceId: WORKSPACE_A, name: 'Cronewort' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_IDENTITY_KEY);
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
      expect(elsewhere.identityKey).not.toBe(first.identityKey);

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

  // MB.80/MB.81: the slug is the label and the formal name (MB.220), so it
  // collides only where `slugify` folds two different identities together —
  // punctuation or accents in a formal name, or a label differing only in
  // punctuation. Those pairs are refused here, not by identity or the label.
  describe('the slug indexes', () => {
    it('holds two compendium entries that share a label, under distinct slugs', async () => {
      const first = await insert({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
      const second = await insert({ name: "Cat's Claw", canonicalName: 'Uncaria guianensis' });

      // Precondition: nothing but the formal name separates them.
      expect(first.identityKey).not.toBe(second.identityKey);
      const rows = await sql`select name, slug from ingredients order by slug`;
      expect(rows.map((r) => r.name)).toEqual(["Cat's Claw", "Cat's Claw"]);
      expect(rows.map((r) => r.slug)).toEqual([
        'cats-claw-uncaria-guianensis',
        'cats-claw-uncaria-tomentosa',
      ]);
      expect(await liveCount()).toBe(2);
    });

    it('refuses two compendium entries whose formal names the slug rule folds together', async () => {
      const first = await insert({ canonicalName: 'Fixtura testalis' });

      // Why identity could not refuse it: `identity_key` keeps the hyphen that
      // `slugify` turns into the same separator a space becomes, so the keys differ.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_A,
        canonicalName: 'Fixtura-testalis',
      });
      expect(first.identityKey).toBe('fixtura testalis');
      expect(elsewhere.identityKey).toBe('fixtura-testalis');

      const error = await failureOf(insert({ canonicalName: 'Fixtura-testalis' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(COMPENDIUM_SLUG);
    });

    it('refuses two locals of one workspace whose labels the slug rule folds together, though neither the label nor the identity index sees them as one', async () => {
      const first = await insert({
        workspaceId: WORKSPACE_A,
        name: "Cat's Claw",
        nomenclature: 'none',
      });

      // With no formal name the key is the label, apostrophe kept, so the
      // identity index cannot refuse; `lower()` keeps it too, so nor can the
      // label index.
      const elsewhere = await insert({
        workspaceId: WORKSPACE_B,
        name: 'Cats Claw',
        nomenclature: 'none',
      });
      expect(first.identityKey).toBe("cat's claw");
      expect(elsewhere.identityKey).toBe('cats claw');
      const [{ same_label }] = await sql`
        select lower('Cats Claw') = lower(${"Cat's Claw"}) as same_label
      `;
      expect(same_label).toBe(false);

      const error = await failureOf(
        insert({ workspaceId: WORKSPACE_A, name: 'Cats Claw', nomenclature: 'none' }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(WORKSPACE_SLUG);
    });
  });
});
