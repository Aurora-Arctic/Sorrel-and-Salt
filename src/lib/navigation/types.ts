/** Where a navigation is headed, so the part of the page that will change can draw its own wait. */
export type NavigationTarget = {
  region: 'coven' | 'admin' | 'main';
  shape: 'table' | 'cards' | 'form' | 'page';
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
