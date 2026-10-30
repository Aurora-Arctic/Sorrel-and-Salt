'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import type { PanelChanges } from './types';

// The reference panels' unsaved edits, told to the ingredient form: a panel's own react-hook-form
// never reaches the form's `isDirty`, so each panel says whether it holds edits and the form counts
// itself changed while any does (claude-docs/components/ingredient-form.md, "Editing a source").

/** Null outside an ingredient form, where a panel has no guard to tell. */
export const PanelChangesContext = createContext<PanelChanges | null>(null);

/** The form's side: whether any panel holds edits, and the context value panels report to. */
export function usePanelChanges(): { changed: boolean; context: PanelChanges } {
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());
  const report = useCallback((panel: string, changed: boolean) => {
    setDirty((current) => {
      if (current.has(panel) === changed) return current;
      const next = new Set(current);
      if (changed) next.add(panel);
      else next.delete(panel);
      return next;
    });
  }, []);
  const context = useMemo(() => ({ report }), [report]);
  return { changed: dirty.size > 0, context };
}

/** A panel's side: reports `dirty` while mounted, and nothing once it closes. */
export function useReportPanelChanges(dirty: boolean): void {
  const panel = useId();
  const changes = useContext(PanelChangesContext);
  useEffect(() => {
    changes?.report(panel, dirty);
  }, [changes, panel, dirty]);
  useEffect(() => () => changes?.report(panel, false), [changes, panel]);
}
