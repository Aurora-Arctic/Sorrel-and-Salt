import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { FieldProps } from '../Field/types';

/** The builder's fields, M10.12's: what the spell is called, what it is for, and its jar. */
export type SpellBuilderField =
  'title' | 'intent' | 'jarDescription' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

/** The form's values: each field as typed, blank for none. */
export type SpellBuilderValues = Record<SpellBuilderField, string>;

/** A saved spell the builder opens, as the `spell` query answers it (M13.10). */
export type SpellBuilderSpell = {
  id: string;
  /** The revision it was read at, sent back with the next save as `expectedRevision`. */
  revision: number;
} & Record<SpellBuilderField, string | null>;

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
}

/** What the address opens the builder's dialog on: a new spell (`?new=spell`), or a saved one (`?edit=<id>`). */
export interface SpellDialogOpened {
  /** The saved spell `?edit=<id>` names; left out for `?new=spell`. */
  spell?: SpellBuilderSpell;
}

export interface SpellDialogProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /**
   * The grimoire tab it opened over, as it was, the dialog's parameter dropped. A new
   * draft's first save moves to it with `edit=<id>` added.
   */
  closeHref: Route;
  /** What the server read from the address; left out, it opens nothing. */
  opened?: SpellDialogOpened;
  /**
   * Whether this member may create a spell. `?new=spell` opens the empty builder from the
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

/** The builder's save-on-close guard (`useSaveOnClose`), told how each save ended. */
export interface SaveOnClose {
  /** A save landed: closes the modal if Close was waiting on it, answering whether it did. */
  saved: () => boolean;
  /** A save was refused, or the fields did not pass: the modal stays open. */
  refused: () => void;
}
