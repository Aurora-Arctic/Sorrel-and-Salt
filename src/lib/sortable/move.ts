'use client';

import { createContext } from 'react';

/**
 * How a sortable list moves one of its items from a place to another: its own `onMove`, which the grip's Move Up and Move Down
 * press. `saysMove` is set by a list that announces a move itself, so the grip stays quiet and a move is said once.
 */
export const SortableMoveContext = createContext<{
  onMove: (from: number, to: number) => void;
  saysMove: boolean;
} | null>(null);
