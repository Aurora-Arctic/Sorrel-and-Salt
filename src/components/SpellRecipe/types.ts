import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SafetyMarkProps } from '../SafetyNote/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';
import type { IngredientRow } from '@/modules/ingredients';

/** A step that does something in words: "Stir three times", with no ingredient. */
export interface InstructionRecipeStep {
  kind: 'instruction';
  id: string;
  body: string;
}

/**
 * A step that lays an ingredient: a coven or compendium ingredient the cupboard names, or a
 * one-off the author typed (MB.40). Worked out by the page from the service's step views.
 */
export interface IngredientRecipeStep {
  kind: 'ingredient';
  id: string;
  /** What the ingredient is called in this coven, or the one-off's own name. */
  name: string;
  /** The form laid, as stored; the component sets it in title case. Null for none. */
  form: string | null;
  /**
   * The ingredient's formal name, set only where another ingredient step in the spell has the
   * same label, so the two can be told apart. Null otherwise.
   */
  formal: string | null;
  /** The amount, as written; null for none ("a pinch" has no number). */
  quantity: string | null;
  unit: string | null;
  /**
   * What the step's Quick Look eye opens: the ingredient's details modal over the coven's
   * ingredients (M8.19), with what the modal's head needs. The name itself is no link (the owner,
   * 2026-10-28). Null for a one-off, or an ingredient since deleted.
   */
  look: IngredientLook | null;
  /** The ingredient's and the laid form's safety, for the Toxic and Caution marks; null for a one-off. */
  safety: Pick<SafetyMarkProps, 'toxic' | 'safetyNotes' | 'variants'> | null;
  oneOff: boolean;
  /** The ingredient or its form has been deleted since; the step still says what went in. */
  deleted: boolean;
  /** The step's own line on the ingredient's role. */
  note: string | null;
  /** An instruction given on the same step. */
  body: string | null;
}

export interface IngredientLook extends Pick<
  IngredientRow,
  'name' | 'canonicalName' | 'nomenclature'
> {
  href: Route;
}

export type RecipeStep = InstructionRecipeStep | IngredientRecipeStep;

export interface SpellRecipeProps {
  /** The spell's title; a draft may have none. */
  title: string | null;
  intent: string | null;
  status: SpellStatus;
  visibility: SpellVisibility;
  categories: readonly CardCategory[];
  lastEdit: LastEditProps | null;
  /** The spell's single free-text note. */
  note: string | null;
  steps: readonly RecipeStep[];
  /** The four facts the body's strip draws; null or blank draws no cell. */
  jarDescription?: string | null;
  sealWaxColor?: string | null;
  moonPhase?: string | null;
  dayOfWeek?: string | null;
  /** The way back to the grimoire. */
  back: { href: Route; label: string };
  /** The Edit control, for a role that may update the spell (M13.10). */
  action?: ReactNode;
}

/** What the body below a spell's head draws, shared by the recipe page and the Quick Look modal. */
export type SpellRecipeBodyProps = Pick<
  SpellRecipeProps,
  | 'title'
  | 'intent'
  | 'categories'
  | 'note'
  | 'steps'
  | 'jarDescription'
  | 'sealWaxColor'
  | 'moonPhase'
  | 'dayOfWeek'
>;

/** The spell a Quick Look modal is open on (M13.21); the body arrives as the page's rendered children. */
export interface SpellLookOpened {
  /** The spell's title; a draft may have none. */
  title: string | null;
  lastEdit: LastEditProps | null;
  /** The spell's recipe page (MB.6), which the foot links to. */
  recipeHref: Route;
  /** Where Edit Spell opens the spell in the builder, for a role that may update it; none draws no Edit Spell. */
  editHref?: Route;
  children: ReactNode;
}

export interface SpellLookDialogProps {
  /** The list as it was, which closing returns to. */
  closeHref: Route;
  /** Absent when the address opens nothing. */
  opened?: SpellLookOpened;
  /** The read failed for a reason other than the spell being unavailable: a Notice says so. */
  failed?: boolean;
}
