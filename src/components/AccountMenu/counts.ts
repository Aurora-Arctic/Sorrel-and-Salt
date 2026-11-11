import { cappedCount, cappedWords } from '../FacetPanel/capped-count';

// What the account menu says about a count of support requests, in the button's name and in the panel.

export function countText(count: number, what: string): string {
  return `${cappedWords(count)} ${count === 1 ? 'request' : 'requests'} ${what}`;
}

export function supportTip(
  count: number,
  tipWhat: string,
): { shown: number | string; tip: string } {
  const shown = cappedCount(count);
  return { shown, tip: `${shown} Support ${count === 1 ? 'Request' : 'Requests'} ${tipWhat}` };
}
