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

/** The builder's fields: what the spell is called, what it is for, and its jar. */
export type SpellBuilderField =
  'title' | 'intent' | 'jarDescription' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

/**
 * The form's values: each field as typed, blank for none, who can see the
 * spell, the ids of the categories it is assigned, none for
 * none, and the jar's steps.
 */
export type SpellBuilderValues = Record<SpellBuilderField, string> & {
  visibility: SpellVisibility;
  /** Draft or complete: the saved spell's, changed only by the status control. */
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

/** A saved spell the builder opens, as the `spell` query answers it. */
export type SpellBuilderSpell = {
  id: string;
  /** The revision it was read at, sent back with the next save as `expectedRevision`. */
  revision: number;
  /** When the row was last saved, as an ISO time: a browser copy newer than this holds unsaved changes. */
  updatedAt?: string;
  /** Who can see it: its author alone, or the whole coven, which is for good. */
  visibility: SpellVisibility;
  /** Draft or complete; left out, a draft. */
  status?: SpellStatus;
  /** Its recipe in order: required, so a page opening a saved spell must read them. */
  steps: SpellBuilderStep[];
} & Record<SpellBuilderField, string | null> & {
    /** The categories it is assigned; left out, none. */
    categoryIds?: readonly string[];
  };

export interface SpellBuilderProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /** The coven's URL segment, for In Coven Inventory's Quick Look to link the entry's page; left out, the lines have no Quick Look. */
  covenSlug?: string;
  /** The signed-in member, whose browser copy of the draft is the one offered back; left out, no copy is kept. */
  userId?: string;
  /** A saved spell to edit; left out, the builder opens empty and its first save creates one. */
  spell?: SpellBuilderSpell;
  /**
   * Called with the spell the builder's first save created, whichever save
   * that is: the autosave's, Save's, Close's or Mark Complete's.
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
  /** The signed-in member; the builder keeps its browser copy of a draft under this id. */
  userId?: string;
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
  /** Saves everything the form holds now (the autosave's flush); rejects when the save is refused. */
  flush: () => Promise<void>;
}

export interface SpellVisibilityFieldProps {
  /** The spell is saved, so its visibility is the saved one's: a draft's moves either way, a complete one's only widens. */
  created: boolean;
  /** Saves everything the form holds now (the autosave's flush); rejects when the save is refused. */
  flush: () => Promise<void>;
}
