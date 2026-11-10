import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

// A control's click feedback checks (claude-docs/components/click-feedback.md).

const settle = (step: () => unknown) =>
  act(async () => {
    step();
  });

export async function expectRefusalUnder(control: HTMLElement, name: string): Promise<string> {
  const alert = await screen.findByRole('alert');
  const said = alert.textContent ?? '';
  expect(said.trim()).not.toBe('');
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

export function announced(): string {
  const region = screen.getAllByRole('status').find((element) => element.tagName === 'OUTPUT');
  return region?.textContent?.trim() ?? '';
}
