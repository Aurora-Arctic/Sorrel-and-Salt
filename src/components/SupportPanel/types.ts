import type { SupportKindParam } from '../../lib/support-path';

/** What the support page can offer this visitor. */
export type SupportPanelState =
  | { kind: 'signed-out' }
  | { kind: 'timed-out'; until: Date }
  | { kind: 'form'; support?: SupportKindParam; errorCode?: number };

export interface SupportPanelProps {
  state: SupportPanelState;
  /** The page the request is about, stored with it. */
  path: string;
}
