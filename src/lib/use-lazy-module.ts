import {
  type ComponentType,
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import type { LazyModule, PreloadHandlers } from './types';

/** One import shared by every caller, started by the first `load()`. */
export function lazyModule<M>(importer: () => Promise<M>): LazyModule<M> {
  let pending: Promise<M> | null = null;
  let arrived: M | null = null;
  return {
    load: () => {
      if (!pending) {
        pending = importer().then(
          (module) => {
            arrived = module;
            return module;
          },
          (failure: unknown) => {
            pending = null;
            throw failure;
          },
        );
      }
      return pending;
    },
    loaded: () => arrived,
  };
}

const startAll = (modules: readonly LazyModule<unknown>[]) => {
  for (const module of modules) module.load().catch(() => {});
};

/** Starts each module's load once the page has loaded and the browser is idle, through a timer where there is no `requestIdleCallback`. */
export function usePreloadWhenIdle(...modules: LazyModule<unknown>[]): void {
  useEffect(() => {
    let handle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => startAll(modules);
    const whenIdle = () => {
      // Enhancement: Safari has no requestIdleCallback, so a timer stands in.
      if (typeof requestIdleCallback === 'function') handle = requestIdleCallback(start);
      else timer = setTimeout(start, 200);
    };
    const waiting = document.readyState !== 'complete';
    if (waiting) window.addEventListener('load', whenIdle, { once: true });
    else whenIdle();
    return () => {
      window.removeEventListener('load', whenIdle);
      if (handle !== undefined && typeof cancelIdleCallback === 'function')
        cancelIdleCallback(handle);
      if (timer !== undefined) clearTimeout(timer);
    };
    // The arguments are module-level constants and the preload runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** The handlers that start each module's load on the control that opens it. */
export function preloadOnIntent(...modules: LazyModule<unknown>[]): PreloadHandlers {
  const start = () => startAll(modules);
  return { onPointerEnter: start, onFocus: start, onPointerDown: start };
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
  const lazy = typeof source === 'function' ? null : source;
  const load: () => Promise<M> = typeof source === 'function' ? source : source.load;
  const [late, setModule] = useState<M | null>(null);
  const module = late ?? lazy?.loaded() ?? null;
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

/**
 * A component that draws `module`'s default export once it arrives and `fallback` (nothing, by default)
 * until then. It starts the load on first render; the module stays exported by its caller so openers can
 * preload it.
 */
export function lazyComponent<P extends object>(
  module: LazyModule<{ default: ComponentType<P> }>,
  { fallback }: { fallback?: (props: P) => ReactNode } = {},
): (props: P) => ReactElement | null {
  return function LazyComponent(props: P) {
    const arrived = useLazyModule(module, true);
    if (arrived) return createElement(arrived.default, props);
    return fallback ? createElement(Fragment, null, fallback(props)) : null;
  };
}
