import type { PauseControlProps } from './types';

// Presentation only: the service still refuses either way.
export const changesLocked = ({ paused, canToggle }: PauseControlProps): boolean =>
  paused && !canToggle;
