export interface CardSheetsInput {
  /** The card links, one per card, in the order the cards are printed. */
  links: string[];
  /** The batch's short name, printed in each sheet's margin and on each back. */
  batch: string;
  /** The date printed as "Valid until" on every front. */
  expiresAt: Date;
  /** Whether each page of fronts is followed by its page of backs; true when left out. */
  backs?: boolean;
}

/** The card pictures and fonts, as bytes, so a test reads them from disk and the browser fetches them. */
export interface CardAssets {
  salt: Uint8Array;
  sorrel: Uint8Array;
  cormorant600: Uint8Array;
  lexend300: Uint8Array;
  lexend400: Uint8Array;
  lexend500: Uint8Array;
}
