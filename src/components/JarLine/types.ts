import type { ReactNode } from 'react';
import type { HeldJar } from '../JarShelf/types';
import type { StockJarButtonProps } from '../StockDialog/types';

/** The paint of a jar: the shelf's Low, Out and dashed-empty looks; `ok` and a one-off draw plain. */
export type JarLineTone = 'ok' | 'low' | 'out' | 'empty';

/** The Edit Stock door of a line: the button's own props, without what the line supplies. */
export type JarLinePress = Omit<StockJarButtonProps, 'children' | 'className'>;

export interface JarLineProps {
  /** Picks the vessel with `form`, so one ingredient keeps its shape. */
  seed: string;
  /** The form's text; only picks the vessel and is not shown. */
  kind: string;
  /** What the jar holds, or `null` for one with no level. Ignored for a one-off. */
  held: Pick<HeldJar, 'quantity' | 'threshold'> | null;
  tone: JarLineTone;
  /** A one-off holds no stock: its jar is muted ink at the middling level, and it has no press. */
  oneOff?: boolean;
  /** The name, which the press wraps when there is one. */
  name: ReactNode;
  /** Edit Stock behind the jar and the name; without it the line is still. */
  press?: JarLinePress;
  /** A control in a column of its own at the line's right, such as the Quick Look eye. */
  look?: ReactNode;
  /** The line's words under the name. */
  words: ReactNode;
  /** A class for the caller's own list styling. */
  className?: string;
}
