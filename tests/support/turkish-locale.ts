import { vi } from 'vitest';

/** Makes `toLocaleLowerCase()` fold as a Turkish-locale browser does (I to dotless ı), which `toLowerCase()` never does. */
export function useTurkishCaseFolding(): () => void {
  const original = String.prototype.toLocaleLowerCase;
  const spy = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (
    this: string,
    ...locales: Parameters<typeof original>
  ) {
    if (locales.length > 0) return original.apply(this, locales);
    return String(this).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  });
  return () => spy.mockRestore();
}
