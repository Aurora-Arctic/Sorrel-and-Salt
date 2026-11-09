'use client';

import { type ReactElement, useState } from 'react';
import Notice from '../Notice';
import type { HelpOrderMove } from './types';

/**
 * The order a list shows: the page's, or a moved one from the move until the page's catches up. A move shows at once
 * and saves through `write`; a failure puts the order back and keeps the move for Try Again.
 */
export function useOptimisticOrder(
  order: readonly string[],
  write: (move: HelpOrderMove) => Promise<void>,
) {
  const orderKey = order.join(' ');
  const [ids, setIds] = useState<readonly string[]>(order);
  const [seenKey, setSeenKey] = useState(orderKey);
  if (seenKey !== orderKey) {
    setSeenKey(orderKey);
    setIds(order);
  }
  const [saving, setSaving] = useState<string>();
  const [failed, setFailed] = useState<HelpOrderMove>();

  const save = async (move: HelpOrderMove) => {
    setIds(move.to);
    setSaving(move.id);
    setFailed(undefined);
    try {
      await write(move);
    } catch {
      setIds(move.from);
      setFailed(move);
    } finally {
      setSaving(undefined);
    }
  };

  return { ids, saving, failed, save, clearFailed: () => setFailed(undefined) };
}

export function MoveFailedNotice({
  move,
  onRetry,
}: {
  move: HelpOrderMove;
  onRetry: () => void;
}): ReactElement {
  return (
    <Notice kind="error" block>
      Could not move {move.title}. It is back where it was.{' '}
      <button type="button" className="btn btn--small" onClick={onRetry}>
        Try Again
      </button>
    </Notice>
  );
}
