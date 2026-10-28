import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { compareSpellCategories } from '../validation/categories/compare';
import { listGrimoire, readSpell } from '../services/spell-reads';
import { createSpell, updateSpell } from '../services/spells';
import { clearSpell } from '../loaders/spell-children';
import { GRIMOIRE_ORDERS, spellStatus, spellVisibility } from '../schema/spells';
import type { SpellRow, SpellStepView } from '../types';
import { IngredientRef, IngredientVariantRef, InventoryUnitEnum } from '@/modules/ingredients';
import { CategoryRef, type CategoryRow } from '@/modules/vocabulary';

// The grimoire over the wire (M10.9): a coven's spells a page at a time, one
// spell by id, and each spell's steps and its two kinds of category. Every
// field a list could repeat per spell reads through a loader, so a page of
// spells costs a fixed number of statements, not one per spell (CLAUDE.md
// rule 9). The resolvers hold no check and no query: which spells a member
// may read is the grimoire service's, which keeps a private spell its
// author's in SQL (claude-docs/graphql/schema.md, "The grimoire").

const SpellVisibilityEnum = builder.enumType('SpellVisibility', {
  description: 'Who reads a spell: its author alone, or every member of its coven.',
  values: spellVisibility.enumValues,
});

const SpellStatusEnum = builder.enumType('SpellStatus', { values: spellStatus.enumValues });

// How a grimoire page is ordered (M10.9), an argument rather than a field.
const GrimoireOrderEnum = builder.enumType('GrimoireOrder', {
  values: GRIMOIRE_ORDERS,
  description:
    'How a grimoire page is ordered: UPDATED_DESC, last edited first (the default); CREATED_DESC, newest first; or TITLE_ASC, by title, untitled spells last.',
});

/** `numeric` text as Postgres returns it, as a number; null stays null. */
const amount = (value: string | null) => (value === null ? null : Number(value));

/** The gap between what a spell intends and what its ingredients carry, as categories. */
type CategoryGaps = { intendedNotPresent: CategoryRow[]; presentNotIntended: CategoryRow[] };

const CategoryComparisonRef = builder.objectRef<CategoryGaps>('CategoryComparison').implement({
  description: "A spell's assigned categories set beside its ingredients', both ways.",
  fields: (t) => ({
    intendedNotPresent: t.field({
      type: [CategoryRef],
      description: 'Assigned to the spell, but carried by no ingredient in it.',
      resolve: (gaps) => gaps.intendedNotPresent,
    }),
    presentNotIntended: t.field({
      type: [CategoryRef],
      description: 'Carried by an ingredient in the spell, but not assigned to it.',
      resolve: (gaps) => gaps.presentNotIntended,
    }),
  }),
});

const SpellStepRef = builder.objectRef<SpellStepView>('SpellStep').implement({
  description: 'One step of a recipe: an ingredient laid, an instruction, or both.',
  fields: (t) => ({
    id: t.exposeID('id'),
    // `position` is null on a row written before M13.1 filled it; `layerOrder`
    // is the same order under its old name, so the wire never shows a gap.
    position: t.int({ resolve: (step) => step.position ?? step.layerOrder }),
    body: t.exposeString('body', {
      nullable: true,
      description: 'The instruction; null on an ingredient-only step.',
    }),
    ingredient: t.field({
      type: IngredientRef,
      nullable: true,
      description:
        'The ingredient laid, kept once deleted; null on a one-off row and an instruction-only step.',
      resolve: (step) => step.ingredient,
    }),
    name: t.string({
      nullable: true,
      description:
        "The linked ingredient's name in this coven; the one-off row's own otherwise; null on an instruction-only step.",
      resolve: (step) => step.ingredient?.name ?? step.name,
    }),
    variant: t.field({
      type: IngredientVariantRef,
      nullable: true,
      description: 'The form laid, on a linked step, still shown once deleted since.',
      resolve: (step) => step.variant,
    }),
    form: t.string({
      nullable: true,
      description: "The linked form's name; the one-off row's free text otherwise.",
      resolve: (step) => step.variant?.form ?? step.form,
    }),
    quantity: t.float({ nullable: true, resolve: (step) => amount(step.quantity) }),
    unit: t.expose('unit', { type: InventoryUnitEnum, nullable: true }),
    note: t.exposeString('note', { nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (step) => step }),
  }),
});

