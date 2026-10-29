import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor as waitForDom,
  within,
} from '@testing-library/react';
import type { ReactElement } from 'react';
import { makeQueryClient } from '@/lib/graphql-client';
import { byLabel } from './interact';

// The ingredient form's test harness: the render, the wait, the controls found by label, and the new
// reference panel's fields. What a person does to any form (`press`, `choose`, `type`) is
// tests/support/interact.tsx's, and the lookups and saves answered are
// tests/support/msw/ingredient-lookups.ts's.

/** Where a near match links in these tests: the form requires one, and none of them follows it. */
export const duplicateHref = ({ id }: { id: string }): string => `/fixture/ingredients/${id}`;

/** Renders `ui` — the form, or a field in a form of its own — under a query client of its own. */
export function renderWithClient(ui: ReactElement) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

/**
 * RTL's waitFor, polled every 5 ms rather than its 50: most waits here are
 * for a mock to have been called — a save sent, a lookup asked — which no DOM
 * mutation announces, so each would otherwise cost a whole tick.
 *
 * It first lets what the test's last step set going settle inside `act`: an
 * open list's position is worked out a microtask later, and an update landing
 * between the step and RTL's wait is outside `act`, which React warns of.
 */
export const waitFor: typeof waitForDom = async (callback, options) => {
  await act(async () => {});
  return waitForDom(callback, { interval: 5, ...options });
};

/** A text box or text area by its label. */
export const textbox = (name: string) => byLabel(name, 'input:not([role]), textarea');
/** A suggesting box — the form field, or a list's — or a closed set's, select-only, by its label. */
export const box = (name: string) => byLabel(name, '[role="combobox"]');
/** Any of the form's fields by its label, whichever kind it is. */
export const control = (name: string) =>
  byLabel(name, 'input:not([role]), textarea, [role="combobox"]');

/**
 * The new reference panel, inside `scope`: the References field's, or the
 * page's when the panel is rendered on its own.
 */
export const referencePanel = (scope: HTMLElement = document.body) =>
  within(scope).getByRole('group', { name: 'New Reference' });
/** A label's text less a required field's asterisk, which is hidden from its name. */
export const labelled = (label: string) => (content: string) =>
  content.replace(/\*$/, '') === label;
/** The panel's field labelled `label`; `scope` as `referencePanel`'s. */
export const inPanel = (label: string, scope?: HTMLElement) =>
  within(referencePanel(scope)).getByLabelText(labelled(label));
/** Opens the panel's Kind box and picks the kind reading `label`; `scope` as `referencePanel`'s. */
export function chooseKind(label: string, scope?: HTMLElement): void {
  fireEvent.click(within(referencePanel(scope)).getByRole('combobox', { name: 'Kind' }));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Kind choices' })).getByRole('option', {
      name: label,
    }),
  );
}
