/**
 * The least a spell step must show for its categories to be gathered: the
 * ingredient it links, if any, and that ingredient's category ids. Declared by
 * shape rather than taken from the step table, so the comparison does not
 * depend on the table's columns (M13.1 reshapes them).
 */
export type StepCategories = {
  /** `null` for an instruction-only step or a custom one-off ingredient (MB.40). */
  readonly ingredientId: string | null;
  readonly categoryIds: readonly string[];
};
