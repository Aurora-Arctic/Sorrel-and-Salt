import type { MouseEvent } from 'react';

/** Anything but a plain left click. A link routing its own press (the pager's soft ends, a tabbed page's tabs) leaves these to the browser. */
export function opensElsewhere(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
