/** Where a navigation is headed, so the part of the page that will change can draw its own wait. */
export type NavigationTarget = {
  region: 'coven' | 'admin' | 'main';
  shape: 'table' | 'cards' | 'form' | 'page' | 'contents';
  /** A `table` or `cards` wait draws the page's heading row above the list. */
  title?: boolean;
  /** With `title`: the page has an action (Add) at the heading's end. */
  action?: boolean;
  /** A `table` or `cards` wait draws the page's filter row. */
  filter?: boolean;
  /** With `title`: the page has a tab row between its heading and its action. */
  tabs?: boolean;
  /** A `cards` wait draws the compact cards the list opens at, unless the viewer stored Regular. */
  density?: 'compact';
  /**
   * The frame the destination sits in, so a `main` wait is drawn in it: `wide`
   * (the page column), `narrow` (a forms column) or `with-nav` (the narrow column
   * with a side menu drawn, on a `page`) or `entry` (the wide column with a side menu, an ingredient's page). None is the standard centred frame.
   */
  /**
   * The head of a `page` or `contents`: `eyebrow` draws an eyebrow above the
   * title, `title` the title alone; none is a title and a lede.
   */
  head?: 'eyebrow' | 'title';
  frame?: 'wide' | 'narrow' | 'with-nav' | 'entry';
};

/** What `navigate` takes beyond the address. */
export type NavigateOptions = {
  /** Replace the history entry rather than adding one. */
  replace?: boolean;
  /** `false` keeps the scroll position, as a filter or pager does. */
  scroll?: boolean;
  /** Where the page is headed; read by whatever draws a skeleton for it. */
  target?: NavigationTarget;
};

export type PendingNavigation = {
  /** True while a navigation this caller started is on its way. */
  pending: boolean;
  navigate: (href: string, options?: NavigateOptions) => void;
  refresh: () => void;
};

/** The site-wide view: any navigation on its way, whoever started it. */
export type NavigationState = {
  busy: boolean;
  target: NavigationTarget | undefined;
};

/** A form's hold on leaving the page, registered with the provider while it is mounted. */
export type LeaveGuard = {
  /** True while the form has changes leaving would lose. */
  dirty: () => boolean;
  /** Asks whether to leave, calling `proceed` only if the answer is yes. */
  ask: (proceed: () => void) => void;
};

/** Where the provider keeps the mounted forms' guards, and consults them before navigating. */
export type LeaveGuardSlot = {
  /** Registers a guard; returns its removal. */
  put: (guard: LeaveGuard) => () => void;
  /** True while some mounted guard has changes. */
  held: () => boolean;
  /** Calls `go` at once when no guard has changes; otherwise asks the first that has. */
  leave: (go: () => void) => void;
};

/** What `useLeaveGuard` takes beyond its changes and its question. */
export type LeaveGuardOptions = {
  /** Called as the page is hidden: a tab switched away from, or closed on a phone. */
  onHide?: () => void;
  /** `false` leaves in-app navigation unheld, guarding only the tab close and reload. Defaults to true. */
  holdNavigation?: boolean;
};
