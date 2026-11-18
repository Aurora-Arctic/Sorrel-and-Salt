import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMeasuredFit } from '@/lib/use-measured-fit';

// happy-dom lays nothing out, so the measured widths are stood in for by a plain record the test changes, and the
// ResizeObserver by one the test fires.

type Natural = { widths: number[] };

let observers: { callback: () => void; watched: Element[] }[] = [];

class FakeResizeObserver {
  watched: Element[] = [];
  constructor(callback: () => void) {
    observers.push({ callback, watched: this.watched });
  }
  observe(element: Element) {
    this.watched.push(element);
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((each) => each.watched !== this.watched);
  }
}

const resize = () => act(() => observers.forEach((each) => each.callback()));

let layout: { widths: number[] | null; room: number };
let fontsReady: () => void;

const measure = vi.fn((): Natural | null =>
  layout.widths ? { widths: [...layout.widths] } : null,
);
// The most leading items whose widths fit the room, at least one.
const choose = vi.fn(({ widths }: Natural): number => {
  let used = 0;
  let count = 0;
  for (const width of widths) {
    if (used + width > layout.room) break;
    used += width;
    count += 1;
  }
  return Math.max(1, count);
});
// The first item's width moved: the text size changed, so what was measured is stale.
const stale = ({ widths }: Natural): boolean =>
  layout.widths !== null && widths[0] !== layout.widths[0];

const element = document.createElement('div');
const child = document.createElement('span');
element.append(child);
const ref = { current: element };

const fit = (options: { enabled?: boolean; resetKey?: unknown } = {}) =>
  renderHook(
    (props: { enabled?: boolean; resetKey?: unknown }) =>
      useMeasuredFit({
        ref,
        measure,
        choose,
        stale,
        watch: () => [child],
        fallback: 9,
        enabled: props.enabled ?? true,
        resetKey: props.resetKey,
      }),
    { initialProps: options },
  );

beforeEach(() => {
  observers = [];
  layout = { widths: [40, 40, 40, 40], room: 100 };
  measure.mockClear();
  choose.mockClear();
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: new Promise<void>((done) => (fontsReady = done)) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'fonts');
});

describe('useMeasuredFit', () => {
  it('measures before the first paint and answers how many fit', () => {
    const { result } = fit();

    expect(result.current).toBe(2);
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it('answers the fallback when there is no layout to measure', () => {
    layout.widths = null;

    const { result } = fit();

    expect(result.current).toBe(9);
  });

  it('chooses again from the widths it holds when the room changes', () => {
    const { result } = fit();
    expect(result.current).toBe(2);

    layout.room = 130;
    resize();

    expect(result.current).toBe(3);
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it('watches the element and what the caller names inside it', () => {
    fit();

    expect(observers.flatMap((each) => each.watched)).toEqual([element, child]);
  });

  it('measures afresh when what it holds is stale, as when the text size changes', () => {
    const { result } = fit();
    expect(result.current).toBe(2);

    layout.widths = [80, 80, 80, 80];
    resize();

    expect(measure).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(1);
  });

  it('measures afresh once the web fonts have arrived', async () => {
    const { result } = fit();
    layout.widths = [20, 20, 20, 20];

    await act(async () => fontsReady());

    expect(measure).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(4);
  });

  it('measures afresh when its reset key changes', () => {
    const { result, rerender } = fit({ resetKey: '/one' });
    layout.widths = [100, 100];

    rerender({ resetKey: '/two' });

    expect(measure).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(1);
  });

  it('measures nothing while turned off, and measures once turned on', () => {
    const { result, rerender } = fit({ enabled: false });
    expect(result.current).toBeNull();
    expect(measure).not.toHaveBeenCalled();
    expect(observers).toEqual([]);

    rerender({ enabled: true });

    expect(result.current).toBe(2);
    expect(measure).toHaveBeenCalledTimes(1);
  });
});
