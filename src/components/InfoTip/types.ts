import type { ReactNode } from 'react';

export interface InfoTipProps {
  /** The tip's id: a field lists it in `aria-describedby`, so the text is read with the field. */
  id: string;
  /** What the tip is about, naming its button: "About Name". */
  label: string;
  /** The id of the field it describes: focus there opens the tip, as focus on the ⓘ does. */
  controlId?: string;
  /** The text the tip shows. */
  children: ReactNode;
}
