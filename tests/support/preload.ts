import { act, fireEvent } from '@testing-library/react';
import { onTestFinished, vi } from 'vitest';

// What a preloading test needs: control over when the page counts as loaded and idle, the three intents a
// person shows towards a control, and a count of which deferred modules have been evaluated.

type ReadyState = DocumentReadyState;

/** Sets `document.readyState` for this test; the page's `load` event is the caller's to dispatch. */
export function setReadyState(state: ReadyState): void {
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => state });
  onTestFinished(() => {
    Reflect.deleteProperty(document, 'readyState');
  });
}

/** The page has finished loading: `readyState` is complete and the window's `load` event fires. */
export function finishLoading(): void {
  setReadyState('complete');
  act(() => {
    window.dispatchEvent(new Event('load'));
  });
}

export interface IdleStub {
  /** Idle callbacks asked for and not yet run or cancelled. */
  pending: () => number;
  /** Runs every pending idle callback, as a browser does once it is idle. */
  runIdle: () => void;
}

/** A `requestIdleCallback` (absent from happy-dom, as from Safari) whose callbacks run only when the test says. */
export function stubIdle(): IdleStub {
  const pending = new Map<number, IdleRequestCallback>();
  let last = 0;
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((callback: IdleRequestCallback) => {
      last += 1;
      pending.set(last, callback);
      return last;
    }),
  );
  vi.stubGlobal(
    'cancelIdleCallback',
    vi.fn((handle: number) => {
      pending.delete(handle);
    }),
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  return {
    pending: () => pending.size,
    runIdle: () => {
      const due = [...pending.values()];
      pending.clear();
      act(() => {
        for (const callback of due) callback({ didTimeout: false, timeRemaining: () => 50 });
      });
    },
  };
}

/** The pointer reaching a control, as both pointer and mouse events, since a handler may listen for either. */
export function pointTo(control: HTMLElement): void {
  fireEvent.pointerEnter(control);
  fireEvent.mouseEnter(control);
}

/** The focus reaching a control, by keyboard: no pointer event. */
export function focusOn(control: HTMLElement): void {
  act(() => control.focus());
}

/** A press beginning on a control, held: it has not yet been released, so no click has opened anything. */
export function beginPress(control: HTMLElement): void {
  fireEvent.pointerDown(control, { button: 0 });
  fireEvent.mouseDown(control, { button: 0 });
}

/**
 * Starts a fresh module registry and counts, from here on, the evaluations of each specifier: a module
 * the component imports statically counts once it is imported, one behind `import()` once the load
 * starts. Import the component under test after calling this, with `await import(...)`.
 */
export function watchLoads(specifiers: readonly string[]): () => string[] {
  vi.resetModules();
  const loaded: string[] = [];
  for (const specifier of specifiers) {
    // Vitest caches an async factory's result only once it resolves, so two importers asking at once
    // would each run it; the one promise keeps a specifier counted once however many ask.
    let evaluated: Promise<unknown> | undefined;
    vi.doMock(specifier, (importOriginal) => {
      evaluated ??= (async () => {
        loaded.push(specifier);
        return importOriginal();
      })();
      return evaluated as Promise<Record<string, unknown>>;
    });
  }
  onTestFinished(() => {
    for (const specifier of specifiers) vi.doUnmock(specifier);
  });
  return () => [...loaded];
}
