import type { MouseEvent } from 'react';

/**
 * A click the browser takes elsewhere (a new tab or window, a download), leaving this page as it is: anything but a plain left click. A link routing its own
 * press (the pager's soft ends, a tabbed page's tabs) leaves these to the browser.
 */
export function opensElsewhere(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
