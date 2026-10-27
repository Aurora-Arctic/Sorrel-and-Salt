import type { ReactNode } from 'react';
import type { AutosaveStatus } from '@/lib/autosave';

export interface SaveStatusProps {
  /** `useAutosave`'s status. */
  status: AutosaveStatus;
  /** When the server last confirmed a save. */
  savedAt: Date | null;
  /** True while the record is a draft: "Draft saved 2:02 pm" rather than "Saved 2:02 pm". */
  draft?: boolean;
  /** What a conflict says, naming the record: "This spell was changed elsewhere." */
  conflictMessage: ReactNode;
  onRetry: () => void;
  /** Reload Latest: drop this copy for the server's. */
  onReload: () => void;
  /** Keep My Version: send this copy over the server's. */
  onKeepMine: () => void;
  className?: string;
}
