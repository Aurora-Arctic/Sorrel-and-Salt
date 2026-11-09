import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import type { LazyModule } from '@/lib/types';
import {
  lazyModule,
  preloadOnIntent,
  useLazyModule,
  usePreloadWhenIdle,
} from '@/lib/use-lazy-module';
import {
  beginPress,
  finishLoading,
  focusOn,
  pointTo,
  setReadyState,
  stubIdle,
} from '../support/preload';

// A module kept out of the first-load scripts starts loading before anything shows it: once the page has
// loaded and the browser is idle, and when a person points at, focuses or begins to press the control that
// opens it. It is imported once however many of those come, and once it has arrived the dialog draws it at
// once (claude-docs/components/modal.md, "Contents that load on first open").

const ARRIVED = { name: 'the deferred module' } as const;
type Arrived = typeof ARRIVED;

function deferred(): {
  importer: ReturnType<typeof vi.fn<() => Promise<Arrived>>>;
  lazy: LazyModule<Arrived>;
} {
  const importer = vi.fn(() => Promise.resolve(ARRIVED));
  return { importer, lazy: lazyModule(importer) };
}

describe('lazyModule', () => {
  it('imports nothing until the first load, and once however many loads follow', async () => {
    const { importer, lazy } = deferred();
    expect(importer).not.toHaveBeenCalled();
    expect(lazy.loaded()).toBeNull();

    const first = lazy.load();
    const second = lazy.load();
    expect(importer).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    await expect(first).resolves.toBe(ARRIVED);
    expect(lazy.loaded()).toBe(ARRIVED);

    await lazy.load();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed import, so a later load tries again', async () => {
    const importer = vi
      .fn<() => Promise<Arrived>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ARRIVED);
    const lazy = lazyModule(importer);

    await expect(lazy.load()).rejects.toThrow('offline');
    expect(lazy.loaded()).toBeNull();
    await expect(lazy.load()).resolves.toBe(ARRIVED);
    expect(importer).toHaveBeenCalledTimes(2);
    expect(lazy.loaded()).toBe(ARRIVED);
  });
});

describe('usePreloadWhenIdle', () => {
  it('starts the load when the browser is next idle after the page has loaded, and not before', () => {
    const idle = stubIdle();
    setReadyState('complete');
    const { importer, lazy } = deferred();
    renderHook(() => usePreloadWhenIdle(lazy));

    expect(importer).not.toHaveBeenCalled();
    expect(idle.pending()).toBeGreaterThan(0);
    idle.runIdle();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('waits for the page’s load event before asking for idle time', () => {
    const idle = stubIdle();
    setReadyState('loading');
    const { importer, lazy } = deferred();
    renderHook(() => usePreloadWhenIdle(lazy));

    expect(idle.pending()).toBe(0);
    expect(importer).not.toHaveBeenCalled();

    finishLoading();
    expect(importer).not.toHaveBeenCalled();
    expect(idle.pending()).toBeGreaterThan(0);
    idle.runIdle();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timer where the browser has no requestIdleCallback, as Safari has none', async () => {
    // Precondition: the environment has no idle callback of its own, so only a fallback can start the load.
    expect('requestIdleCallback' in window).toBe(false);
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    setReadyState('complete');
    const { importer, lazy } = deferred();
    renderHook(() => usePreloadWhenIdle(lazy));

    expect(importer).not.toHaveBeenCalled();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('imports once for every caller on the page', () => {
    const idle = stubIdle();
    setReadyState('complete');
    const { importer, lazy } = deferred();
    renderHook(() => usePreloadWhenIdle(lazy));
    renderHook(() => usePreloadWhenIdle(lazy));
    renderHook(() => usePreloadWhenIdle(lazy));

    idle.runIdle();
    expect(importer).toHaveBeenCalledTimes(1);
  });
});

describe('preloadOnIntent', () => {
  function Opener({ lazy }: { lazy: LazyModule<Arrived> }) {
    return (
      <button type="button" {...preloadOnIntent(lazy)}>
        Open
      </button>
    );
  }

  it.each([
    ['the pointer reaches', pointTo],
    ['the focus reaches', focusOn],
    ['a press begins on', beginPress],
  ])('starts the load when %s the control', (_intent, intend) => {
    // No idle callback is ever run, so only the intent can start the load.
    stubIdle();
    const { importer, lazy } = deferred();
    render(<Opener lazy={lazy} />);
    expect(importer).not.toHaveBeenCalled();

    intend(screen.getByRole('button', { name: 'Open' }));
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('starts no second import when a second intent follows the first', () => {
    stubIdle();
    const { importer, lazy } = deferred();
    render(<Opener lazy={lazy} />);
    const control = screen.getByRole('button', { name: 'Open' });

    pointTo(control);
    focusOn(control);
    beginPress(control);
    expect(importer).toHaveBeenCalledTimes(1);
  });
});

describe('useLazyModule given a lazy module', () => {
  it('returns the module on its first render once it has arrived, so the dialog never draws its loading frame', async () => {
    const { lazy } = deferred();
    await lazy.load();
    const rendered: (Arrived | null)[] = [];
    renderHook(() => {
      rendered.push(useLazyModule(lazy, true));
    });
    expect(rendered[0]).toBe(ARRIVED);
  });

  it('starts a load not yet begun once wanted, sharing the one import', async () => {
    const { importer, lazy } = deferred();
    const { result, rerender } = renderHook(({ wanted }) => useLazyModule(lazy, wanted), {
      initialProps: { wanted: false },
    });
    expect(importer).not.toHaveBeenCalled();
    expect(result.current).toBeNull();

    rerender({ wanted: true });
    await waitFor(() => expect(result.current).toBe(ARRIVED));
    lazy.load();
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
