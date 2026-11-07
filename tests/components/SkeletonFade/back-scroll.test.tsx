import { act, renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeavingSkeleton } from '@/components/SkeletonFade';

// The skeleton takes the window to the top as it shows, which is before the router writes the new history entry, so
// the browser would save 0 for the page left. The hook keeps the page's own position in its history entry and puts
// it back on Back or Forward, once the router has drawn that entry's page.

const skeleton = <p>Waiting</p>;
const KEY = 'skeletonScrollY';
const nextState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'origin' } };

let scrollTo: ReturnType<typeof vi.spyOn>;

const setScrollY = (y: number) =>
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
  window.history.replaceState({ ...nextState }, '', '/origin');
  setScrollY(0);
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
});

const setup = (shown: ReactElement | null) =>
  renderHook(({ el }) => useLeavingSkeleton(el), { initialProps: { el: shown } });

/** Leaves the origin as a push navigation would: the skeleton shows, then the router writes a new entry and the wait ends. */
const leave = (rerender: (props: { el: ReactElement | null }) => void) => {
  rerender({ el: skeleton });
  window.history.pushState(
    { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'destination' } },
    '',
    '/destination',
  );
  rerender({ el: null });
};

/** Goes Back to the origin: the browser moves to its entry and fires popstate, before the router has drawn it. */
const back = () => {
  window.history.back();
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  });
};

/** The router draws the entry's page, writing the entry again with its custom state kept. */
const routerDraws = () => {
  window.history.replaceState(
    { ...window.history.state, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'origin, drawn' } },
    '',
  );
};

describe('useLeavingSkeleton and the scroll position Back returns to', () => {
  it("saves the page's scroll position in its history entry, keeping the router's state, before it scrolls to the top", () => {
    setScrollY(1840);
    let savedWhenScrolled: unknown;
    scrollTo.mockImplementation(() => {
      savedWhenScrolled = window.history.state?.[KEY];
    });
    const { rerender } = setup(null);
    rerender({ el: skeleton });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(savedWhenScrolled).toBe(1840);
    expect(window.history.state).toMatchObject({ ...nextState, [KEY]: 1840 });
  });

  it('puts the saved position back on Back only once the router has drawn the page, then forgets it', async () => {
    setScrollY(1840);
    const { rerender } = setup(null);
    leave(rerender);
    scrollTo.mockClear();
    setScrollY(0);

    back();
    await vi.waitFor(() => expect(window.location.pathname).toBe('/origin'));
    act(() => void vi.advanceTimersByTime(100));
    // Why it could land wrong: the position is saved, yet nothing scrolls while the old page still stands.
    expect(window.history.state?.[KEY]).toBe(1840);
    expect(scrollTo).not.toHaveBeenCalled();

    routerDraws();
    act(() => void vi.advanceTimersByTime(100));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1840, behavior: 'instant' });
    expect(window.history.state?.[KEY]).toBeUndefined();
    expect(window.history.state).toMatchObject({ __NA: true });
  });

  it('leaves the browser to it on Back to an entry with no saved position', async () => {
    const { rerender } = setup(null);
    window.history.pushState({ __NA: true }, '', '/destination');
    rerender({ el: null });

    back();
    await vi.waitFor(() => expect(window.location.pathname).toBe('/origin'));
    routerDraws();
    act(() => void vi.advanceTimersByTime(100));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('restores once when the hook is mounted twice', async () => {
    setScrollY(900);
    const { rerender } = setup(null);
    setup(null);
    leave(rerender);
    scrollTo.mockClear();

    back();
    await vi.waitFor(() => expect(window.location.pathname).toBe('/origin'));
    routerDraws();
    act(() => void vi.advanceTimersByTime(100));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('still restores when Back swaps the layout, so the host that heard it unmounts before the page draws', async () => {
    setScrollY(918);
    const leaving = setup(null);
    leave(leaving.rerender);
    scrollTo.mockClear();

    back();
    await vi.waitFor(() => expect(window.location.pathname).toBe('/origin'));
    // The arriving layout's host replaces the one that was listening, in the commit that draws the page.
    leaving.unmount();
    setup(null);
    routerDraws();
    act(() => void vi.advanceTimersByTime(100));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 918, behavior: 'instant' });
  });

  it('restores on a Back heard while no skeleton host is mounted', async () => {
    setScrollY(918);
    const leaving = setup(null);
    leave(leaving.rerender);
    leaving.unmount();
    scrollTo.mockClear();

    back();
    await vi.waitFor(() => expect(window.location.pathname).toBe('/origin'));
    setup(null);
    routerDraws();
    act(() => void vi.advanceTimersByTime(100));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 918, behavior: 'instant' });
  });

  it('forgets the saved position when the wait ends without leaving the page', () => {
    setScrollY(1200);
    const { rerender } = setup(null);
    rerender({ el: skeleton });
    expect(window.history.state?.[KEY]).toBe(1200);

    rerender({ el: null });
    expect(window.history.state?.[KEY]).toBeUndefined();
    expect(window.history.state).toMatchObject(nextState);
  });
});
