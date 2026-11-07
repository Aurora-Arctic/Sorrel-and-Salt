import {
  lineTo,
  moveTo,
  PDFDocument,
  type PDFOperator,
  setLineWidth,
  setStrokingCmykColor,
  stroke,
} from 'pdf-lib';
import { addSheetPage, backPosition, drawSheet, embedAssets, LABEL_AT } from '../card-sheet/sheet';
import { inkOf } from '../invitation-cards/inks';
import { LABEL, type TextItem } from '../invitation-cards/layout';
import { CARDS_PER_SHEET } from '../invitation-cards/limits';
import type { CardAssets } from '../invitation-cards/types';
import { BACK_PICTURE, backText, FRONT_PICTURE, frontLayout } from './layout';
import type { BusinessCardsInput, RuleItem } from './types';

function ruleOperators({ x, y, width, weight, colour }: RuleItem): PDFOperator[] {
  return [
    setStrokingCmykColor(...inkOf(colour)),
    setLineWidth(weight),
    moveTo(x, y),
    lineTo(x + width, y),
    stroke(),
  ];
}

function label(name: string, face: 'fronts' | 'backs'): TextItem {
  return {
    font: 'lexend400',
    size: 5,
    letterSpacing: 0,
    colour: LABEL,
    ...LABEL_AT,
    text: `Business cards for ${name}, ${face}`,
  };
}

/** Builds the print PDF: a page of ten fronts, then, when `backs` is set, a page of their backs. */
export async function renderBusinessCards(
  { name, email, phone, backs }: BusinessCardsInput,
  assets: CardAssets,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Sorrel & Salt business cards');
  const embedded = await embedAssets(doc, assets);
  const front = frontLayout(embedded.measure, { name, email, phone });
  const positions = Array.from({ length: CARDS_PER_SHEET }, (_, i) => i);
  drawSheet(
    addSheetPage(doc),
    positions.map((position) => ({
      position,
      picture: FRONT_PICTURE,
      text: front.text,
      extra: ruleOperators(front.rule),
    })),
    embedded,
    label(name, 'fronts'),
  );
  if (backs) {
    const back = backText(embedded.measure);
    drawSheet(
      addSheetPage(doc),
      positions.map((i) => ({ position: backPosition(i), picture: BACK_PICTURE, text: back })),
      embedded,
      label(name, 'backs'),
    );
  }
  return doc.save();
}
