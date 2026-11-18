import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import { expectBefore } from './interact';

// A control's click feedback checks (claude-docs/components/click-feedback.md).

const settle = (step: () => unknown) =>
  act(async () => {
    step();
  });

export async function expectRefusalUnder(control: HTMLElement, name: string): Promise<string> {
  const alert = await screen.findByRole('alert');
  const said = alert.textContent ?? '';
  expect(said.trim()).not.toBe('');
  expectBefore(control, alert);
  expect(control).toHaveAttribute('aria-describedby');
  await waitFor(() => expect(control).toHaveFocus());

  await settle(() => fireEvent.click(screen.getByRole('button', { name: 'Dismiss' })));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(control).toHaveFocus();

  const badge = screen.getByRole('button', { name: `Show the error for ${name}` });
  await settle(() => badge.focus());
  await settle(() => fireEvent.click(badge));
  expect(screen.getByRole('alert')).toHaveTextContent(said.trim());
  return said;
}

export function announced(): string {
  const region = screen.getAllByRole('status').find((element) => element.tagName === 'OUTPUT');
  return region?.textContent?.trim() ?? '';
}

/** The status regions on the page now, so a check made later can ask what one already there says. */
export const statusRegionsNow = (): HTMLElement[] => screen.queryAllByRole('status');

/** Waits for `text` in a status region that was on the page before it: a screen reader reads out only a region it already knew. */
export async function expectSaidInRegionFrom(before: HTMLElement[], text: string | RegExp) {
  // The precondition: a region was there to be listened to.
  expect(before.length).toBeGreaterThan(0);
  const says = (region: HTMLElement) => {
    const said = region.textContent ?? '';
    return region.isConnected && (typeof text === 'string' ? said.includes(text) : text.test(said));
  };
  await waitFor(() => expect(before.some(says)).toBe(true));
}
