import { fetchCardAssets } from './assets';
import { renderCardSheets } from './pdf';
import type { CardSheetsInput } from './types';

export async function buildCardSheetsPdf(input: CardSheetsInput): Promise<Uint8Array> {
  return renderCardSheets(input, await fetchCardAssets());
}
