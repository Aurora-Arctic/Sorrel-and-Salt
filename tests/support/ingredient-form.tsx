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

/** Where a near match links in these tests: the form requires one, and none of them follows it. */
export const duplicateHref = ({ id }: { id: string }): string => `/fixture/ingredients/${id}`;

export function renderWithClient(ui: ReactElement) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

// Polled every 5 ms rather than 50: most waits are for a mock to have been called, which no DOM mutation announces. It first lets the last step settle inside `act`, as an open list's position is worked out a microtask later and an update outside `act` draws a React warning.
export const waitFor: typeof waitForDom = async (callback, options) => {
  await act(async () => {});
  return waitForDom(callback, { interval: 5, ...options });
};

export const textbox = (name: string) => byLabel(name, 'input:not([role]), textarea');
export const box = (name: string) => byLabel(name, '[role="combobox"]');
export const control = (name: string) =>
  byLabel(name, 'input:not([role]), textarea, [role="combobox"]');

export const referencePanel = (scope: HTMLElement = document.body) =>
  within(scope).getByRole('group', { name: 'New Reference' });
/** A label's text less a required field's asterisk, which is hidden from its name. */
export const labelled = (label: string) => (content: string) =>
  content.replace(/\*$/, '') === label;
export const inPanel = (label: string, scope?: HTMLElement) =>
  within(referencePanel(scope)).getByLabelText(labelled(label));
export function chooseKind(label: string, scope?: HTMLElement): void {
  fireEvent.click(within(referencePanel(scope)).getByRole('combobox', { name: 'Kind' }));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Kind choices' })).getByRole('option', {
      name: label,
    }),
  );
}
