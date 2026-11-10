import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { ComboboxOption } from '../Combobox/types';

export interface PickerGroup extends GroupColors {
  id: string;
  name: string;
}

export interface PickerCategory {
  id: string;
  name: string;
  description?: string | null;
  group: PickerGroup;
  /** How many entries picking it would leave, when the filter knows: read after the name, "Fire (9)". */
  count?: number;
}

export interface CategoryOption extends ComboboxOption {
  category: PickerCategory;
}

export interface CategoryPickerProps {
  /** The box's `name` attribute, which a form that moves focus by field name (an undo) finds it by. */
  boxName?: string;
  legend: string;
  hint?: string;
  entry: string;
  placeholder?: string;
  categories: readonly PickerCategory[];
  pending?: boolean;
  loading?: boolean;
  /** Names a pick's x with the noun, "Remove Category: Testward"; without it, "Remove Testward". */
  removeNoun?: string;
  hideZeros?: boolean;
  value: readonly string[];
  onChange: (ids: string[]) => void;
  invalid?: readonly string[];
  /** Id of the element error renders; set only while an error shows. */
  errorId?: string;
  error?: ReactNode;
  status?: string;
  action?: LegendAction;
}

export type Announce = (message: string) => void;

export type LegendAction = (announce: Announce) => ReactNode;

export interface CategoryIndex {
  categories: PickerCategory[];
  names: ReadonlyMap<string, string>;
  colors: ReadonlyMap<string, GroupColors>;
  isPending: boolean;
  isError: boolean;
}
