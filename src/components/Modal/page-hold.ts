// While a modal is open the page behind it holds still: CSS hides the root's
// scroll (`:root:has(.modal-dialog:modal)`, index.scss), and this takes the
// scrollbar's place, so nothing behind it moves sideways as the scrollbar
// goes (the owner's call, 2026-10-20). It measures the scrollbar as the first
// modal opens and, only when there is one, publishes its width on the root
// as `--scrollbar-width`, which the root's padding and every right-anchored
// fixed element read. It replaces the CSS-only `scrollbar-gutter: stable`,
// which reserves the room on every page, scrolling or not: kept always, it
// left a blank strip beside the header on a page that fits the window; kept
// only while a modal was open, a page with no scrollbar gained the room as one
// opened and moved by half of it (claude-docs/components/modal.md).

export const SCROLLBAR_WIDTH = '--scrollbar-width';

// How many modals hold the page: a confirmation or a second modal opens over
// the first, by which time the scrollbar is gone and measures 0, so only the
// first measures and only the last to close gives the room back.
let holds = 0;

/** Holds the page for one open modal; the function returned lets it go, once. */
export function holdPage(): () => void {
  if (holds++ === 0) {
    const root = document.documentElement;
    const width = window.innerWidth - root.clientWidth;
    if (width > 0) root.style.setProperty(SCROLLBAR_WIDTH, `${width}px`);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds === 0) document.documentElement.style.removeProperty(SCROLLBAR_WIDTH);
  };
}
