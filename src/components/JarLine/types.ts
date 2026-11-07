import type { ReactNode } from 'react';
import type { HeldJar } from '../JarShelf/types';
import type { StockJarButtonProps } from '../StockDialog/types';

export type JarLineTone = 'ok' | 'low' | 'out' | 'empty';

/** The Edit Stock door of a line: the button's own props, without what the line supplies. */
export type JarLinePress = Omit<StockJarButtonProps, 'children' | 'className'>;

export interface JarLineProps {
  /** Picks the vessel with `form`, so one ingredient keeps its shape. */
  seed: string;
  kind: string;
  held: Pick<HeldJar, 'quantity' | 'threshold'> | null;
  tone: JarLineTone;
  oneOff?: boolean;
  name: ReactNode;
  /** Edit Stock behind the jar and the name; without it the line is still. */
  press?: JarLinePress;
  look?: ReactNode;
  words: ReactNode;
  className?: string;
}
