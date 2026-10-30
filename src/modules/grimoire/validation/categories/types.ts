/** The least a spell step must show for its categories to be gathered: its linked ingredient and that ingredient's category ids. */
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
