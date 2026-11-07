import type { PDFFont, PDFOperator, PDFRef } from 'pdf-lib';
import type { CardFonts, FontKey, PictureItem, TextItem } from '../invitation-cards/layout';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Embedded {
  fonts: Record<FontKey, PDFFont>;
  measure: CardFonts;
  pictures: Record<PictureItem['picture'], PDFRef>;
}

export interface SheetCard {
  position: number;
  picture: PictureItem;
  text: TextItem[];
  overlay?: { image: PDFRef; rect: Rect };
  /** Drawn after the card's words, such as the invitation's QR code or the business card's rule. */
  extra?: PDFOperator[];
}
