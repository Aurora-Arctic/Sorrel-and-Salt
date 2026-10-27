import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import { compareSpellCategories } from '../categories/compare';
import { listGrimoire, readSpell } from '../services/spell-reads';
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
