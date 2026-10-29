'use client';

import { type ReactElement, useSyncExternalStore } from 'react';
import { SwitchField } from '../Field/switch-field';

// The pre-paint script in src/app/pre-paint-scripts.tsx reads this key inline; keep in sync.
export const STORAGE_KEY = 'card-density';
const ATTRIBUTE = 'data-card-density';

// <html> is the one record of the choice, so every switch and the CSS read the same thing. A
// MutationObserver catches outside writers but reports a tick late, so this component's own write also
// notifies directly, keeping the redraw inside the click.
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(onChange);
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTE] });
  return () => {
    listeners.delete(onChange);
    observer?.disconnect();
  };
};

// Compact unless the page says regular, as the CSS reads it.
const getSnapshot = (): boolean => document.documentElement.getAttribute(ATTRIBUTE) !== 'regular';

// The server cannot know the stored choice, and renders what the CSS shows with nothing stored.
const getServerSnapshot = (): boolean => true;

/**
 * The Compact switch for a list of ingredient cards: on by default, remembered on this computer. It sets
 * `data-card-density="regular"` on `<html>` while off. Blocked storage costs the memory, not the change
 * (claude-docs/components/card-density-switch.md).
 */
export default function CardDensitySwitch(): ReactElement {
  const compact = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const change = (next: boolean): void => {
    if (next) document.documentElement.removeAttribute(ATTRIBUTE);
    else document.documentElement.setAttribute(ATTRIBUTE, 'regular');
    for (const listener of listeners) listener();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'compact' : 'regular');
    } catch {
      // storage blocked: the choice holds for this page view and is not remembered
    }
  };

  // An empty name keeps it out of any form it sits in: it is a view setting, not a filter.
  return <SwitchField label="Compact" name="" value="" checked={compact} onChange={change} />;
}
