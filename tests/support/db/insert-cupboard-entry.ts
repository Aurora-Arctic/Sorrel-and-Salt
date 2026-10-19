import type postgres from 'postgres';

// The one way a test seeds a cupboard entry it is not testing the writing of:
// raw, as `insertStock` is, so setup does not depend on the entry service
// (claude-docs/testing/fixture-factories.md, "Fixture factories").

/** A compendium entry's presence in one coven's cupboard; an omitted override is null, the compendium's value. */
export interface CupboardEntryFixture {
  workspaceId: string;
  ingredientId: string;
  label?: string | null;
  description?: string | null;
  safetyNotes?: string | null;
  elements?: string[] | null;
  celestialBodies?: string[] | null;
  zodiacSigns?: string[] | null;
  colors?: string[] | null;
  /** Written already soft-deleted, by `author`. */
  deleted?: boolean;
}

/** Writes the entry stamped by `author` and returns its id. */
export async function insertCupboardEntry(
  sql: postgres.Sql,
  entry: CupboardEntryFixture,
  author: string,
): Promise<string> {
  const { deleted = false } = entry;
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx`
      insert into workspace_compendium_entries ${tx({
        workspace_id: entry.workspaceId,
        ingredient_id: entry.ingredientId,
        label: entry.label ?? null,
        description: entry.description ?? null,
        safety_notes: entry.safetyNotes ?? null,
        elements: entry.elements ?? null,
        celestial_bodies: entry.celestialBodies ?? null,
        zodiac_signs: entry.zodiacSigns ?? null,
        colors: entry.colors ?? null,
        created_by: author,
        updated_by: author,
        deleted_at: deleted ? new Date() : null,
        deleted_by: deleted ? author : null,
      } as never)}
      returning id`;
    return row.id as string;
  });
}
