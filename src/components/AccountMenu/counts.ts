// What the account menu says about a count of support requests, in the button's name and in the panel.

export const COUNT_CAP = 99;

export function countText(count: number, what: string): string {
  return count > COUNT_CAP
    ? `more than ${COUNT_CAP} requests ${what}`
    : `${count} ${count === 1 ? 'request' : 'requests'} ${what}`;
}

export function supportTip(
  count: number,
  tipWhat: string,
): { shown: number | string; tip: string } {
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : count;
  return { shown, tip: `${shown} Support ${count === 1 ? 'Request' : 'Requests'} ${tipWhat}` };
}
