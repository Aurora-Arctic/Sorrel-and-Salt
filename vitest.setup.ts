import { afterEach, afterAll, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './src/test/msw/server';

// Ported from resume-2026's vitest.setup.ts. `test.globals: true` doesn't
// register RTL's automatic afterEach(cleanup) on its own, so without this a
// multi-test file leaks rendered DOM from one test into the next.
afterEach(() => {
  cleanup();
});

// Node's own native `localStorage` global (a lazy getter that requires
// `--localstorage-file` to actually work) shadows jsdom's working
// implementation once vitest merges jsdom's window into the global scope,
// leaving `window.localStorage` undefined in tests even though it works
// correctly in real browsers. Polyfill with a minimal in-memory Storage so
// tests that touch localStorage (e.g. ThemeToggle) can run. The `unit`
// project always runs this file under `environment: 'jsdom'`, so the
// polyfill is unconditional — merely reading `window.localStorage` to check
// it first would invoke Node's getter and print its ExperimentalWarning as a
// side effect, even though the value it returns is then discarded.
if (typeof window !== 'undefined') {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? (this.store.get(key) ?? null) : null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// MSW mocks `/api/graphql` (handler stub lands in M1.10). Fail unhandled
// requests loudly instead of letting a test hit the network by accident.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
