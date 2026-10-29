import type { PointerEvent } from 'react';

// A control's pressed look on a phone as well as with a mouse. With
// the browser's tap highlight off (`globals.scss`), a tap would show nothing:
// a phone applies `:active` late or not at all, Chromium only once it has
// ruled out a scroll and Safari only where a touch listener is attached. So
// the press marks the control `data-pressed` itself, from the moment a
// pointer goes down on it until it lifts, leaves, or turns into a scroll
// (`pointercancel`), and a stylesheet draws `:active` and `data-pressed`
// alike. Only a primary press: a right click opens a menu, not the control.

function release(event: PointerEvent<HTMLElement>): void {
  event.currentTarget.removeAttribute('data-pressed');
}

/** Spread on a control to mark it `data-pressed` while a pointer presses it. */
export const pressFeedback = {
  onPointerDown(event: PointerEvent<HTMLElement>): void {
    if (event.button === 0) event.currentTarget.setAttribute('data-pressed', '');
  },
  onPointerUp: release,
  onPointerLeave: release,
  onPointerCancel: release,
};
