export type SupportDialogState =
  | { kind: 'signed-out' }
  | { kind: 'unverified' }
  | { kind: 'timed-out'; until: Date | null }
  | { kind: 'form' };
