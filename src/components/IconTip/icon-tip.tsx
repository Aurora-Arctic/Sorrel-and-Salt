'use client';

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { IconTipProps } from './types';

// The side each placement prefers; `useTip` flips it where there is no room.
const SIDES = { side: 'left', above: 'top', below: 'bottom-end' } as const;
import './index.scss';

// A word above an icon control, "Edit" over a pencil, for a sighted user who cannot tell what the mark does; it is `aria-hidden` decoration,
// opens after a rest or on focus, and shuts while the control's own menu is open (claude-docs/components/icon-tip.md, "Behaviour").

// `$icon-tip-fade` (_variables.scss): how long the closed tip stays for its fade.
const TIP_FADE_MS = 120;

// No wait to close: the bubble takes no pointer, so there is nothing to cross onto.
const TIMING = { closeDelayMs: 0 } as const;

const IconTip = ({
  tip,
  children,
  placement = 'side',
  opensOnPress = false,
}: IconTipProps): ReactElement => {
  // The wrapper, also the tip's anchor, kept to ask whether a menu is open under it.
  const wrapper = useRef<HTMLSpanElement | null>(null);
  const menuOpen = useCallback(
    () => Boolean(wrapper.current?.querySelector('[aria-haspopup][aria-expanded="true"]')),
    [],
  );
  // Asked as the tip opens, so a hover's wait that ends with the menu open opens nothing.
  const canOpen = useCallback(() => !menuOpen(), [menuOpen]);
  const { open, show, showSoon, hide, anchor, bubble, bubbleStyle } = useTip(
    canOpen,
    SIDES[placement],
    TIMING,
  );
  const setWrapper = useCallback(
    (node: HTMLSpanElement | null) => {
      wrapper.current = node;
      anchor(node);
    },
    [anchor],
  );
  // A menu opening under a tip already shown, by a press or a key, takes it away.
  useEffect(() => {
    const node = wrapper.current;
    if (!node || typeof MutationObserver === 'undefined') return;
    const watch = new MutationObserver(() => {
      if (menuOpen()) hide();
    });
    watch.observe(node, { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
    return () => watch.disconnect();
  }, [menuOpen, hide]);
  // Closing: no longer open, still in the page for the fade; cleared by the timer below.
  const [wasOpen, setWasOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), TIP_FADE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  return (
    // Hover on the wrapper rather than the control, so any control can be the child without its props being taken over; focus bubbles here too.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the focus and blur handlers hear events bubbling from the control inside; the span adds no control of its own
    <span
      ref={setWrapper}
      className={`icon-tip icon-tip--${placement}`}
      onMouseEnter={showSoon}
      onMouseLeave={hide}
      // Not for a focus inside the control's own menu, which bubbles here too: the open menu says what the control does.
      onFocus={(event) => {
        if (!(event.target as Element).closest('[role="menu"]')) show();
      }}
      onBlur={hide}
      // A status mark's press, heard as it bubbles from the button (`opensOnPress`).
      onClick={opensOnPress ? show : undefined}
    >
      {children}
      {(open || closing) && (
        <span
          ref={bubble}
          role="tooltip"
          style={bubbleStyle}
          aria-hidden="true"
          className={open ? 'icon-tip__bubble' : 'icon-tip__bubble icon-tip__bubble--closing'}
        >
          {tip}
        </span>
      )}
    </span>
  );
};

export default IconTip;
