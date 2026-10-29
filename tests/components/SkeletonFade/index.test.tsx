import { act, renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeavingSkeleton } from '@/components/SkeletonFade';

// The skeleton kept for the length of its fade-out once its wait ends:
// the bodies' tests show it in place; this holds the timing and the cases the
// navigation harness cannot start, a new wait in the middle of a fade.

const first = <p>First wait</p>;
const second = <p>Second wait</p>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const setup = (shown: ReactElement | null) =>
  renderHook(({ el }) => useLeavingSkeleton(el), { initialProps: { el: shown } });

describe('useLeavingSkeleton', () => {
  it('has nothing to keep while a wait is on, or when there never was one', () => {
    const { result, rerender } = setup(null);
    expect(result.current).toBeNull();
    rerender({ el: null });
    expect(result.current).toBeNull();

    rerender({ el: first });
    expect(result.current).toBeNull();
  });

  it('keeps the last skeleton from the moment the wait ends until 200ms later', () => {
    const { result, rerender } = setup(first);
    rerender({ el: null });
    expect(result.current).toBe(first);

    act(() => void vi.advanceTimersByTime(199));
    expect(result.current).toBe(first);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBeNull();
  });

  it('gives it up at once when a new wait starts, and the old timer does not clear the new one', () => {
    const { result, rerender } = setup(first);
    rerender({ el: null });
    act(() => void vi.advanceTimersByTime(100));

    rerender({ el: second });
    expect(result.current).toBeNull();
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toBeNull();

    // The new wait ends in its turn, with its own full fade.
    rerender({ el: null });
    expect(result.current).toBe(second);
    act(() => void vi.advanceTimersByTime(199));
    expect(result.current).toBe(second);
  });
});
