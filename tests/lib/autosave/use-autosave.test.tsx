import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mirrorKey,
  useAutosave,
  type AutosaveOptions,
  type SaveContext,
  type SaveResult,
} from '@/lib/autosave';
import { GraphQLClientError, StaleWriteError } from '@/lib/graphql-client-error';

// An autosaving form (M13.16): a save 3 s after the last change and at most
// 30 s into a run of them, one in flight, retries with backoff, a pause when
// someone else saved first, and a copy in localStorage until the server has
// the value (claude-docs/components/autosave.md).

type Draft = { title: string };
type Props = Partial<AutosaveOptions<Draft>> & { value: Draft };

const KEY = mirrorKey({ entity: 'draft', id: null, userId: 'user-a' });
const AT = new Date('2026-10-27T14:02:00Z');

/** A save the test answers by hand: each call waits until it is resolved or rejected. */
function controlledSave() {
  const calls: {
    value: Draft;
    context: SaveContext;
    resolve: (result: SaveResult) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const save = vi.fn(
    (value: Draft, context: SaveContext) =>
      new Promise<SaveResult>((resolve, reject) => {
        calls.push({ value, context, resolve, reject });
      }),
  );
  return { save, calls };
}

const confirmed = (revision: number, id = 'row-1'): SaveResult => ({ revision, savedAt: AT, id });

function renderAutosave(save: AutosaveOptions<Draft>['save'], props: Partial<Props> = {}) {
  const initialProps: Props = { value: { title: '' }, dirty: false, enabled: true, ...props };
  const view = renderHook(
    (current: Props) =>
      useAutosave<Draft>({
        dirty: false,
        enabled: true,
        mirror: KEY,
        ...current,
        save,
      }),
    { initialProps },
  );
  let latest = initialProps;
  /** A keystroke: the form's value changes and it is dirty. */
  const type = (title: string, more: Partial<Props> = {}) => {
    latest = { ...latest, value: { title }, dirty: true, ...more };
    view.rerender(latest);
  };
  const rerender = (more: Partial<Props>) => {
    latest = { ...latest, ...more };
    view.rerender(latest);
  };
  return { ...view, type, rerender };
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** Lets a resolved or rejected save's continuation run. */
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

const stored = () => window.localStorage.getItem(KEY);

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAutosave timing', () => {
  it('saves 3 s after the last change, with the latest value', async () => {
    const { save } = controlledSave();
    const { type, result } = renderAutosave(save);

    type('T');
    await wait(2000);
    type('Te');
    await wait(2999);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('pending');

    await wait(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: 'Te' }, { revision: null, force: false, id: null });
    expect(result.current.status).toBe('saving');
  });

  it('saves within 30 s during continuous change', async () => {
    const { save } = controlledSave();
    const { type } = renderAutosave(save);

    // A change every second never lets the 3 s delay run out.
    for (let second = 1; second < 30; second += 1) {
      type(`T${second}`);
      await wait(1000);
    }
    expect(save).not.toHaveBeenCalled();

    type('T30');
    await wait(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('saves nothing when the form opens or goes back to clean', async () => {
    const { save } = controlledSave();
    const { type, rerender, result } = renderAutosave(save, { value: { title: 'Opened' } });

    await wait(60_000);
    expect(save).not.toHaveBeenCalled();

    type('Opened, edited');
    rerender({ value: { title: 'Opened' }, dirty: false });
    await wait(60_000);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('waits while disabled, and saves once it is enabled', async () => {
    const { save } = controlledSave();
    const { type, rerender } = renderAutosave(save, { enabled: false });

    type('T');
    await wait(60_000);
    expect(save).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await wait(3000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('useAutosave with a save in flight', () => {
  it('sends one save at a time, and exactly one follow-up for changes made during it', async () => {
    const { save, calls } = controlledSave();
    const { type, result } = renderAutosave(save);

    type('T');
    await wait(3000);
    expect(save).toHaveBeenCalledTimes(1);

    // Two runs of changes, each past its delay, while the first save is out.
    type('Te');
    await wait(3000);
    type('Tes');
    await wait(3000);
    expect(save).toHaveBeenCalledTimes(1);

    calls[0].resolve(confirmed(2));
    await settle();
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].value).toEqual({ title: 'Tes' });

    calls[1].resolve(confirmed(3));
    await settle();
    await wait(60_000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
    expect(result.current.savedAt).toEqual(AT);
  });

  it('passes the revision and id the last save returned to the next, starting from the one it opened at', async () => {
    const { save, calls } = controlledSave();
    const { type, result } = renderAutosave(save, { revision: 5 });

    type('T');
    await wait(3000);
    expect(calls[0].context).toEqual({ revision: 5, force: false, id: null });
    calls[0].resolve(confirmed(6, 'row-9'));
    await settle();
    expect(result.current.id).toBe('row-9');

    type('Te');
    await wait(3000);
    expect(calls[1].context).toEqual({ revision: 6, force: false, id: 'row-9' });
  });

  it('flush() saves at once and resolves once the server has the value', async () => {
    const { save, calls } = controlledSave();
    const { type, result } = renderAutosave(save);
    type('T');

    let flushed = false;
    act(() => {
      void result.current.flush().then(() => {
        flushed = true;
      });
    });
    expect(save).toHaveBeenCalledTimes(1);
    await settle();
    expect(flushed).toBe(false);

    calls[0].resolve(confirmed(2));
    await settle();
    expect(flushed).toBe(true);
    expect(result.current.status).toBe('saved');
  });
});

describe('useAutosave when a save fails', () => {
  it('stops at failed at once for a refusal, which asking again would not change', async () => {
    const save = vi.fn(() =>
      Promise.reject(
        new GraphQLClientError({
          status: 200,
          errors: [{ message: 'Not allowed', extensions: { code: 'FORBIDDEN' } }],
        }),
      ),
    );
    const { type, result } = renderAutosave(save);

    type('T');
    await wait(3000);
    expect(result.current.status).toBe('failed');
    expect(result.current.error?.message).toBe('Not allowed');
    await wait(60_000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('retries after 2 s, 5 s and 15 s, then stops at failed until Retry', async () => {
    const save = vi.fn(() => Promise.reject(new Error('Network down')));
    const { type, result } = renderAutosave(save);

    type('T');
    await wait(3000);
    expect(save).toHaveBeenCalledTimes(1);

    await wait(1999);
    expect(save).toHaveBeenCalledTimes(1);
    await wait(1);
    expect(save).toHaveBeenCalledTimes(2);
    // A retry wait is still saving, and `error` is kept for a save that has
    // failed for good.
    expect(result.current.status).toBe('saving');
    expect(result.current.error).toBeNull();

    await wait(4999);
    expect(save).toHaveBeenCalledTimes(2);
    await wait(1);
    expect(save).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeNull();

    await wait(14_999);
    expect(save).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('saving');
    expect(result.current.error).toBeNull();
    await wait(1);
    expect(save).toHaveBeenCalledTimes(4);
    expect(result.current.status).toBe('failed');
    expect(result.current.error?.message).toBe('Network down');

    // Stopped: neither time nor further typing sends again.
    type('Te');
    await wait(120_000);
    expect(save).toHaveBeenCalledTimes(4);

    save.mockResolvedValueOnce(confirmed(2) as never);
    act(() => result.current.retry());
    expect(result.current.status).toBe('saving');
    expect(result.current.error).toBeNull();
    await settle();
    expect(save).toHaveBeenCalledTimes(5);
    expect(save).toHaveBeenLastCalledWith({ title: 'Te' }, expect.anything());
    expect(result.current.status).toBe('saved');
    expect(result.current.error).toBeNull();
  });
});

describe('useAutosave on a conflict', () => {
  const stale = () => new StaleWriteError({ status: 200, errors: [], currentRevision: 9 } as never);

  async function inConflict() {
    const { save, calls } = controlledSave();
    const view = renderAutosave(save, { revision: 4 });
    view.type('Mine');
    await wait(3000);
    calls[0].reject(stale());
    await settle();
    return { save, calls, ...view };
  }

  it('pauses autosave and reports the revision the row is at now', async () => {
    const { save, type, result } = await inConflict();
    expect(result.current.status).toBe('conflict');
    expect(result.current.conflict).toEqual({ currentRevision: 9 });

    type('Mine, still typing');
    await wait(120_000);
    expect(save).toHaveBeenCalledTimes(1);
    await expect(result.current.flush()).rejects.toBeInstanceOf(StaleWriteError);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('Keep My Version sends the value again with force, against the current revision', async () => {
    const { save, calls, type, result } = await inConflict();

    act(() => {
      void result.current.resolveConflict('keep-mine');
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].context).toEqual({ revision: 9, force: true, id: null });
    calls[1].resolve(confirmed(10));
    await settle();
    expect(result.current.status).toBe('saved');
    expect(result.current.conflict).toBeNull();

    // Force is for that one write: the next goes back to checking.
    type('Mine again');
    await wait(3000);
    expect(calls[2].context).toEqual({ revision: 10, force: false, id: 'row-1' });
  });

  it('Reload Latest drops the unsaved value and its mirror, and saves nothing', async () => {
    const { save, result, rerender } = await inConflict();
    expect(stored()).not.toBeNull();

    await act(() => result.current.resolveConflict('reload'));
    // The caller resets the form from the server, which leaves it clean.
    rerender({ value: { title: 'Theirs' }, dirty: false });
    await wait(60_000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.conflict).toBeNull();
    expect(stored()).toBeNull();
  });
});

describe('useAutosave flushes', () => {
  it('when the tab is hidden', async () => {
    const { save } = controlledSave();
    const { type } = renderAutosave(save);
    type('T');
    expect(save).not.toHaveBeenCalled();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('when focus leaves the form root, and not when it moves within it', async () => {
    const form = document.createElement('form');
    const inside = document.createElement('input');
    const other = document.createElement('input');
    const outside = document.createElement('button');
    form.append(inside, other);
    document.body.append(form, outside);
    const { save } = controlledSave();
    const { type } = renderAutosave(save, { root: { current: form } });
    type('T');

    act(() => {
      inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: other }));
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      other.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    });
    expect(save).toHaveBeenCalledTimes(1);

    form.remove();
    outside.remove();
  });

  it('asks the browser before the tab closes only while a change is not on the server', async () => {
    const { save, calls } = controlledSave();
    const { type } = renderAutosave(save);
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);

    type('T');
    expect(unload()).toBe(true);

    await wait(3000);
    calls[0].resolve(confirmed(2));
    await settle();
    expect(unload()).toBe(false);
  });
});

describe('useAutosave mirror', () => {
  it('writes every change, keeps it through a failed save, and clears it only once the server confirms', async () => {
    const { save, calls } = controlledSave();
    const { type, result } = renderAutosave(save);

    type('T');
    expect(JSON.parse(stored() ?? 'null')).toEqual({
      value: { title: 'T' },
      at: new Date().toISOString(),
    });
    type('Te');
    expect(JSON.parse(stored() ?? 'null').value).toEqual({ title: 'Te' });

    await wait(3000);
    // Sent but not yet confirmed.
    expect(stored()).not.toBeNull();
    calls[0].reject(new Error('Network down'));
    await settle();
    expect(stored()).not.toBeNull();

    await wait(2000);
    calls[1].resolve(confirmed(2));
    await settle();
    expect(result.current.status).toBe('saved');
    expect(stored()).toBeNull();
  });

  it('keeps a change made while the save was in flight', async () => {
    const { save, calls } = controlledSave();
    const { type } = renderAutosave(save);

    type('T');
    await wait(3000);
    type('Te');
    calls[0].resolve(confirmed(2));
    await settle();

    expect(JSON.parse(stored() ?? 'null').value).toEqual({ title: 'Te' });
  });

  it('still saves when storage throws on every access', async () => {
    const refuse = () => {
      throw new DOMException('Storage refused', 'SecurityError');
    };
    // As blocked site data does: even reaching `localStorage` throws.
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(refuse);
    const { save, calls } = controlledSave();
    const { type, result } = renderAutosave(save);

    type('T');
    await wait(3000);
    expect(storage).toHaveBeenCalled();
    calls[0].resolve(confirmed(2));
    await settle();

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });
});
