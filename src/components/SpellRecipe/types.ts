import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { CardCategory } from '../CategoryChips/types';
import type { LastEditProps } from '../LastEdit/types';
import type { SpellStepValue, StepCategory } from '../SpellBuilder/steps/types';
import type { GroupColors } from '../../lib/types';
import type { StockDialogProps } from '../StockDialog/types';
import type { SafetyMarkProps } from '../SafetyNote/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';
import type { SpellMarksProps } from '../SpellMarks/types';
import type { VerdictKind } from '../SpellBuilder/verdict-mark';
import type { IngredientRow } from '@/modules/ingredients';

export interface InstructionRecipeStep {
  kind: 'instruction';
  id: string;
  body: string;
}

export interface IngredientRecipeStep {
  kind: 'ingredient';
  id: string;
  name: string;
  form: string | null;
  /**
   * The ingredient's formal name, set only where another ingredient step in the spell has the
   * same label, so the two can be told apart. Null otherwise.
   */
  formal: string | null;
  variantId: string | null;
  quantity: string | null;
  unit: string | null;
  /**
   * What the step's Quick Look eye opens: the ingredient's details modal over the coven's
   * ingredients, with what the modal's head needs. The name itself is no link. Null for a one-off,
   * or an ingredient since deleted.
   */
  look: IngredientLook | null;
  safety: Pick<SafetyMarkProps, 'toxic' | 'safetyNotes' | 'variants'> | null;
  supply?: VerdictKind | null;
  oneOff: boolean;
  /** The ingredient or its form has been deleted since; the step still says what went in. */
  deleted: boolean;
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
  title: string | null;
  intent: string | null;
  status: SpellStatus;
  visibility: SpellVisibility;
  categories: readonly CardCategory[];
  lastEdit: LastEditProps | null;
  note: string | null;
  steps: readonly RecipeStep[];
  jarDescription?: string | null;
  sealWaxColor?: string | null;
  moonPhase?: string | null;
  dayOfWeek?: string | null;
  back: { href: Route; label: string };
  action?: ReactNode;
  workings?: ReactNode;
  aside?: ReactNode;
}

/**
 * A line's doors on the recipe page: the
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
  doors: InventoryDoor[];
  intended: StepCategory[];
  groups: [string, GroupColors][];
}

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

export type RecipeHeadingLevel = 2 | 3;

export type SpellRecipeLeadProps = Pick<SpellRecipeBodyProps, 'title' | 'intent' | 'categories'>;

export type SpellRecipeRestProps = Omit<SpellRecipeBodyProps, keyof SpellRecipeLeadProps> & {
  beforeSteps?: ReactNode;
  level?: RecipeHeadingLevel;
};

export interface SpellRecipeSummaryProps {
  steps: readonly RecipeStep[];
  level?: RecipeHeadingLevel;
}

export interface SpellLookOpened extends SpellMarksProps {
  title: string | null;
  lastEdit: LastEditProps | null;
  recipeHref: Route;
  editHref?: Route;
  children: ReactNode;
}

export interface SpellLookDialogProps {
  closeHref: Route;
  opened?: SpellLookOpened;
  failed?: boolean;
}

export interface DeleteSpellActionProps {
  workspaceId: string;
  spellId: string;
  name: string;
  deletedHref: Route;
  visibility?: SpellVisibility;
}

export interface SpellMoreMenuProps extends DeleteSpellActionProps {
  covenSlug: string;
  canDuplicate: boolean;
  canDelete: boolean;
  /** Print is the recipe page's alone: a card's menu leaves it out, and alone it is a Print button, not a menu. */
  canPrint: boolean;
}
