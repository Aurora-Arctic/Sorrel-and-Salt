import type { PDFFont, PDFOperator, PDFRef } from 'pdf-lib';
import type { CardFonts, FontKey, PictureItem, TextItem } from '../invitation-cards/layout';

/** A rectangle in a card's artboard pixels, its top left at x and y. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The fonts and pictures a sheet draws with, once embedded in its document. */
export interface Embedded {
  fonts: Record<FontKey, PDFFont>;
  /** The same fonts opened for measuring, so a layout sets its words by their kerned advances. */
  measure: CardFonts;
  pictures: Record<PictureItem['picture'], PDFRef>;
}

/** One card on a sheet: where it sits, its picture and words, and what else it draws, all in its artboard's pixels. */
export interface SheetCard {
  /** Its place in the block, from 0, left to right then top to bottom. */
  position: number;
  picture: PictureItem;
  text: TextItem[];
  /** An image drawn over every card's picture and under every card's words, such as the invitation's shadow. */
  overlay?: { image: PDFRef; rect: Rect };
  /** Drawn after the card's words, such as the invitation's QR code or the business card's rule. */
  extra?: PDFOperator[];
}
