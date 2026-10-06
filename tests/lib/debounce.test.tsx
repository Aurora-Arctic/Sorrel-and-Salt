import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEBOUNCE_MS, useDebouncedValue } from '@/lib/debounce';

// The one debounce a typed lookup waits on (claude-docs/components/combobox.md,
// "The debounce"): a value settles once it has stopped changing for the delay.

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as the value it is given', () => {
    const { result } = renderHook(() => useDebouncedValue('wax'));

    expect(result.current).toBe('wax');
  });

  it('follows a change only once the delay has passed without another', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: '' },
    });

    rerender({ value: 'w' });
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    rerender({ value: 'wa' });
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('wa');
  });

  it('takes a delay of its own', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 50), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(50));

    expect(result.current).toBe('b');
  });

  it('drops a change undone before the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    rerender({ value: 'a' });
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS));

    expect(result.current).toBe('a');
  });
});
