export interface CardSheetsInput {
  links: string[];
  batch: string;
  expiresAt: Date;
  /** Whether each page of fronts is followed by its page of backs; true when left out. */
  backs?: boolean;
}

export interface CardAssets {
  salt: Uint8Array;
  sorrel: Uint8Array;
  cormorant600: Uint8Array;
  lexend300: Uint8Array;
  lexend400: Uint8Array;
  lexend500: Uint8Array;
}
