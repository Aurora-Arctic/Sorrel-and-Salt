import { useEffect, useRef, useState } from 'react';

/**
 * Calls `follow` when the page shows another value than before, except for the value the caller sent itself: that
 * arrival leaves whatever was typed since alone. `normalise` turns the draft into what it sends, so the arrival can be
 * matched to it. Returns `markSent`, to call with the draft at each send.
 */
export function useFollowShown<T>(
  shown: T,
  follow: (shown: T) => void,
  normalise: (draft: T) => T = (draft) => draft,
): (draft: T) => void {
  const key = JSON.stringify(shown);
  const seen = useRef(key);
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (seen.current === key) return;
    seen.current = key;
    const own = sent.current === key;
    sent.current = null;
    if (!own) follow(shown);
  });
  return (draft) => {
    sent.current = JSON.stringify(normalise(draft));
  };
}

/** A controlled draft that starts from the value shown and follows it as `useFollowShown` says. */
export function useDraft<T>(
  shown: T,
  normalise?: (draft: T) => T,
): [T, (draft: T) => void, (draft: T) => void] {
  const [draft, setDraft] = useState(shown);
  const markSent = useFollowShown(shown, setDraft, normalise);
  return [draft, setDraft, markSent];
}
