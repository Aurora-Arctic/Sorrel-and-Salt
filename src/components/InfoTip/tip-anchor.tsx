'use client';

import {
  type AriaRole,
  type FocusEvent,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import type { Placement } from '@floating-ui/react-dom';
import { setRef } from '../../lib/set-ref';
import { useDismiss } from '../../lib/use-dismiss';
import type { TipOptions } from './types';
import { useTip } from './use-tip';

// A hover tip's anchor and bubble, wired to `useTip` once: the anchor takes the pointer, the bubble is
// the faded-out text that stays in the page (claude-docs/components/info-tip.md, "Contracts").

/** What a trigger inside the anchor calls. */
export interface TipControls {
  open: boolean;
  /** Opens it at once: focus and a tap. */
  show: () => void;
  hide: () => void;
  /** Pins it open, or closes it if pinned (a `pinnable` anchor). */
  toggle: () => void;
}

interface TipAnchorProps extends TipOptions {
  /** The anchor's class. */
  className: string;
  /** The bubble's class; the open state adds `is-open`. */
  bubbleClass: string;
  /** What the bubble says. Left out, the anchor takes no pointer and draws no bubble. */
  bubble?: ReactNode | ((tip: TipControls) => ReactNode);
  bubbleId?: string;
  /** The bubble's role; `tooltip` unless asked. `none` draws it hidden from assistive technology, with no role. */
  bubbleRole?: AriaRole | 'none';
  /** Re-keys the bubble when it changes, so a screen reader reads it again. */
  bubbleKey?: string | number;
  bubbleProps?: Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'id' | 'role' | 'style'>;
  /** Keeps the bubble shut while true, as when the thing it describes is itself open. */
  suppressed?: boolean;
  canOpen?: () => boolean;
  placement?: Placement;
  as?: 'span' | 'div';
  /** Filled with the anchor element. */
  anchorRef?: Ref<HTMLElement>;
  /** Filled with the controls, for a trigger that sits outside the anchor. */
  handle?: Ref<TipControls>;
  /** Where focus goes when Escape closes a pinnable tip. */
  returnFocusTo?: RefObject<HTMLElement | null>;
  children: ReactNode | ((tip: TipControls) => ReactNode);
}

const TipAnchor = ({
  className,
  bubbleClass,
  bubble,
  bubbleId,
  bubbleRole = 'tooltip',
  bubbleKey,
  bubbleProps,
  suppressed = false,
  canOpen,
  placement,
  as: Anchor = 'span',
  anchorRef,
  handle,
  returnFocusTo,
  children,
  ...options
}: TipAnchorProps): ReactElement => {
  const element = useRef<HTMLElement | null>(null);
  // Set while Escape puts focus back on the trigger, which must not reopen a pinnable tip.
  const returning = useRef(false);
  const { pinnable } = options;
  const tip = useTip(canOpen, placement, {
    ...options,
    onEscape: () => {
      const target = returnFocusTo?.current;
      if (!target) return;
      returning.current = true;
      target.focus();
      returning.current = false;
    },
  });
  const { open, show, hide, toggle, showSoon, hideSoon, unpin, anchor, bubble: place } = tip;
  const controls: TipControls = { open, show, hide, toggle };
  useImperativeHandle(handle, () => ({ open, show, hide, toggle }), [open, show, hide, toggle]);

  const setAnchor = useCallback(
    (node: HTMLElement | null) => {
      element.current = node;
      anchor(node);
      setRef(anchorRef, node);
    },
    [anchor, anchorRef],
  );

  useDismiss({
    active: open && Boolean(pinnable),
    inside: (target) => element.current?.contains(target) ?? false,
    onOutsidePress: hide,
  });

  const shown = open && !suppressed;
  const pinHandlers = pinnable
    ? {
        onFocus: () => {
          if (!returning.current) show();
        },
        onBlur: (event: FocusEvent) => {
          if (element.current?.contains(event.relatedTarget as Node | null)) return;
          unpin();
          hideSoon();
        },
      }
    : {};
  const hasBubble = bubble !== undefined;
  const role = bubbleRole === 'none' ? undefined : bubbleRole;

  return (
    <Anchor
      ref={setAnchor}
      className={className}
      {...(hasBubble ? { onMouseEnter: showSoon, onMouseLeave: hideSoon } : {})}
      {...(hasBubble ? pinHandlers : {})}
    >
      {typeof children === 'function' ? children(controls) : children}
      {hasBubble && (
        <span
          ref={place}
          key={bubbleKey}
          id={bubbleId}
          role={role}
          className={shown ? `${bubbleClass} is-open` : bubbleClass}
          aria-hidden={bubbleRole === 'none' ? true : !shown}
          style={tip.bubbleStyle}
          {...bubbleProps}
        >
          {typeof bubble === 'function' ? bubble(controls) : bubble}
        </span>
      )}
    </Anchor>
  );
};

export default TipAnchor;
