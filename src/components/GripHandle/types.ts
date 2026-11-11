import type { useSortable } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';

export interface GripHandleProps {
  /** The sortable the handle moves. */
  sortable: ReturnType<typeof useSortable>;
  /** What the item is called; the handle reads "Move <name>". */
  name: string;
  className: string;
  /** Ids to read after dnd-kit's own instructions. */
  describedBy?: string;
  /** Stops the handle taking a drag, as a row held still does. */
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Drawn after the grip, as a combobox entry's text is. */
  children?: ReactNode;
}
