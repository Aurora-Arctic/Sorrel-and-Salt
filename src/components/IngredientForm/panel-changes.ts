'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import type { PanelChanges } from './types';

// The reference panels' unsaved edits, told to the ingredient form: a panel's own react-hook-form
// never reaches the form's `isDirty`, so each panel says whether it holds edits and the form counts
// itself changed while any does (claude-docs/components/ingredient-form.md, "Editing a source").

export const PanelChangesContext = createContext<PanelChanges | null>(null);

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

export function useReportPanelChanges(dirty: boolean): void {
  const panel = useId();
  const changes = useContext(PanelChangesContext);
  useEffect(() => {
    changes?.report(panel, dirty);
  }, [changes, panel, dirty]);
  useEffect(() => () => changes?.report(panel, false), [changes, panel]);
}
