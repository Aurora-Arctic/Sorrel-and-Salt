import { useEffect, useState } from 'react';
import type { LazyModule, PreloadHandlers } from './types';

const NOT_BUILT = 'M15.85: the preloading lazy module is not built yet';

/** One import shared by every caller, started by the first `load()`. */
export function lazyModule<M>(importer: () => Promise<M>): LazyModule<M> {
  void importer;
  throw new Error(NOT_BUILT);
}

/** Starts each module's load once the page has loaded and the browser is idle, through a timer where there is no `requestIdleCallback`. */
export function usePreloadWhenIdle(...modules: LazyModule<unknown>[]): void {
  void modules;
  throw new Error(NOT_BUILT);
}

/** The handlers that start each module's load on the control that opens it. */
export function preloadOnIntent(...modules: LazyModule<unknown>[]): PreloadHandlers {
  void modules;
  throw new Error(NOT_BUILT);
}

/**
 * The module `load` imports, or null until it arrives; it fetches only once `wanted` is true, so a
 * component draws its frame at once. A failed load leaves null, so the frame stays on its loading state
 * rather than throwing; the bundler caches the import, so a second use makes no new request.
 */
export function useLazyModule<M>(
  source: (() => Promise<M>) | LazyModule<M>,
  wanted: boolean,
): M | null {
  if (typeof source !== 'function') throw new Error(NOT_BUILT);
  const load = source;
  const [module, setModule] = useState<M | null>(null);
  useEffect(() => {
    if (!wanted || module) return;
    let current = true;
    load().then(
      (arrived) => {
        if (current) setModule(arrived);
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [load, wanted, module]);
  return module;
}
