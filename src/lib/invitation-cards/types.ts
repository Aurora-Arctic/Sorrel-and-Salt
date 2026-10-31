export interface CardSheetsInput {
  /** The card links, one per card, in the order the cards are printed. */
  links: string[];
  /** The batch's short name, printed in each sheet's margin and on each back. */
  batch: string;
  /** The date printed as "Valid until" on every front. */
  expiresAt: Date;
}

export interface RoundedSquare {
  x: number;
  y: number;
  size: number;
  radius: number;
}

/** One finder pattern: a rounded ring with a see-through middle, and a rounded centre. */
export interface QrFinder {
  outer: RoundedSquare;
  inner: RoundedSquare;
  centre: RoundedSquare;
}

/** A QR code as the shapes the card draws, in module units with the grid's top left at 0,0. */
export interface QrShapes {
  size: number;
  dotRadius: number;
  dots: { cx: number; cy: number }[];
  finders: QrFinder[];
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
