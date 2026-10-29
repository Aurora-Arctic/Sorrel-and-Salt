// Where the focus goes in a modal's body when nothing else says: its first
// field. The modal's open puts it there, and a question over the form gives
// it back there when what had it has gone (claude-docs/components/modal.md).

/** A field a person can type into or choose in: not a hidden input, not disabled. */
export const FIRST_FIELD =
  'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)';

/**
 * Whether the field is shown: under no `hidden` ancestor, as a closed
 * section of the ingredient form keeps its fields, and laid out where the
 * browser can tell (happy-dom cannot, and lays nothing out). A `data-focus-skip`
 * wrapper marks a field the open never lands on, such as a switch at a form's foot.
 */
const isShown = (field: HTMLElement): boolean =>
  field.closest('[hidden]') === null &&
  field.closest('[data-focus-skip]') === null &&
  (typeof field.checkVisibility !== 'function' || field.checkVisibility());

/** The first field shown in the scope, or null when it holds none. */
export const firstShownField = (scope: ParentNode): HTMLElement | null =>
  [...scope.querySelectorAll<HTMLElement>(FIRST_FIELD)].find(isShown) ?? null;
