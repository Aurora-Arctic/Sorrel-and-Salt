import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

// A control's click feedback (claude-docs/components/click-feedback.md) as each adopting control's
// tests check it: a refusal in an alert under the control, the focus left on the control, and a badge
// that brings the alert back once dismissed; a success said in the page's status region.

const settle = (step: () => unknown) =>
  act(async () => {
    step();
  });

/**
 * Waits for the refusal's alert, then checks the focus is on `control` and
 * that its badge, named for `name`, brings the alert back after Dismiss.
 * Returns the alert's text, so a caller can check what it carries.
 */
export async function expectRefusalUnder(control: HTMLElement, name: string): Promise<string> {
  const alert = await screen.findByRole('alert');
  const said = alert.textContent ?? '';
  expect(said.trim()).not.toBe('');
  // The callout follows the control in the document, and the control is
  // described by the failure.
  expect(control.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

/** What the page's status region says now, or '' when it says nothing. */
export function announced(): string {
  const region = screen.getAllByRole('status').find((element) => element.tagName === 'OUTPUT');
  return region?.textContent?.trim() ?? '';
}
