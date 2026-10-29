'use client';

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { IconTipProps } from './types';

// The side each placement prefers; `useTip` flips it where there is no room.
const SIDES = { side: 'left', above: 'top', below: 'bottom-end' } as const;
import './index.scss';

// A word above an icon control, "Edit" over a pencil, for a sighted user who
// cannot tell what the mark does (MB.115, the owner's call). It opens once
// the pointer has rested on the control, or at once on its focus, and closes
// on Escape, blur, or the moment the pointer leaves, through `useTip`, whose
// Escape is marked handled so a modal around it stays open. The bubble cannot
// be hovered, against WCAG 1.4.13's hoverable clause, the owner's call: it
// repeats a word the control already says, and lingering it only covers
// what is beside the control (claude-docs/components/icon-tip.md, "Behaviour").
// Decoration only: the control's own name already says Edit and what, so
// the tip is `aria-hidden` and describes nothing, which would read the word
// twice. Shut while the control's own menu is open: a control that opens a
// menu (a `MenuButton`, `aria-expanded` on its button) is told by the menu
// from then on, so the tip leaves as it opens, however it was opened, and no
// hover or focus brings it back until the menu has closed (the owner's call,
// 2026-10-20). Mounted while open and for the length of its fade after closing,
// so an open tip is one in the page and a closed one fades rather than
// vanishing. Placed by `useTip`, on the side its placement prefers, (claude-docs/components/icon-tip.md).

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
  // The wrapper, also the tip's anchor, kept to ask whether a menu is open
  // under it: a button in it that says so with `aria-expanded`.
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
  // Closing: no longer open, still in the page for the fade. Set as `open`
  // is seen to drop, during the render that sees it, and cleared by the
  // timer below.
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
    // Hover on the wrapper rather than the control, so any control can be
    // the child without its props being taken over: the bubble takes no
    // pointer, so the wrapper's hover is the control's. Focus heard here too,
    // as it bubbles from the control.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the focus and blur handlers hear events bubbling from the control inside; the span adds no control of its own
    <span
      ref={setWrapper}
      className={`icon-tip icon-tip--${placement}`}
      onMouseEnter={showSoon}
      onMouseLeave={hide}
      // Not for a focus inside the control's own menu, which bubbles here
      // too: the open menu says what the control does, and a tip opened
      // there would only close with a fade as the menu goes (the owner's
      // call, 2026-10-20, putting a menu under the three dots).
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
