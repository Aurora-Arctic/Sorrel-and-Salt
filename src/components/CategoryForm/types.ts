import type { CategoryInput } from '@/modules/vocabulary/validation/category';

/** A group the category can be filed under: the choices of the Group field. */
export interface CategoryGroupChoice {
  id: string;
  name: string;
}

/** The category being edited, as the form starts from it. */
export interface EditedCategory extends CategoryInput {
  id: string;
}

export interface CategoryFormProps {
  /** The category to edit; none adds one. */
  category?: EditedCategory;
  /** Every live group, alphabetical (MB.35). */
  groups: readonly CategoryGroupChoice[];
  /** Called once the category is saved or deleted, and on Cancel: the owner closes the form. */
  onDone: () => void;
}

/** The form's values: the input as typed, the group `''` until one is chosen. */
export type CategoryFormValues = CategoryInput;
