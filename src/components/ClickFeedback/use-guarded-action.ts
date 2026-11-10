'use client';

import { type ReactNode, type RefCallback, useState } from 'react';
import { failureMessage } from '../../lib/graphql-failure';
import { useClickFeedback } from './index';

export interface GuardedActionOptions {
  /** The control's name, which the failure callout reads. */
  name: string;
  /** Resolves with a failure sentence to report, or with nothing on success; a throw is reported through `failureMessage`. */
  action: () => Promise<string | void>;
  /** Drops the busy state when the action succeeds too; by default a success stays busy until the page it leads to arrives. */
  resetWhenDone?: boolean;
  /** The busy state, when something outside the control also reads or sets it. */
  state?: { pending: boolean; setPending: (pending: boolean) => void };
}

export interface GuardedAction {
  run: () => Promise<void>;
  pending: boolean;
  /** True from a failure until the next run starts. */
  failed: boolean;
  anchorRef: RefCallback<HTMLElement>;
  announce: (text: string) => void;
  feedback: ReactNode;
}

/**
 * A button's action with the click feedback around it: a press while one is out does nothing, the
 * last failure is cleared as the next run starts, and a failure drops the busy state and is reported
 * in the callout under the control. The control uses `aria-disabled`, not `disabled`, while pending,
 * so the focus stays where the callout is placed.
 */
export function useGuardedAction({
  name,
  action,
  resetWhenDone = false,
  state,
}: GuardedActionOptions): GuardedAction {
  const [own, setOwn] = useState(false);
  const [failed, setFailed] = useState(false);
  const { anchorRef, report, announce, feedback } = useClickFeedback({ name });
  const pending = state ? state.pending : own;
  const setPending = state ? state.setPending : setOwn;

  const run = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    report(undefined);
    let failure: string | void;
    try {
      failure = await action();
    } catch (error) {
      failure = failureMessage(error);
    }
    if (failure !== undefined) {
      setFailed(true);
      report(failure);
    }
    if (failure !== undefined || resetWhenDone) setPending(false);
  };

  return { run, pending, failed, anchorRef, announce, feedback };
}
