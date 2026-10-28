'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { type FieldValues, type UseFormReturn, get, useFormState } from 'react-hook-form';
import {
  HISTORY_LIMIT,
  TYPING_PAUSE_MS,
  cloneValues,
  decideMerge,
  historyReducer,
  initialHistory,
  sameValues,
} from './form-history';
import type { FormHistory, HistoryAction, HistoryStep, UseFormHistoryOptions } from './types';

// Undo and redo for a react-hook-form form (M12.9). react-hook-form stays the
// one store of values: this hook watches its value changes, keeps a stack of
// what each action changed, and puts values back with `setValue`. It is not
// `reset`, which would clear the errors and the submit count and throw
// registration away. claude-docs/design-decisions/m12.9-plan.md has the
// argument; claude-docs/components/field.md, "Undo and redo", the use.

/** The events that start something new, as far as "the same action" goes. */
const ACTION_EVENTS = ['pointerdown', 'keydown', 'input', 'change', 'click'] as const;

const fieldNamed = (root: HTMLElement, name: string): HTMLElement | undefined =>
  Array.from(root.querySelectorAll<HTMLElement>('[name]')).find(
    (element) => element.getAttribute('name') === name,
  );

/** The controls of a list: every field named under the array's own name. */
const fieldsUnder = (root: HTMLElement, name: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('[name]')).filter((element) => {
    const own = element.getAttribute('name') ?? '';
    return own.startsWith(`${name}.`) || own.startsWith(`${name}[`);
  });

const isFocusable = (element: HTMLElement | null | undefined): element is HTMLElement =>
  !!element && !element.hasAttribute('disabled') && element.getAttribute('type') !== 'hidden';

const lastOf = <T>(items: T[]): T | undefined => items[items.length - 1];

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\*$/, '').trim();

/** What a field is called, read from the page: its label, its aria-label, its fieldset's legend. */
function labelOf(root: HTMLElement, name: string): string {
  const field = fieldNamed(root, name);
  const control = field ?? fieldsUnder(root, name)[0];
  const labelled =
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
      ? clean(field.labels?.[0]?.textContent)
      : '';
  if (labelled) return labelled;
  const byId = (field?.getAttribute('aria-labelledby') ?? '')
    .split(' ')
    .map((id) => root.ownerDocument.getElementById(id)?.textContent ?? '')
    .join(' ');
  const named = clean(byId) || clean(field?.getAttribute('aria-label'));
  if (named) return named;
  return clean(control?.closest('fieldset')?.querySelector('legend')?.textContent) || 'the form';
}

/** Whether the text is typed into a box, not picked: the `input` or `change` of a text control. */
function textBoxName(target: EventTarget | null): string | null {
  if (target instanceof HTMLTextAreaElement) return target.name;
  if (target instanceof HTMLInputElement && !['checkbox', 'radio', 'hidden'].includes(target.type))
    return target.name;
  return null;
}

