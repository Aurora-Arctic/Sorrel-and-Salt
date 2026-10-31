/** What the dialog offers this visitor. */
export type SupportDialogState =
  | { kind: 'signed-out' }
  | { kind: 'unverified' }
  | { kind: 'timed-out'; until: Date }
  | { kind: 'form' };

export interface SupportDialogProps {
  state: SupportDialogState;
}
