import type { PointerEvent } from 'react';

// A control's pressed look on a phone: with the tap highlight off, a phone applies `:active` late or not at all, so the press marks the control `data-pressed`
// from pointer-down until it lifts, leaves or turns into a scroll (`pointercancel`), and a stylesheet draws both alike. Primary press only: a right click opens a menu.

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
