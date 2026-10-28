import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { SpellBuilderStepsQuery } from '../../gql/graphql';
import type { FieldProps } from '../Field/types';
import type { SpellStepSend, SpellStepValue } from './steps/types';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

/**
 * A saved step as the builder opens it. Typed off the steps read; both save
 * mutations write the same selection out (./steps/documents.ts says why), and
 * their answers are checked against this where the builder reads them.
 */
export type SpellBuilderStep = SpellBuilderStepsQuery['spell']['steps'][number];

/** The builder's fields, M10.12's: what the spell is called, what it is for, and its jar. */
export type SpellBuilderField =
  'title' | 'intent' | 'jarDescription' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

/**
 * The form's values: each field as typed, blank for none, who can see the
 * spell (M10.13), the ids of the categories it is assigned (M10.14), none for
 * none, and the jar's steps (M10.15).
 */
export type SpellBuilderValues = Record<SpellBuilderField, string> & {
  visibility: SpellVisibility;
  /** Draft or complete (M10.20): the saved spell's, changed only by the status control. */
  status: SpellStatus;
  categoryIds: string[];
  steps: SpellStepValue[];
};

/**
 * The form's values as a save sends them: trimmed, and null for blank, as the
 * schema reads them; each step as its input; and the categories only when
 * they changed (M10.14).
 */
export type SpellBuilderInput = Record<SpellBuilderField, string | null> & {
  visibility: SpellVisibility;
  status: SpellStatus;
  categoryIds?: string[];
  steps: SpellStepSend[];
};

/** A saved spell the builder opens, as the `spell` query answers it (M13.10). */
export type SpellBuilderSpell = {
  id: string;
  /** The revision it was read at, sent back with the next save as `expectedRevision`. */
  revision: number;
  /** Who can see it: its author alone, or the whole coven, which is for good (M10.13). */
  visibility: SpellVisibility;
  /** Draft or complete (M10.20); left out, a draft. */
  status?: SpellStatus;
  /** Its recipe in order (M10.15): required, so a page opening a saved spell must read them. */
  steps: SpellBuilderStep[];
} & Record<SpellBuilderField, string | null> & {
    /** The categories it is assigned (M10.14); left out, none. */
    categoryIds?: readonly string[];
  };

export interface SpellBuilderProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /** A saved spell to edit; left out, the builder opens empty and its first save creates one. */
  spell?: SpellBuilderSpell;
  /**
   * Called with the spell the builder's first save created, whichever save
   * that is: Save now, M13.17's autosave later. Not called when the save is
   * the one Close asked for, which leaves the builder.
   */
  onCreated?: (spell: SpellBuilderSpell) => void;
  /**
   * Whether `spell`'s steps are still on their way (`loading`) or could not be
   * read (`failed`); left out, `spell.steps` are its steps. Until they are, the
   * jar shows its loading state and nothing is sent: an update's `steps` is the
   * whole recipe, so one sent now would remove the steps not yet shown.
   */
  stepsRead?: 'loading' | 'failed';
}

/** A saved spell as the grimoire page reads it for `?edit=<id>`: the dialog reads its steps after. */
export type SpellDialogSpell = Omit<SpellBuilderSpell, 'steps'>;

/** What the address opens the builder's dialog on: a new spell (`?new=spell-<slug>`), or a saved one (`?edit=<id>`). */
export interface SpellDialogOpened {
  /** The saved spell `?edit=<id>` names; left out for `?new=spell-<slug>`. */
  spell?: SpellDialogSpell;
}

export interface SpellDialogProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /** That coven's slug, which `?new=spell-<slug>` names. */
  covenSlug: string;
  /** That coven's name, which New Spell's head names as where the spell lands. */
  covenName: string;
  /**
   * The grimoire tab it opened over, as it was, the dialog's parameter dropped. A new
   * draft's first save moves to it with `edit=<id>` added.
   */
  closeHref: Route;
  /** What the server read from the address; left out, it opens nothing. */
  opened?: SpellDialogOpened;
  /**
   * Whether this member may create a spell. `?new=spell-<slug>` opens the empty builder from the
   * browser's address alone when true, before the server has read it.
   */
  canCreate: boolean;
}

export interface SpellSuggestFieldProps extends Pick<FieldProps, 'label' | 'hint'> {
  name: SpellBuilderField;
  /** A short action shown, muted, while the box is empty: "Add a phase". */
  placeholder?: string;
  /** What the box suggests, narrowed to what is typed; anything else typed is kept as typed. */
  options: readonly string[];
  /**
   * A decorative mark for a value, drawn before it in the list and in the
   * box; `null` for a value with none, such as one typed outside the list.
   */
  icon?: (value: string) => ReactNode;
}

export interface SpellStatusFieldProps {
  /** Saves the form with the given values, as Save Spell does; it reports a refusal itself. */
  save: (values: SpellBuilderInput) => Promise<void>;
}

export interface SpellVisibilityFieldProps {
  /** The spell is saved, so its visibility is the saved one's: Only Me may widen, Coven is for good. */
  created: boolean;
  /** Saves the form with the given values, as Save Spell does; it reports a refusal itself. */
  save: (values: SpellBuilderInput) => Promise<void>;
}

/** The builder's save-on-close guard (`useSaveOnClose`), told how each save ended. */
export interface SaveOnClose {
  /** A save landed: closes the modal if Close was waiting on it, answering whether it did. */
  saved: () => boolean;
  /** A save was refused, or the fields did not pass: the modal stays open. */
  refused: () => void;
}
