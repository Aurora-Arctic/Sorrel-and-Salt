'use client';

import { createContext } from 'react';

/** How a sortable list moves one of its items from a place to another: its own `onMove`, which the grip's Move Up and Move Down press. */
export const SortableMoveContext = createContext<((from: number, to: number) => void) | null>(null);
