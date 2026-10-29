import type { CupboardEntryRow, IngredientRow } from '../../../db/repository';

// A cupboard entry laid over its compendium row. Pure, with no
// `server-only` marker, because the entry page merges while it renders, in a
// component, and the GraphQL `annotated` field asks the same question.

/** The seven overrides; any one set makes the entry annotated. */
export const OVERRIDES = [
  'label',
  'description',
  'safetyNotes',
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
] as const satisfies readonly (keyof CupboardEntryRow)[];

/** True when the coven has set any of the seven overrides; an empty list is a set one. */
export const isAnnotated = (entry: CupboardEntryRow): boolean =>
  OVERRIDES.some((column) => entry[column] !== null);

/**
 * `row` as a coven reads it through its cupboard entry: per column
 * `entry?.x ?? row.x`, the label standing over the name. A null override is
 * the compendium's value and a set one the coven's; an empty list is a set
 * one, cleared on purpose, which is why this is `??` and never `||`. No entry
 * answers `row` as it is. The id and the tier stay the compendium's.
 */
export function applyCupboardEntry(
  row: IngredientRow,
  entry: CupboardEntryRow | null | undefined,
): IngredientRow {
  if (!entry) return row;
  return {
    ...row,
    name: entry.label ?? row.name,
    description: entry.description ?? row.description,
    safetyNotes: entry.safetyNotes ?? row.safetyNotes,
    elements: entry.elements ?? row.elements,
    celestialBodies: entry.celestialBodies ?? row.celestialBodies,
    zodiacSigns: entry.zodiacSigns ?? row.zodiacSigns,
    colors: entry.colors ?? row.colors,
  };
}
