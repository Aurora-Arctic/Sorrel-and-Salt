import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

/** A failed Save took the focus to the error summary, which links to `control`. */
export function expectSummaryLinksTo(control: HTMLElement): void {
  const summary = screen.getByRole('group', { name: /problem/i });
  expect(summary).toHaveFocus();
  const hrefs = within(summary)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));
  expect(hrefs).toContain(`#${control.id}`);
}

/** A refused submit took the focus to the invalid `control` itself, or to an error summary that links to it. */
export function expectFocusOnError(control: HTMLElement): void {
  expect(control).toHaveAttribute('aria-invalid', 'true');
  if (control.matches(':focus')) return;
  expectSummaryLinksTo(control);
}
