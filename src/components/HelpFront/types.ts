import type { ReactNode } from 'react';

export interface HelpFrontProps {
  /** Draws a Compendium link at tablet widths and below, where the signed-in bar moves its links into the account menu. */
  signedIn?: boolean;
  /** Draws the link to Staff Help at the end of the title row: a curator's or keeper's alone (`helpViewerOffers`). */
  staffHelp?: boolean;
  /** The page beneath the header. */
  children: ReactNode;
}
