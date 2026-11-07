import { useEffect, useState } from 'react';

/**
 * The module `load` imports, or null until it arrives. It fetches only once `wanted` is true, so a
 * component can draw its frame at once and pull the code in behind it. A failed load leaves null:
 * the frame stays on its loading state rather than throwing into the page. The bundler caches the
 * import, so a second use resolves without another request.
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
