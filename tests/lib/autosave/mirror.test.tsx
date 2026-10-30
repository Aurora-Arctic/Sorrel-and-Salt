import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMirror, mirrorKey, readMirror, writeMirror } from '@/lib/autosave';

// The localStorage copy an autosaving form keeps until the server confirms: one key per row
// and person, and nothing over a day old offered back.

const AT = new Date('2026-10-27T14:02:00Z');
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('mirrorKey', () => {
  it('names the entity, the row or new, and the person', () => {
    expect(mirrorKey({ entity: 'spell', id: 'row-1', userId: 'user-a' })).toBe(
      'autosave:spell:row-1:user-a',
    );
    expect(mirrorKey({ entity: 'spell', id: null, userId: 'user-a' })).toBe(
      'autosave:spell:new:user-a',
    );
  });
});

describe('readMirror', () => {
  it('returns the value written and when', () => {
    writeMirror('k', { title: 'Testwort' }, AT);
    expect(readMirror('k', new Date(AT.getTime() + HOUR))).toEqual({
      value: { title: 'Testwort' },
      at: AT,
    });
  });

  it('ignores and removes a copy over a day old', () => {
    writeMirror('k', { title: 'Testwort' }, AT);
    expect(readMirror('k', new Date(AT.getTime() + 24 * HOUR))).not.toBeNull();

    expect(readMirror('k', new Date(AT.getTime() + 24 * HOUR + 1))).toBeNull();
    expect(window.localStorage.getItem('k')).toBeNull();
  });

  it('answers null for nothing stored, for something unreadable, and once cleared', () => {
    expect(readMirror('k')).toBeNull();
    window.localStorage.setItem('k', 'not json');
    expect(readMirror('k')).toBeNull();
    window.localStorage.setItem('k', JSON.stringify({ value: 1, at: 'never' }));
    expect(readMirror('k')).toBeNull();

    writeMirror('k', 1);
    clearMirror('k');
    expect(readMirror('k')).toBeNull();
  });

  it('answers null, and writes and clears without throwing, when storage throws', () => {
    const refuse = () => {
      throw new DOMException('Storage refused', 'SecurityError');
    };
    // As blocked site data does: even reaching `localStorage` throws.
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(refuse);

    expect(() => writeMirror('k', 1)).not.toThrow();
    expect(() => clearMirror('k')).not.toThrow();
    expect(readMirror('k')).toBeNull();
    expect(storage).toHaveBeenCalled();
  });
});
