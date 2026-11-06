/** What `navigate` takes beyond the address. */
export type NavigateOptions = {
  /** Replace the history entry rather than adding one. */
  replace?: boolean;
  /** `false` keeps the scroll position, as a filter or pager does. */
  scroll?: boolean;
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
  /** The address a navigation is headed for, which the skeletons choose the destination by; none for a refresh or a full page load. */
  href: string | undefined;
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
