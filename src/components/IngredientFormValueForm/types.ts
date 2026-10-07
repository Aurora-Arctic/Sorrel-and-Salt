import type { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';

/** A form group the form can be filed under: the choices of the Group field. */
export interface IngredientFormGroupChoice {
  id: string;
  name: string;
}

/** The form being edited, as the admin's form starts from it. */
export interface EditedIngredientFormValue extends IngredientFormValueValues {
  id: string;
}

export interface IngredientFormValueFormProps {
  /** The form to edit; none adds one. */
  formValue?: EditedIngredientFormValue;
  /** Every live form group, alphabetical (MB.35). */
  groups: readonly IngredientFormGroupChoice[];
  /** Called once the form is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}

/**
 * The fields as typed, the group `''` until one is chosen. `endRedirect` is
 * not one: it is the confirmation a refused rename asks for, added to the
 * input it is sent again with.
 */
export type IngredientFormValueValues = Omit<IngredientFormValueInput, 'endRedirect'>;

/**
 * A save refused until the admin confirms ending a redirect: what it said,
 * the input to send again, and the fields as they were typed, so an edit
 * withdraws it.
 */
export interface RedirectQuestion {
  message: string;
  input: IngredientFormValueValues;
  typed: IngredientFormValueValues;
}
