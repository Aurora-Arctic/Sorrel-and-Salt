import type { PauseControlProps } from './types';

export const changesLocked = ({ paused, canToggle }: PauseControlProps): boolean =>
  paused && !canToggle;
