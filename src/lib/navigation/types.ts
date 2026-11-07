export type NavigateOptions = {
  replace?: boolean;
  /** `false` keeps the scroll position, as a filter or pager does. */
  scroll?: boolean;
};

export type PendingNavigation = {
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
  dirty: () => boolean;
  ask: (proceed: () => void) => void;
};

/** Where the provider keeps the mounted forms' guards, and consults them before navigating. */
export type LeaveGuardSlot = {
  put: (guard: LeaveGuard) => () => void;
  held: () => boolean;
  /** Calls `go` at once when no guard has changes; otherwise asks the first that has. */
  leave: (go: () => void) => void;
};

export type LeaveGuardOptions = {
  /** Called as the page is hidden: a tab switched away from, or closed on a phone. */
  onHide?: () => void;
  /** `false` leaves in-app navigation unheld, guarding only the tab close and reload. Defaults to true. */
  holdNavigation?: boolean;
};
