import type { ReactNode } from 'react';
import type { AutosaveStatus } from '@/lib/autosave';

export interface SaveStatusProps {
  status: AutosaveStatus;
  savedAt: Date | null;
  /** True while the record is a draft: "Draft saved 2:02 pm" rather than "Saved 2:02 pm". */
  draft?: boolean;
  conflictMessage: ReactNode;
  onRetry: () => void;
  onReload: () => void;
  onKeepMine: () => void;
  /**
   * Where the conflict notice goes instead of this line: a modal's header note, under the
   * title, so it is in view however far the form has scrolled. Left out or null, the notice
   * replaces the line, beside Save.
   */
  conflictInto?: HTMLElement | null;
  className?: string;
}

export interface RecoveryNoticeProps {
  at: Date;
  onKeep: () => void;
  onDiscard: () => void;
}
