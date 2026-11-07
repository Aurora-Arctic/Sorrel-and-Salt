import { useEffect, useState } from 'react';

/**
 * The module `load` imports, or null until it arrives; it fetches only once `wanted` is true, so a
 * component draws its frame at once. A failed load leaves null, so the frame stays on its loading state
 * rather than throwing; the bundler caches the import, so a second use makes no new request.
 */
export function useLazyModule<M>(load: () => Promise<M>, wanted: boolean): M | null {
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
