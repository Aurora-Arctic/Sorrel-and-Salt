// The icons a form group may carry, written once: the `form_group_icon` pgEnum, the Zod input, the form seed and the `FormIcon` component all read this list.
// It imports nothing, so a client component reaches it; the generic icon is not in it (claude-docs/design-decisions/m12.6-form-icons.md).
export const FORM_GROUP_ICONS = [
  'botanical',
  'animal',
  'mineral',
  'substance',
  'fluid',
  'curio',
] as const;

export type FormGroupIcon = (typeof FORM_GROUP_ICONS)[number];
