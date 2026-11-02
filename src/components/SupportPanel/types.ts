import type { SupportAboutParam } from '../../lib/support-path';

/** What the Support dialog can offer this visitor. */
export type SupportPanelState =
  | { kind: 'signed-out'; support?: SupportAboutParam }
  /** `until` is null for a time-out with no end date. */
  | { kind: 'timed-out'; until: Date | null }
  | { kind: 'form'; support?: SupportAboutParam; errorCode?: number; errorReference?: string };

export interface SupportPanelProps {
  state: SupportPanelState;
  /** The page the request is about, stored with it. */
  path: string;
  /** Where Sign In brings the visitor back to; the support page when left out. */
  returnTo?: string;
  /** Closes the dialog the form sits in. */
  onDone?: () => void;
}
