// The icons a form group may carry, written down once: the
// `form_group_icon` pgEnum in ingredient-forms.ts, the Zod input in
// ../validation/ingredient-form-group.ts, the form seed and M12.7's
// `FormIcon` component all read this list. Like ingredient-enums.ts it
// imports nothing, so a client component reaches it without dragging in
// drizzle-orm. A group with none draws the generic icon, which is why the
// generic is not in the list (claude-docs/design-decisions/m12.6-form-icons.md).
export const FORM_GROUP_ICONS = [
  'botanical',
  'animal',
  'mineral',
  'substance',
  'fluid',
  'curio',
] as const;

export type FormGroupIcon = (typeof FORM_GROUP_ICONS)[number];
