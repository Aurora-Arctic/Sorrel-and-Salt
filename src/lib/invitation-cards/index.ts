import { fetchCardAssets } from './assets';
import { renderCardSheets } from './pdf';
import type { CardSheetsInput } from './types';

export { cardQrSvg } from './qr';

/** The print PDF of a batch's cards, built in the browser from the fonts and pictures under `public/invitation-cards/`. */
export async function buildCardSheetsPdf(input: CardSheetsInput): Promise<Uint8Array> {
  return renderCardSheets(input, await fetchCardAssets());
}
