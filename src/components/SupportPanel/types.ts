import type { SupportAboutParam } from '../../lib/support-path';

export type SupportPanelState =
  | {
      kind: 'signed-out';
      support?: SupportAboutParam;
      errorReference?: string;
      errorDetail?: string;
    }
  /** `until` is null for a time-out with no end date. */
  | { kind: 'timed-out'; until: Date | null }
  | {
      kind: 'form';
      support?: SupportAboutParam;
      errorCode?: number;
      errorReference?: string;
      errorDetail?: string;
    };

export interface SupportPanelProps {
  state: SupportPanelState;
  path: string;
  returnTo?: string;
  onDone?: () => void;
}
