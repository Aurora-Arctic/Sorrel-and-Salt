import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { SpellBuilderStepsQuery } from '../../gql/graphql';
import type { FieldProps } from '../Field/types';
import type { PickerCategory } from '../CategoryPicker/types';
import type { GroupColors } from '../../lib/types';
import type { SpellStepSend, SpellStepValue } from './steps/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

/**
 * A saved step as the builder opens it. Typed off the steps read; both save
 * mutations write the same selection out (./steps/documents.ts says why), and
 * their answers are checked against this where the builder reads them.
 */
export type SpellBuilderStep = SpellBuilderStepsQuery['spell']['steps'][number];

export type SpellBuilderField =
  'title' | 'intent' | 'jarDescription' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

export type SpellBuilderValues = Record<SpellBuilderField, string> & {
  visibility: SpellVisibility;
  status: SpellStatus;
  categoryIds: string[];
  steps: SpellStepValue[];
};

/**
 * The form's values as a save sends them: trimmed, and null for blank, as the
 * schema reads them; each step as its input; and the categories only when
 * they changed.
 */
export type SpellBuilderInput = Record<SpellBuilderField, string | null> & {
  visibility: SpellVisibility;
  status: SpellStatus;
  categoryIds?: string[];
  steps: SpellStepSend[];
};

export type SpellBuilderSpell = {
  id: string;
  revision: number;
  /** When the row was last saved, as an ISO time: a browser copy newer than this holds unsaved changes. */
  updatedAt?: string;
  visibility: SpellVisibility;
  status?: SpellStatus;
  /** Its recipe in order: required, so a page opening a saved spell must read them. */
  steps: SpellBuilderStep[];
} & Record<SpellBuilderField, string | null> & {
    categoryIds?: readonly string[];
  };

export interface SpellBuilderProps {
  workspaceId: string;
  covenSlug?: string;
  /** The signed-in member, whose browser copy of the draft is the one offered back; left out, no copy is kept. */
  userId?: string;
  spell?: SpellBuilderSpell;
  onCreated?: (spell: SpellBuilderSpell) => void;
  /**
   * Whether `spell`'s steps are still on their way (`loading`) or could not be read (`failed`). Until they are, nothing
   * is sent: an update's `steps` is the whole recipe, so one sent now would remove the steps not yet shown.
   */
  stepsRead?: 'loading' | 'failed';
  deletedHrefOf?: (title: string | null) => Route;
  copiedHrefOf?: (id: string) => Route;
}

export type SpellDialogSpell = Omit<SpellBuilderSpell, 'steps'>;

export interface SpellDialogOpened {
  spell?: SpellDialogSpell;
}

export interface SpellDialogProps {
  workspaceId: string;
  covenSlug: string;
  covenName: string;
  closeHref: Route;
  opened?: SpellDialogOpened;
  /**
   * Whether this member may create a spell. `?new=spell-<slug>` opens the empty builder from the
   * browser's address alone when true, before the server has read it.
   */
  canCreate: boolean;
  canDelete?: boolean;
  /** Where a delete leaves for, when not `closeHref`: the recipe page, which the deleted spell's own address cannot stay on. */
  deletedFromHref?: Route;
  canDuplicate?: boolean;
  /** The signed-in member; the builder keeps its browser copy of a draft under this id. */
  userId?: string;
}

export interface SpellSuggestFieldProps extends Pick<FieldProps, 'label' | 'hint'> {
  name: SpellBuilderField;
  placeholder?: string;
  options: readonly string[];
  icon?: (value: string) => ReactNode;
}

export interface SpellStatusFieldProps {
  name: string;
  workspaceId: string;
  /** The saved spell's id; none until the first save. */
  spellId: string | null;
  copiedHrefOf?: (id: string) => Route;
  flush: () => Promise<void>;
}

export interface SpellVisibilityFieldProps {
  name: string;
  /** The spell is saved, so its visibility is the saved one's: a draft's moves either way, a complete one's only widens. */
  created: boolean;
  flush: () => Promise<void>;
}

export interface CategoryIndex {
  categories: PickerCategory[];
  names: ReadonlyMap<string, string>;
  colors: ReadonlyMap<string, GroupColors>;
  isPending: boolean;
  isError: boolean;
}
