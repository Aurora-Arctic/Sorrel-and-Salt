// The scroll position Back returns to, kept by the app: the skeleton takes the window to the top before the router writes
// the new history entry, so the browser's own saved position for the page left would be 0
// (claude-docs/components/skeleton-fade.md, "Back after a skeleton").

/** The history-state field holding the page's own scroll position. */
const KEY = 'skeletonScrollY';

/** How many frames a Back waits for the router to draw its page before giving the position up. */
const WAIT_FRAMES = 600;

type HistoryState = Record<string, unknown>;

const current = (): HistoryState => (window.history.state ?? {}) as HistoryState;

// No URL is passed, so the router's patched replaceState writes the entry and leaves its own state alone.
const write = (state: HistoryState) => window.history.replaceState(state, '');

/** Saves the window's scroll position in the current history entry, keeping the router's state; returns the entry's address. */
export function saveScroll(): string {
  write({ ...current(), [KEY]: window.scrollY });
  return window.location.href;
}

/** Drops the saved position from the current entry, if the entry is still the one at `href`. */
export function forgetScroll(href: string): void {
  if (window.location.href !== href) return;
  const { [KEY]: saved, ...rest } = current();
  if (saved !== undefined) write(rest);
}

let frame = 0;

// The router draws a traversed entry's page in a transition after popstate, and writes the entry again as it commits,
// so a new `history.state` object is the sign the page is there to scroll.
const onPopState = (event: PopStateEvent) => {
  cancelAnimationFrame(frame);
  const saved = (event.state as HistoryState | null)?.[KEY];
  if (typeof saved !== 'number') return;
  const arrived = window.history.state;
  let left = WAIT_FRAMES;
  const check = () => {
    if (window.history.state === arrived) {
      left -= 1;
      if (left > 0) frame = requestAnimationFrame(check);
      return;
    }
    window.scrollTo({ top: saved, behavior: 'instant' });
    forgetScroll(window.location.href);
  };
  frame = requestAnimationFrame(check);
};

let listening = false;

/**
 * Restores a saved position on Back and Forward. The listener is added once and stays for the page's life, so a
 * Back is heard whichever hosts are mounted as it happens; a layout change swaps them.
 */
export function listenForTraversals(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', onPopState);
}