export function useFormHistory<V extends FieldValues>(
  methods: UseFormReturn<V, any, any>,
  {
    root,
    enabled = true,
    ignore,
    skip,
    onRestored,
    pauseMs = TYPING_PAUSE_MS,
    limit = HISTORY_LIMIT,
  }: UseFormHistoryOptions,
): FormHistory {
  const { subscribe, getValues, setValue, control } = methods;
  const { isSubmitted } = useFormState({ control });
  const [state, dispatch] = useReducer(historyReducer, initialHistory);
  // The same state, readable between renders: two chords before a render
  // each find the stack the last one left.
  const stateRef = useRef(state);
  const commit = useCallback((action: HistoryAction) => {
    stateRef.current = historyReducer(stateRef.current, action);
    dispatch(action);
  }, []);

  const present = useRef<unknown>(undefined);
  const defaultsSeen = useRef<unknown>(undefined);
  const restoring = useRef(false);
  // The newest step was recorded in the action still running.
  const tickOpen = useRef(false);
  const tickScheduled = useRef(false);
  // The text box the running action typed into.
  const typedInto = useRef<string | null>(null);
  // A pointer is held down, and the hold has already recorded its step.
  const holding = useRef(false);
  const holdRecorded = useRef(false);
  const blurs = useRef(0);
  const stepBlurs = useRef(0);
  const sealed = useRef(false);

  const [spoken, setSpoken] = useState({ text: '', count: 0 });
  const announce = useCallback(
    (text: string) => setSpoken((last) => ({ text, count: last.count + 1 })),
    [],
  );
  const undoButton = useRef<HTMLButtonElement | null>(null);
  const redoButton = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<string[] | null>(null);

  // The recorder: one subscription to the form's values.
  useEffect(() => {
    present.current = cloneValues(getValues());
    defaultsSeen.current = undefined;
    const closeAction = () => {
      tickOpen.current = false;
      typedInto.current = null;
    };
    const noticeEdit = (event: Event) => {
      closeAction();
      if (event.type === 'pointerdown') {
        holding.current = true;
        holdRecorded.current = false;
      }
      const name = textBoxName(event.target);
      if (name !== null && (event.type === 'input' || event.type === 'change'))
        typedInto.current = name;
    };
    const noticeBlur = () => {
      blurs.current += 1;
    };
    // The hold ends on the document, not the form: a drag often leaves the
    // form's box, and the colour picker follows the pointer on the document too.
    const endHold = () => {
      holding.current = false;
      holdRecorded.current = false;
    };
    const element = root.current;
    const doc = element?.ownerDocument;
    for (const type of ACTION_EVENTS) element?.addEventListener(type, noticeEdit, true);
    element?.addEventListener('focusout', noticeBlur, true);
    doc?.addEventListener('pointerup', endHold, true);
    doc?.addEventListener('pointercancel', endHold, true);

    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ name, values, defaultValues }) => {
        if (restoring.current) return;
        if (name !== undefined && skip?.(name)) {
          // Interface state: kept current so the next diff starts from it, but never a step.
          present.current = cloneValues(values);
          return;
        }
        const previous = present.current;
        const defaultsChanged =
          defaultsSeen.current !== undefined && defaultsSeen.current !== defaultValues;
        defaultsSeen.current = defaultValues;
        if (name === undefined || defaultsChanged) {
          // The form started itself over: its old steps no longer lead anywhere. A save is
          // the exception: it moves the baseline to what is on screen and leaves the values
          // alone, so the steps still lead back to the values before it (Undo then marks the
          // form changed against the new baseline, and the next save sends them).
          if (!sameValues(previous, values)) {
            commit({ type: 'cleared' });
            sealed.current = true;
          }
          present.current = cloneValues(values);
          return;
        }
        if (sameValues(previous, values)) return;
        const before = cloneValues(get(previous, name));
        const after = cloneValues(get(values, name));
        present.current = cloneValues(values);
        if (sameValues(before, after)) return;

        const newest = lastOf(stateRef.current.past);
        const now = Date.now();
        const typing =
          typedInto.current === name && typeof before === 'string' && typeof after === 'string';
        const merge = decideMerge({
          newest,
          name,
          typing,
          now,
          pauseMs,
          sameTick: tickOpen.current,
          held: holding.current && holdRecorded.current,
          sealed: sealed.current || blurs.current !== stepBlurs.current,
        });
        const diff = { name, before, after };
        if (merge === 'new') {
          commit({ type: 'recorded', step: { diffs: [diff], at: now, typing }, limit });
        } else {
          commit({ type: 'extended', diffs: [diff], at: now });
        }
        sealed.current = false;
        stepBlurs.current = blurs.current;
        // A change that lands on `click`, after `pointerup`, finds no hold here
        // and so starts its own step, as a checkbox or a button should.
        if (holding.current) holdRecorded.current = true;
        tickOpen.current = true;
        if (!tickScheduled.current) {
          tickScheduled.current = true;
          // Anything the action goes on to set in this same turn joins its step.
          queueMicrotask(() => {
            tickScheduled.current = false;
            tickOpen.current = false;
          });
        }
      },
    });
    return () => {
      unsubscribe();
      for (const type of ACTION_EVENTS) element?.removeEventListener(type, noticeEdit, true);
      element?.removeEventListener('focusout', noticeBlur, true);
      doc?.removeEventListener('pointerup', endHold, true);
      doc?.removeEventListener('pointercancel', endHold, true);
      endHold();
    };
  }, [subscribe, getValues, root, commit, pauseMs, limit, skip]);

  /** Writes a step's values back, `before` newest-first for an undo, `after` oldest-first for a redo. */
  const restore = useCallback(
    (step: HistoryStep, direction: 'undo' | 'redo') => {
      const diffs = direction === 'undo' ? step.diffs.slice().reverse() : step.diffs;
      restoring.current = true;
      try {
        for (const diff of diffs) {
          // Validated only once a submit has shown errors: before one the form is quiet.
          setValue(
            diff.name as never,
            cloneValues(direction === 'undo' ? diff.before : diff.after) as never,
            {
              shouldDirty: true,
              shouldValidate: isSubmitted,
            },
          );
        }
      } finally {
        restoring.current = false;
      }
      present.current = cloneValues(getValues());
      sealed.current = true;
      const focusOn = onRestored?.(
        step.diffs.map((diff) => diff.name),
        step.diffs,
        direction,
      );
      pendingFocus.current = [focusOn || step.diffs[0].name];
    },
    [setValue, getValues, isSubmitted, onRestored],
  );

  const undo = useCallback(() => {
    if (!enabled) return;
    const step = lastOf(stateRef.current.past);
    if (!step) {
      announce('Nothing to undo');
      return;
    }
    const element = root.current;
    const label = element ? labelOf(element, step.diffs[0].name) : 'the form';
    restore(step, 'undo');
    commit({ type: 'undone' });
    announce(`Undid change to ${label}`);
  }, [enabled, root, restore, commit, announce]);

  const redo = useCallback(() => {
    if (!enabled) return;
    const step = lastOf(stateRef.current.future);
    if (!step) {
      announce('Nothing to redo');
      return;
    }
    const element = root.current;
    const label = element ? labelOf(element, step.diffs[0].name) : 'the form';
    restore(step, 'redo');
    commit({ type: 'redone' });
    announce(`Redid change to ${label}`);
  }, [enabled, root, restore, commit, announce]);

  const clear = useCallback(() => {
    commit({ type: 'cleared' });
    present.current = cloneValues(getValues());
    sealed.current = true;
  }, [commit, getValues]);

  // Focus follows the undo, once the render it caused has drawn: a section
  // `onRestored` opened is open by now, and the buttons are enabled or not as
  // they will stay.
  useLayoutEffect(() => {
    const names = pendingFocus.current;
    const element = root.current;
    if (!names || !element) return;
    pendingFocus.current = null;
    const [name] = names;
    const doc = element.ownerDocument;
    const own = fieldNamed(element, name);
    let target: HTMLElement | undefined | null = isFocusable(own) ? own : undefined;
    if (!target) {
      // A control with no `name` attribute — a select's box — is still known
      // to the form by the ref it registered. `setFocus` reads the same ref
      // but focuses it on a timer, too late for the fallback below.
      const registered = (get(control._fields, name) as { _f?: { ref?: unknown } } | undefined)?._f
        ?.ref as { focus?: () => void } | undefined;
      registered?.focus?.();
      const now = doc.activeElement as HTMLElement | null;
      if (registered?.focus && now && now !== doc.body && element.contains(now)) target = now;
    }
    if (!target) {
      const list = fieldsUnder(element, name);
      target = list.find(isFocusable);
      const fieldset = (list[0] ?? null)?.closest('fieldset');
      if (!target && fieldset) {
        fieldset.tabIndex = -1;
        target = fieldset;
      }
    }
    target?.focus();
    if (!target || doc.activeElement !== target) {
      // Nothing to land on: a button that is enabled as it will stay, never the page.
      const { past, future } = stateRef.current;
      const buttons = [
        past.length > 0 ? undoButton.current : null,
        future.length > 0 ? redoButton.current : null,
      ];
      buttons.find((button) => button)?.focus();
    }
  });

  // The chords, heard by native listeners on the document rather than a React
  // `onKeyDown` prop on the form: a key handler on a non-interactive element
  // is what the a11y lint refuses. Bubble phase, so an inner element's own
  // native listener runs first.
  //
  // Why the document and not the form: after a click on a blank part of a
  // dialog, focus sits on the page itself, outside the form, and a listener on
  // the form never hears the key. So a chord is accepted when this form owns
  // its target, or when the target is outside every form and this form was the
  // last to hold focus (`held`, a ref so a re-registered listener keeps it,
  // kept by a `focusin` listener).
  //
  // Owning is exclusive, so a chord can never undo twice: each root carries a
  // `data-form-history` mark, and an element belongs only to the hook whose
  // root is its nearest marked ancestor, so a nested form (a panel) takes its
  // own chords and the form around it never hears them, whether or not it
  // passes `ignore`. The form's own Undo and Redo buttons sit outside the
  // root, so they count as owned too. `ignore` keeps its job: a target the
  // form owns but does not govern is left alone.
  //
  // Ordering: React dispatches its synthetic handlers from the root container,
  // so these listeners run BEFORE any React `onKeyDown` inside the form
  // (Downshift's, a panel's). That is why the target checks read the DOM
  // (`aria-expanded`) and do not wait for an inner React handler to set
  // `defaultPrevented`.
  //
  // The current `enabled`, `ignore`, `undo` and `redo` are effect
  // dependencies, so the listeners are registered again when one changes and
  // never see a stale one.
  const held = useRef(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.dataset.formHistory = '';
    return () => {
      delete element.dataset.formHistory;
    };
  }, [root]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const doc = element.ownerDocument;
    const owns = (target: HTMLElement) =>
      target.closest('[data-form-history]') === element ||
      target === undoButton.current ||
      target === redoButton.current;
    if (doc.activeElement instanceof HTMLElement) {
      held.current ||= owns(doc.activeElement) && !ignore?.(doc.activeElement);
    }
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      // Focus on an element around the form — the dialog itself, after a click
      // on its blank space — is focus on nothing in particular, and keeps the
      // claim; focus on anything else outside gives it up.
      if (target.contains(element) && !owns(target)) return;
      held.current = owns(target) && !ignore?.(target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.isComposing || event.altKey) return;
      const target = event.target as HTMLElement;
      const inside = owns(target);
      if (!inside && !(held.current && !target.closest('[data-form-history]'))) return;
      // A text box that is a combobox owns its keys only while a person is
      // arrowing through its list: Downshift sets a non-empty
      // `aria-activedescendant` on the input while an option is highlighted,
      // and an empty one otherwise. An open list with nothing highlighted (a
      // click into the box opens it) lets the chord through. A select's toggle
      // is a combobox but not a text box, and never owns Ctrl+Z: it highlights
      // an item the moment it opens. Anything inside the listbox itself is
      // still left alone.
      if (target.closest('[role="listbox"]')) return;
      const box = target.closest('[role="combobox"][aria-expanded="true"]');
      if (
        box?.getAttribute('aria-activedescendant') &&
        (box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      if (inside && ignore?.(target)) return;
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;
      if (key === 'z' && mod) {
        // Even with nothing to undo: the browser's own stack for the box
        // under focus is stale, and must not revert it behind the form's back.
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y' && event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        redo();
      }
    };
    doc.addEventListener('focusin', onFocusIn);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('keydown', onKeyDown);
    };
  }, [root, enabled, ignore, undo, redo]);

  // A live region speaks only a change, so a repeat alternates a no-break space.
  const announcement = spoken.text && spoken.count % 2 === 0 ? `${spoken.text}\u00a0` : spoken.text;

  return useMemo(
    () => ({
      undo,
      redo,
      canUndo: enabled && state.past.length > 0,
      canRedo: enabled && state.future.length > 0,
      clear,
      announcement,
      undoButton,
      redoButton,
    }),
    [undo, redo, enabled, state, clear, announcement],
  );
}
