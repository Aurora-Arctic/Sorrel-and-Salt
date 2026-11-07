export interface CovenSwitchRegistration {
  /** The address the page is at; a registration made at another address is stale and ignored. */
  path: string;
  slugs: readonly string[];
}

export interface CovenSwitchTargetsProps extends CovenSwitchRegistration {}
