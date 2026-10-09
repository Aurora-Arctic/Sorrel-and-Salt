import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// The `dom` project's half of the setup; setup-msw.ts is the half both
// projects share.

// RTL registers this itself under `globals: true` (its entry checks for a
// global `afterEach`); the explicit call is a harmless duplicate from the port.
afterEach(() => {
  cleanup();
});

// Node's own `localStorage` global shadows jsdom's once Vitest merges jsdom's
// window into the global scope. Replaced without reading it first: merely
// reading `window.localStorage` to check invokes Node's getter and prints its
// ExperimentalWarning.
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

// Emptied after every test, as the render is: what one test stores — a theme,
// a remembered choice — is not there for the next to find.
afterEach(() => {
  window.localStorage.clear();
});
