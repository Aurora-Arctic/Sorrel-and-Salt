/** The covens one page says it also opens in, and the address it said it at. */
export interface CovenSwitchRegistration {
  /** The address the page is at; a registration made at another address is stale and ignored. */
  path: string;
  /** The slugs of the viewer's covens the page opens in, the current one included. */
  slugs: readonly string[];
}

export interface CovenSwitchTargetsProps extends CovenSwitchRegistration {}
