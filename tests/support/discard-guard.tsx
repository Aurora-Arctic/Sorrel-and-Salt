import { fireEvent, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { expect, type Mock, vi } from 'vitest';
import Modal from '@/components/Modal';
import { renderWithQuery } from './render-with-query';

// Each keeper form's unsaved-changes wiring, asserted through the modal (claude-docs/components/modal.md, "Unsaved changes").

export function renderInModal(
  form: (done: () => void) => ReactNode,
  { strict = false }: { strict?: boolean } = {},
): Mock {
  const onClose = vi.fn();
  const tree = (
    <Modal title="Edit" onClose={onClose}>
      {form}
    </Modal>
  );
  // `strict`: React's development double mount, as `next dev` runs it,
  // which re-checks a form's changes as it mounts again.
  renderWithQuery(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return onClose;
}

const button = (name: string) => screen.getByRole('button', { name });
const asking = () => screen.queryByRole('button', { name: 'Discard Changes' });

export function expectGuardedWaysOut(
  onClose: Mock,
  change: () => void,
  { cancel = () => button('Cancel'), kept }: { cancel?: () => HTMLElement; kept?: () => void } = {},
): void {
  change();

  fireEvent.click(cancel());
  expect(asking()).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(button('Keep Editing'));
  kept?.();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(asking()).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(button('Discard Changes'));
  expect(onClose).toHaveBeenCalledTimes(1);
}

export function expectAskingOver(field: HTMLElement, safe: HTMLElement): HTMLElement {
  const question = screen
    .getAllByRole('group')
    .filter((group) => group.contains(safe))
    .pop();
  expect(question).toHaveAccessibleName();
  expect(question).not.toContainElement(field);
  expect(field.closest('[inert]')).not.toBeNull();
  expect(safe.closest('[inert]')).toBeNull();
  expect(screen.getByRole('button', { name: 'Close' }).closest('[inert]')).toBeNull();
  expect(safe).toHaveFocus();
  return question as HTMLElement;
}

// The question's own button, where the inert form behind it has one of the same name.
export function answer(name: string): HTMLElement {
  const live = screen
    .getAllByRole('button', { name })
    .filter((button) => button.closest('[inert]') === null);
  expect(live).toHaveLength(1);
  return live[0] as HTMLElement;
}

export function expectAnswered(field: HTMLElement, question: HTMLElement): void {
  expect(question).not.toBeInTheDocument();
  expect(field.closest('[inert]')).toBeNull();
}