const key = (spell: SpellRow) => ({ id: spell.id, workspaceId: spell.workspaceId });

export const SpellRef = builder.objectRef<SpellRow>('Spell').implement({
  description: "A coven's working: what it intends, and the recipe that makes it.",
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title', {
      nullable: true,
      description:
        'Null on a draft not yet named: only a complete spell must carry a title (M13.15).',
    }),
    intent: t.exposeString('intent', { nullable: true }),
    jarDescription: t.exposeString('jarDescription', { nullable: true }),
    sealWaxColor: t.exposeString('sealWaxColor', { nullable: true }),
    moonPhase: t.exposeString('moonPhase', { nullable: true }),
    dayOfWeek: t.exposeString('dayOfWeek', { nullable: true }),
    visibility: t.expose('visibility', { type: SpellVisibilityEnum }),
    status: t.expose('status', { type: SpellStatusEnum }),
    categories: t.field({
      type: [CategoryRef],
      description: 'What the spell intends: the categories its author assigned.',
      resolve: (spell, _args, { loaders }) => loaders.assignedCategoriesBySpell.load(key(spell)),
    }),
    derivedCategories: t.field({
      type: [CategoryRef],
      description:
        'What the spell is made of: every category its linked ingredients and their forms carry. A one-off row contributes none.',
      resolve: (spell, _args, { loaders }) => loaders.derivedCategoriesBySpell.load(key(spell)),
    }),
    categoryGaps: t.field({
      type: CategoryComparisonRef,
      resolve: async (spell, _args, { loaders }) => {
        const [assigned, derived] = await Promise.all([
          loaders.assignedCategoriesBySpell.load(key(spell)),
          loaders.derivedCategoriesBySpell.load(key(spell)),
        ]);
        const byId = new Map([...assigned, ...derived].map((row) => [row.id, row]));
        const gaps = compareSpellCategories(
          assigned.map((row) => row.id),
          derived.map((row) => row.id),
        );
        return {
          intendedNotPresent: gaps.intendedNotPresent.map((id) => byId.get(id)!),
          presentNotIntended: gaps.presentNotIntended.map((id) => byId.get(id)!),
        };
      },
    }),
    note: t.exposeString('note', { nullable: true }),
    steps: t.field({
      type: [SpellStepRef],
      description: 'The recipe: every step in position order, instructions included.',
      resolve: (spell, _args, { loaders }) => loaders.stepsBySpell.load(key(spell)),
    }),
    revision: t.exposeInt('revision', {
      description:
        'Raised by one on every save; a save names the revision it was written against (M13.15).',
    }),
    audit: t.field({ type: AuditInfo, resolve: (spell) => spell }),
  }),
});

builder.queryField('grimoire', (t) =>
  t.pagedConnection({
    type: SpellRef,
    description:
      "A coven's spells: the shared ones and the caller's own private ones, in `orderBy`, of `status` when given, matching `query` when given and ranked best match first.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      orderBy: t.arg({ type: GrimoireOrderEnum, required: true, defaultValue: 'UPDATED_DESC' }),
      // Absent means both.
      status: t.arg({ type: SpellStatusEnum }),
      // Searches title and intent; under two characters it is no search.
      query: t.arg.string(),
    },
    resolve: (_root, { workspaceId, orderBy, status, query }, page, context) =>
      listGrimoire(sessionOf(context), workspaceId, page, {
        order: orderBy,
        status: status ?? undefined,
        query: query ?? undefined,
      }),
  }),
);

builder.queryField('spell', (t) =>
  t.field({
    type: SpellRef,
    args: {
      id: t.arg.id({ required: true }),
      // Names the coven the spell is asked about in, as `ingredient` does, so
      // the membership check needs no read to find it.
      workspaceId: t.arg.id({ required: true }),
    },
    resolve: (_root, { id, workspaceId }, context) =>
      readSpell(sessionOf(context), workspaceId, id),
  }),
);

// The saves (M10.10). Each sends the whole recipe as one ordered list, so a
// step's place is its index; claude-docs/graphql/schema.md, "The grimoire",
// says how a step is kept, added and removed.

