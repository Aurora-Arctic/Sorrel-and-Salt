export type StepCategories = {
  /** `null` for an instruction-only step or a custom one-off ingredient. */
  readonly ingredientId: string | null;
  readonly categoryIds: readonly string[];
};

export type CategoryComparison = {
  readonly intendedNotPresent: string[];
  readonly presentNotIntended: string[];
};
