/** The gap between a spell's assigned categories and its ingredients', both ways. */
export type CategoryComparison = {
  /** Assigned to the spell, but no ingredient in it carries them. */
  readonly intendedNotPresent: string[];
  /** Carried by an ingredient in the spell, but not assigned to it. */
  readonly presentNotIntended: string[];
};
