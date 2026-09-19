import { afterEach, afterAll, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './tests/support/msw/server';

// RTL registers this itself under `globals: true` (its entry checks for a
// global `afterEach`); the explicit call is a harmless duplicate from the port.
afterEach(() => {
  cleanup();
});

// Node's own `localStorage` global shadows jsdom's once Vitest merges jsdom's
// window into the global scope. Unconditional: merely reading
// `window.localStorage` to check first invokes Node's getter and prints its
// ExperimentalWarning.
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

// Unhandled requests fail loudly rather than hitting the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
