import { useEffect, useRef } from 'react';
import { useDraft } from '@/lib/use-draft';

const listeners = new Set<() => void>();

/** Tells every filter draft that the list is being opened under a new filter, called by `useApplyFilter`. */
export const announceApply = (): void => {
  for (const listener of listeners) listener();
};

/**
 * A filter field's draft, started from the filter shown and started again when the page shows another filter, but
 * never when the search this draft applied arrives: text typed since is kept. Replaces keying the row by the filter
 * shown, which threw the typed text away.
 */
export function useFilterDraft<T>(shown: T, normalise?: (draft: T) => T): [T, (draft: T) => void] {
  const [draft, setDraft, markSent] = useDraft(shown, normalise);
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });
  useEffect(() => {
    const listener = () => markSent(latest.current);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  });
  return [draft, setDraft];
}

/** A search box's draft: the text, trimmed as it is sent. */
export const useSearchDraft = (shown: string): [string, (text: string) => void] =>
  useFilterDraft(shown, (text) => text.trim());