const SpellStepInputRef = builder.inputType('SpellStepInput', {
  description:
    'One step of a recipe: an instruction, an ingredient, or both. The ingredient is linked (ingredientId with variantId) or written for this jar (name, with form).',
  fields: (t) => ({
    id: t.id({ description: 'A saved step this one is; left out, the step is new.' }),
    body: t.string(),
    ingredientId: t.id(),
    variantId: t.id({ description: 'The form laid; set exactly when ingredientId is.' }),
    name: t.string(),
    form: t.string(),
    quantity: t.float(),
    unit: t.field({ type: InventoryUnitEnum }),
    note: t.string(),
  }),
});

// Both saves take every spell field, each nullable: only a complete spell
// must carry a title, which the service checks.
const SpellInputRef = builder.inputType('SpellInput', {
  description: 'A new spell: a draft needs nothing but its status.',
  fields: (t) => ({
    title: t.string({ description: 'Required once the status is complete.' }),
    intent: t.string(),
    jarDescription: t.string(),
    sealWaxColor: t.string(),
    moonPhase: t.string(),
    dayOfWeek: t.string(),
    note: t.string(),
    status: t.field({ type: SpellStatusEnum }),
    visibility: t.field({ type: SpellVisibilityEnum }),
    steps: t.field({ type: [SpellStepInputRef], description: 'The recipe, in order.' }),
    categoryIds: t.idList({
      description:
        'The categories the spell is assigned: what it intends, not what its ingredients bring.',
    }),
  }),
});

const UpdateSpellInputRef = builder.inputType('UpdateSpellInput', {
  description:
    'Changes a spell: a field left out keeps its value, and null clears it. Visibility only widens.',
  fields: (t) => ({
    title: t.string({ description: 'Required once the status is complete.' }),
    intent: t.string(),
    jarDescription: t.string(),
    sealWaxColor: t.string(),
    moonPhase: t.string(),
    dayOfWeek: t.string(),
    note: t.string(),
    status: t.field({ type: SpellStatusEnum }),
    visibility: t.field({ type: SpellVisibilityEnum }),
    steps: t.field({
      type: [SpellStepInputRef],
      description:
        'The whole recipe, in order: a saved step left out is removed. Left out, the recipe is unchanged.',
    }),
    categoryIds: t.idList({
      description:
        'The whole set of categories the spell is assigned: one left out is unassigned. Left out, they are unchanged.',
    }),
    // Nullable, since null is an answer, but never optional: GraphQL cannot
    // say "present, maybe null", so the service's schema refuses a save that
    // leaves it out, and a client that forgets it overwrites nobody's save.
    expectedRevision: t.int({
      description:
        'Required, though it may be null: the revision this save was written against, which a newer one refuses. Null writes regardless.',
    }),
  }),
});

/**
 * A status, visibility, recipe or category list sent as null, read as left
 * out: none of the four can be cleared that way (an empty list clears the
 * last two), and GraphQL lets any nullable input field be null.
 */
function unstated<
  T extends { status?: unknown; visibility?: unknown; steps?: unknown; categoryIds?: unknown },
>(input: T) {
  return {
    status: input.status ?? undefined,
    visibility: input.visibility ?? undefined,
    steps: input.steps ?? undefined,
    categoryIds: input.categoryIds ?? undefined,
  } as {
    [K in 'status' | 'visibility' | 'steps' | 'categoryIds']: NonNullable<T[K]> | undefined;
  };
}

builder.mutationField('createSpell', (t) =>
  t.field({
    type: SpellRef,
    description: 'Writes a new spell and its recipe in one save.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({ type: SpellInputRef, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, input }, { loaders, ...context }) => {
      const spell = await createSpell(sessionOf(context), workspaceId, {
        ...input,
        ...unstated(input),
      });
      clearSpell(loaders, spell);
      return spell;
    },
  }),
);

builder.mutationField('updateSpell', (t) =>
  t.field({
    type: SpellRef,
    description:
      "Saves a spell's fields and, when given, its whole recipe, against the revision it was read at.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateSpellInputRef, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id, input }, { loaders, ...context }) => {
      const spell = await updateSpell(sessionOf(context), workspaceId, id, {
        ...input,
        ...unstated(input),
        // Passed as sent, absent included, for the schema to refuse.
        expectedRevision: input.expectedRevision as number | null,
      });
      clearSpell(loaders, spell);
      return spell;
    },
  }),
);
