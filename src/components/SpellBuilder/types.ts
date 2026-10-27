import type { ReactNode } from 'react';
import type { SpellBuilderStepFragment } from '../../gql/graphql';
import type { FieldProps } from '../Field/types';
import type { SpellStepValue } from './steps/types';

/** The builder's fields, M10.12's: what the spell is called, what it is for, and its jar. */
export type SpellBuilderField =
  'title' | 'intent' | 'jarSize' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

/** The form's values: each field as typed, blank for none, and the jar's steps (M10.15). */
export type SpellBuilderValues = Record<SpellBuilderField, string> & { steps: SpellStepValue[] };

/** A saved spell the builder opens, as the `spell` query answers it (M13.10). */
export type SpellBuilderSpell = {
  id: string;
  /** The revision it was read at, sent back with the next save as `expectedRevision`. */
  revision: number;
  /** Its recipe in order (M10.15): required, so a page opening a saved spell must read them. */
  steps: SpellBuilderStepFragment[];
} & Record<SpellBuilderField, string | null>;

export interface SpellBuilderProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /** A saved spell to edit; left out, the builder opens empty and its first save creates one. */
  spell?: SpellBuilderSpell;
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
