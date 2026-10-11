import type { FieldDescription, FieldDescriptionInput } from './types';

/**
 * A field's ids, and the attributes that tie the control to its hint, note
 * and error: `aria-describedby` makes each read with the field — the hint
 * too, though its tip is closed — and `aria-invalid` is what draws the error
 * edge, so one cannot ship without the other.
 */
export function fieldDescription({
  id,
  hint,
  note,
  describedBy,
  error,
  invalid,
}: FieldDescriptionInput): FieldDescription {
  const hintId = `${id}-hint`;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const description = [hint && hintId, note && noteId, describedBy, error && errorId]
    .filter(Boolean)
    .join(' ');
  return {
    controlId: `${id}-control`,
    labelId: `${id}-label`,
    hintId,
    noteId,
    errorId,
    error,
    aria: {
      'aria-invalid': error || invalid ? true : undefined,
      'aria-describedby': description || undefined,
    },
  };
}
