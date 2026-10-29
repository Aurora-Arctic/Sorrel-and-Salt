/**
 * The least a spell step must show for its categories to be gathered: the
 * ingredient it links, if any, and that ingredient's category ids. Declared by
 * shape rather than taken from the step table, so the comparison does not
 * depend on the table's columns.
 */
export type StepCategories = {
  /** `null` for an instruction-only step or a custom one-off ingredient. */
  readonly ingredientId: string | null;
  readonly categoryIds: readonly string[];
};

/** The gap between a spell's assigned categories and its ingredients', both ways. */
export type CategoryComparison = {
  /** Assigned to the spell, but no ingredient in it carries them. */
  readonly intendedNotPresent: string[];
  /** Carried by an ingredient in the spell, but not assigned to it. */
  readonly presentNotIntended: string[];
};
