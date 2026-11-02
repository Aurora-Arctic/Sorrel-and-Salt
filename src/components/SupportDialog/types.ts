/** What the dialog offers this visitor. */
export type SupportDialogState =
  | { kind: 'signed-out' }
  | { kind: 'unverified' }
  /** `until` is null for a time-out with no end date. */
  | { kind: 'timed-out'; until: Date | null }
  | { kind: 'form' };
