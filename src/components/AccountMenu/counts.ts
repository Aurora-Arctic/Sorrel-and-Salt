// What the account menu says about a count of support requests, in the button's name and in the panel.

// The most a menu count shows; a larger one reads "99+".
export const COUNT_CAP = 99;

export function countText(count: number, what: string): string {
  return count > COUNT_CAP
    ? `more than ${COUNT_CAP} requests ${what}`
    : `${count} ${count === 1 ? 'request' : 'requests'} ${what}`;
}

// The count as a circle shows it, and its tip: "3 Support Requests Assigned to You".
export function supportTip(
  count: number,
  tipWhat: string,
): { shown: number | string; tip: string } {
  const shown = count > COUNT_CAP ? `${COUNT_CAP}+` : count;
  return { shown, tip: `${shown} Support ${count === 1 ? 'Request' : 'Requests'} ${tipWhat}` };
}
