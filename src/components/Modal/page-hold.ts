// While a modal is open the page behind it holds still: CSS hides the root's scroll (index.scss) and
// this publishes the scrollbar's width as `--scrollbar-width`, measured only where there is one
// (claude-docs/components/modal.md, "Styling").

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
