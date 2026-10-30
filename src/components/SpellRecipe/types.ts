import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SpellStepValue, StepCategory } from '../SpellBuilder/steps/types';
import type { GroupColors } from '../../lib/types';
import type { StockDialogProps } from '../StockDialog/types';
import type { SafetyMarkProps } from '../SafetyNote/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';
import type { VerdictKind } from '../SpellBuilder/verdict-mark';
import type { IngredientRow } from '@/modules/ingredients';

/** A step that does something in words: "Stir three times", with no ingredient. */
export interface InstructionRecipeStep {
  kind: 'instruction';
  id: string;
  body: string;
}

/**
 * A step that lays an ingredient: a coven or compendium ingredient the cupboard names, or a
 * one-off the author typed. Worked out by the page from the service's step views.
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
  /** The form laid, as an id: steps sharing one are one line in the print summary. Null for a one-off. */
  variantId: string | null;
  /** The amount, as written; null for none ("a pinch" has no number). */
  quantity: string | null;
  unit: string | null;
  /**
   * What the step's Quick Look eye opens: the ingredient's details modal over the coven's
   * ingredients, with what the modal's head needs. The name itself is no link. Null for a one-off,
   * or an ingredient since deleted.
   */
  look: IngredientLook | null;
  /** The ingredient's and the laid form's safety, for the Toxic and Caution marks; null for a one-off. */
  safety: Pick<SafetyMarkProps, 'toxic' | 'safetyNotes' | 'variants'> | null;
  /**
   * The coven’s stock verdict on the step, as In Coven Inventory gives it: drawn in the row only
   * where the recipe has no side column (the Quick Look modal). Left out on the page.
   */
  supply?: VerdictKind | null;
  oneOff: boolean;
  /** The ingredient or its form has been deleted since; the step still says what went in. */
  deleted: boolean;
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
  /** The Edit control, for a role that may update the spell. */
  action?: ReactNode;
  /** The Workings section (`SpellWorkings`), beneath the body; the Quick Look modal gives none. */
  workings?: ReactNode;
  /** The page's side column (`SpellRecipeAside`), beside the body; the Quick Look modal gives none. */
  aside?: ReactNode;
}

/**
 * An In Coven Inventory line's doors on the recipe page: the
 * Quick Look eye beside the name, and Edit Stock behind the jar and the name, each null where
 * there is nothing to open (the ingredient deleted since; a role that may not update stock).
 */
export interface InventoryDoor {
  stepId: string;
  look: IngredientLook | null;
  stock: StockDialogProps | null;
}

/**
 * What the recipe page's side column draws: the spell's steps as the builder's Jar
 * aside holds them, the categories the spell is assigned, and each category's group colours
 * as entries, since a Map cannot cross from the server page to the client component.
 */
export interface SpellRecipeAsideProps {
  steps: SpellStepValue[];
  /** Each linked step's doors; a one-off or an instruction has none. */
  doors: InventoryDoor[];
  intended: StepCategory[];
  groups: [string, GroupColors][];
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

/** The level of the recipe's Steps and Ingredients headings: 2 under the page's h1, 3 under a dialog's or pane's h2. */
export type RecipeHeadingLevel = 2 | 3;

export interface SpellRecipeSummaryProps {
  steps: readonly RecipeStep[];
  /** The Ingredients heading's level, one below the heading it sits under. Defaults to 2. */
  level?: RecipeHeadingLevel;
}

/** The spell a Quick Look modal is open on; the body arrives as the page's rendered children. */
export interface SpellLookOpened {
  /** The spell's title; a draft may have none. */
  title: string | null;
  lastEdit: LastEditProps | null;
  /** The spell's recipe page, which the foot links to. */
  recipeHref: Route;
  /** Where Edit Spell opens the spell in the builder, for a role that may update it; none draws no Edit Spell. */
  editHref?: Route;
  /** What Delete Spell needs, for a role that may delete the spell; none draws no bin. */
  deleteSpell?: Omit<DeleteSpellActionProps, 'name'>;
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

/** Delete Spell's bin and dialog on the recipe page. */
export interface DeleteSpellActionProps {
  workspaceId: string;
  spellId: string;
  /** The spell's name as the page shows it, Untitled Spell for a draft with none. */
  name: string;
  /** The grimoire tab the page leaves for, with what was deleted in its address. */
  deletedHref: Route;
  /** Who loses the spell: the question names the coven only for a shared one, and left out says neither. */
  visibility?: SpellVisibility;
}

/** The recipe page's three dots: Duplicate for a role that may create a spell, Delete Spell for one that may delete. */
export interface SpellMoreMenuProps extends DeleteSpellActionProps {
  /** The coven's slug, which the copy's address needs. */
  covenSlug: string;
  canDuplicate: boolean;
  canDelete: boolean;
  /** Print is the recipe page's alone: a card's menu leaves it out, and with nothing else draws no menu. */
  canPrint: boolean;
}
