import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { expect, type Mock, vi } from 'vitest';
import Modal from '@/components/Modal';
import { makeQueryClient } from '@/lib/graphql-client';

// The guard over an admin form's unsaved changes: its shape is tests/components/Modal's, on a form of
// that test's own; each admin form's test asserts its wiring through this, the form in a modal as its
// page puts it, its close the modal's own (claude-docs/components/modal.md, "Unsaved changes").

/**
 * Renders the form in a modal, handed the modal's own close as its page's dialog hands it; answers the
 * modal's `onClose`. `strict` renders it under React's development double mount.
 */
export function renderInModal(
  form: (done: () => void) => ReactNode,
  { strict = false }: { strict?: boolean } = {},
): Mock {
  const onClose = vi.fn();
  const tree = (
    <QueryClientProvider client={makeQueryClient()}>
      <Modal title="Edit" onClose={onClose}>
        {form}
      </Modal>
    </QueryClientProvider>
  );
  // `strict`: React's development double mount, as `next dev` runs it,
  // which re-checks a form's changes as it mounts again.
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return onClose;
}

const button = (name: string) => screen.getByRole('button', { name });
const asking = () => screen.queryByRole('button', { name: 'Discard Changes' });

/**
 * After `change`, the form's Cancel and the modal's Escape each ask rather than close, and Discard Changes
 * closes. `cancel` finds the form's Cancel where a panel open in it has its own; `kept` asserts what Keep Editing kept.
 */
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

/**
 * A question over a form: the form inert, the question and the modal's Close live, and the focus on the safe
 * answer. Returns the question.
 */
export function expectAskingOver(field: HTMLElement, safe: HTMLElement): HTMLElement {
  // The innermost group holding it: the question's own.
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

/**
 * The live button named `name`: the question's own answer, where the inert form behind it has a button
 * of the same name (a confirm's Cancel over the form's Cancel).
 */
export function answer(name: string): HTMLElement {
  const live = screen
    .getAllByRole('button', { name })
    .filter((button) => button.closest('[inert]') === null);
  expect(live).toHaveLength(1);
  return live[0] as HTMLElement;
}

/** The question answered: the question `expectAskingOver` returned gone, and the form live again. */
export function expectAnswered(field: HTMLElement, question: HTMLElement): void {
  expect(question).not.toBeInTheDocument();
  expect(field.closest('[inert]')).toBeNull();
}
