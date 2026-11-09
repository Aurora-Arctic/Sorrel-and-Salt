import { afterEach, describe, expect, it, vi } from 'vitest';
import { giveFocusBack } from '@/components/Modal/modal';

// Where an element sits in the window: happy-dom lays nothing out, so each test places it.
const placed = (top: number): HTMLButtonElement => {
  const button = document.createElement('button');
  document.body.append(button);
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 10, y: top, width: 80, height: 28 }),
  );
  return button;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('giving the focus back when a modal closes', () => {
  it('focuses an element still in the window without scrolling the page, as a sticky bar link would be scrolled', () => {
    const opener = placed(12);
    const focus = vi.spyOn(opener, 'focus');
    expect(document.activeElement).toBe(document.body);

    giveFocusBack(opener, undefined);

    expect(document.activeElement).toBe(opener);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('lets the browser scroll to an element outside the window', () => {
    const opener = placed(window.innerHeight + 200);
    const focus = vi.spyOn(opener, 'focus');

    giveFocusBack(opener, undefined);

    expect(document.activeElement).toBe(opener);
    expect(focus).not.toHaveBeenCalledWith({ preventScroll: true });
  });

  it('treats an element the owner returns to the same way', () => {
    const target = placed(12);
    const focus = vi.spyOn(target, 'focus');

    giveFocusBack(null, () => target);

    expect(document.activeElement).toBe(target);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
