import { z } from 'zod';
import { RowId, optionalText } from '../../../lib/validation';
import type { SpellStatus, SpellVisibility } from '../types';
import { SpellStepInput } from './spell-step';

// A spell as the builder and the mutation both read it. Pure: it imports no
// server-only module, so the form runs the same schema the service does
// (claude-docs/validation.md).

// Both lists are written out because the table's enums would pull the database
// schema into the browser; the `satisfies` and a test keep each equal to its
// column.
const VISIBILITIES = ['private', 'workspace'] as const satisfies readonly SpellVisibility[];
const STATUSES = ['draft', 'complete'] as const satisfies readonly SpellStatus[];

// Kept apart from the rule below because Zod will not extend a schema that
// already carries a refinement, and the update input extends this one.
const SpellFields = z.object({
  // Optional here, required once the spell is complete (see `titleRule`). A
  // blank title is no title, as `optionalText` reads it.
  title: optionalText(),
  // What the spell is for, and the jar it is made in: free text, member-written (§5).
  intent: optionalText(),
  jarDescription: optionalText(),
  sealWaxColor: optionalText(),
  moonPhase: optionalText(),
  dayOfWeek: optionalText(),
  // `public` is deferred with the notes subsystem (§13).
  visibility: z.enum(VISIBILITIES, { error: 'Choose private or workspace' }).optional(),
  // Left out means the column's default (a draft) on create, and unchanged on
  // update.
  status: z.enum(STATUSES, { error: 'Choose draft or complete' }).optional(),
  // The spell's single free-text note; blank is none.
  note: optionalText(),
  // The recipe, in order: a step's place is its index.
  steps: z.array(SpellStepInput).default([]),
  // The categories the spell is assigned, what it intends, never the
  // ones derived from its ingredients. The whole set when given, so an id left
  // out is unassigned; left out altogether, they are unchanged on update and
  // none on create.
  categoryIds: z.array(z.string().trim()).optional(),
});

// Each category is an id. A repeat is not refused: a category is a chip, on
// or off, so one sent twice is one, and the service writes it once.
function categoryRule(spell: { categoryIds?: string[] }, context: z.RefinementCtx) {
  spell.categoryIds?.forEach((id, index) => {
    // Not a uuid names nothing, and would be a driver error at the comparison.
    if (!RowId.safeParse(id).success) {
      context.addIssue({
        code: 'custom',
        path: ['categoryIds', index],
        message: 'No such category',
      });
    }
  });
}

type StepIdentity = {
  id?: string | null;
  variantId?: string | null;
  ingredientId?: string | null;
  name?: string | null;
};

// Mirrors the unique index over a jar's live custom names, case aside
// (spell_steps_spell_id_custom_name_unique), and refuses a step named twice: each would
// otherwise reach the user as a database error. A linked form may repeat: a spell lays one
// form in as many steps as it likes.
function distinctSteps(spell: { steps?: StepIdentity[] }, context: z.RefinementCtx) {
  const seen = { id: new Set<string>(), name: new Set<string>() };
  const flag = (index: number, field: string, message: string) =>
    context.addIssue({ code: 'custom', path: ['steps', index, field], message });
  spell.steps?.forEach((step, index) => {
    if (step.id != null) {
      if (seen.id.has(step.id)) flag(index, 'id', 'This step is already in the recipe');
      seen.id.add(step.id);
    }
    if (step.ingredientId == null && step.name != null) {
      const name = step.name.toLowerCase();
      if (seen.name.has(name)) flag(index, 'name', 'This ingredient is already in the jar');
      seen.name.add(name);
    }
  });
}

/** Said on the title when a spell with none is marked complete: the schema's and the builder's alike. */
export const COMPLETE_NEEDS_TITLE = 'Give the spell a title before marking it complete';

// Mirrors the database CHECK `status <> 'complete' OR title IS NOT NULL`, so the
// database never refuses what validation passed. A draft saved as the member
// types may have no title yet.
function titleRule(
  spell: { title?: string | null; status?: SpellStatus },
  context: z.RefinementCtx,
) {
  if (spell.status === 'complete' && spell.title == null) {
    context.addIssue({
      code: 'custom',
      path: ['title'],
      message: COMPLETE_NEEDS_TITLE,
    });
  }
}

export const SpellInput = SpellFields.superRefine(titleRule)
  .superRefine(distinctSteps)
  .superRefine(categoryRule);

// An update also says which revision of the spell it was written against, so
// a save over someone else's change is caught (claude-docs/design-decisions/
// m13.14-plan.md, "Server contract"). Null overwrites without checking: the
// "Keep My Version" path. Required, never left out by accident. Revisions
// count from 1.
//
// An update is partial: a field left out is unchanged and a null clears it.
// The steps are the whole recipe when given, so a step left out of them is
// removed, and left out altogether they are unchanged.
export const UpdateSpellInput = SpellFields.extend({
  steps: z.array(SpellStepInput).optional(),
  expectedRevision: z
    .number({ error: 'Expected revision must be a number or null' })
    .int({ error: 'Expected revision must be a whole number' })
    .positive({ error: 'Expected revision must be at least 1' })
    .nullable(),
})
  .superRefine(titleRule)
  .superRefine(distinctSteps)
  .superRefine(categoryRule);
