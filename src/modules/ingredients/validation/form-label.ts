import { titleCase } from '@/lib/text';

/**
 * A form as the screen says it: "dried leaf" is "Dried Leaf". Every place a form is shown goes through this, and the lint rule
 * `sorrel/form-shown-through-form-label` holds that. Display only: a stored form is never rewritten.
 */
export function formLabel(form: string): string {
  return titleCase(form);
}
