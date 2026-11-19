import type { ReactNode, Ref } from 'react';

export interface ReorderModeValue {
  /** The list's name; the toggle reads "Reorder <name>". */
  name: string;
  reordering: boolean;
  /** Whether a list is there to reorder, so the toggle is drawn. */
  listed: boolean;
  setReordering: (next: boolean) => void;
  /** Registers a list drawn inside the mode; the returned function unregisters it. */
  claimList: () => () => void;
}

export interface ReorderModeProps {
  /** What the list is called: "Steps", "Guides", a table's or a field's name. */
  name: string;
  /** The mode, for a caller that holds it; left out, the mode holds its own. */
  on?: boolean;
  onChange?: (next: boolean) => void;
  /** Offer the toggle only while a list inside calls `useReorderList`. */
  waitForList?: boolean;
  children: ReactNode;
}

export interface ReorderToggleProps {
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  /** Runs before the mode changes, with the state it changes to. */
  onPress?: (next: boolean) => void;
}
