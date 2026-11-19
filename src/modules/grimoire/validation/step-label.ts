import { formLabel } from '@/modules/ingredients/validation/form-label';

/** How a step names its ingredient and form; the recipe, the builder and the correspondences all say it this way. */
export function stepLabelOf(name: string, form: string | null): string {
  return form ? `${name} (${formLabel(form)})` : name;
}
