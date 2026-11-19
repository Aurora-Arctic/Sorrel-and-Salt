'use client';

import {
  createContext,
  type MouseEvent,
  type ReactElement,
  useContext,
  useLayoutEffect,
  useState,
} from 'react';
import { cx } from '@/lib/class-names';
import { ReorderButton } from '../IconTip';
import type { ReorderModeProps, ReorderModeValue, ReorderToggleProps } from './types';
import './index.scss';

// One list's Reorder toggle: while it is on, each row's grip shows Move Up and Move Down beside it; while it is off,
// the grip alone, which still drags and lifts by keyboard (claude-docs/components/reorder-mode.md).

const OFF: ReorderModeValue = {
  name: '',
  reordering: false,
  listed: false,
  setReordering: () => {},
  claimList: () => () => {},
};

const ReorderModeContext = createContext<ReorderModeValue>(OFF);

/** The mode of the list round the caller; off outside a ReorderMode. */
export function useReorderMode(): { reordering: boolean } {
  return { reordering: useContext(ReorderModeContext).reordering };
}

/** Says a sortable list is drawn inside the mode, for a ReorderMode that waits for one before it offers its toggle. */
export function useReorderList(): void {
  const { claimList } = useContext(ReorderModeContext);
  useLayoutEffect(() => claimList(), [claimList]);
}

/**
 * Holds one list's mode. `on` and `onChange` make it controlled, for a list that draws itself differently in the mode;
 * `waitForList` offers the toggle only once a list inside calls `useReorderList`, for a box that may hold none.
 */
export function ReorderMode({
  name,
  on,
  onChange,
  waitForList = false,
  children,
}: ReorderModeProps): ReactElement {
  const [own, setOwn] = useState(false);
  const [lists, setLists] = useState(0);
  const [claimList] = useState(() => () => {
    setLists((count) => count + 1);
    return () => setLists((count) => count - 1);
  });
  const reordering = on ?? own;
  const setReordering = (next: boolean) => {
    if (on === undefined) setOwn(next);
    onChange?.(next);
  };
  const listed = !waitForList || lists > 0;
  return (
    <ReorderModeContext
      value={{ name, reordering: reordering && listed, listed, setReordering, claimList }}
    >
      {children}
    </ReorderModeContext>
  );
}

/** The mode's button: pressed while the mode is on, named "Reorder" and the list's name. */
export function ReorderToggle({
  className,
  ref,
  onPress,
}: ReorderToggleProps): ReactElement | null {
  const { name, reordering, listed, setReordering } = useContext(ReorderModeContext);
  if (!listed) return null;
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = !reordering;
    // A Move button about to go would drop the focus to the page; a pointer press in Safari leaves it there.
    if (!next && document.activeElement?.closest('[data-reorder-move]'))
      event.currentTarget.focus();
    onPress?.(next);
    setReordering(next);
  };
  return (
    <ReorderButton
      ref={ref}
      name={name}
      className={cx('reorder-toggle', className)}
      pressed={reordering}
      onClick={toggle}
    />
  );
}
