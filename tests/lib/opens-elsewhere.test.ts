import type { MouseEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { opensElsewhere } from '@/lib/opens-elsewhere';

// A link that routes its own press (the pager's soft ends, the tabs, every
// PendingLink) leaves to the browser any press that is not a plain left click.
const press = (init: Partial<MouseEvent<HTMLAnchorElement>> = {}) =>
  ({
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...init,
  }) as MouseEvent<HTMLAnchorElement>;

describe('opensElsewhere', () => {
  it('keeps a plain left click on the page', () => {
    expect(opensElsewhere(press())).toBe(false);
  });

  it.each([
    ['the middle button', { button: 1 }],
    ['Ctrl held', { ctrlKey: true }],
    ['Cmd held', { metaKey: true }],
    ['Shift held', { shiftKey: true }],
    ['Alt held', { altKey: true }],
  ])('leaves a press with %s to the browser', (_why, init) => {
    expect(opensElsewhere(press(init))).toBe(true);
  });
});
