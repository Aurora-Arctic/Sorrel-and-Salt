import { titleCase } from '@/lib/text';

/**
 * A form as the screen says it: "dried leaf" is "Dried Leaf". Every place a
 * variant's `form`, or a curated form's name, is shown goes through this, and
 * the lint rule `sorrel/form-shown-through-form-label` holds that. Display only: a stored form is
 * never rewritten, and a title-cased label folds (trimmed, lower-cased) to the
 * same identity as the text it came from, bar a run of inner spaces that the
 * label collapses.
 */
export function formLabel(form: string): string {
  return titleCase(form);
}
