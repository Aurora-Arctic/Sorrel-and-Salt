import type { ReactNode, RefObject } from 'react';

/** Where a confirmed action is: offering itself, asking to confirm, or waiting on the answer. */
export type ConfirmStep = 'idle' | 'confirming' | 'sending';

/**
 * An action that asks first, in a modal: what its button and the modal say,
 * and the write it sends. The creation and role controls, Impersonate, the
 * pause switch and the invitations' Revoke each build one.
 */
export interface ConfirmedActionProps {
  /** The row's button and the modal's confirm, one word or two. */
  label: string;
  /** The row's button's accessible name, opening with `label`. */
  accessibleName: string;
  /** The modal's confirm, when it says something other than the row's button does. */
  confirmLabel?: string;
  openClass: string;
  /** The row's button is off, for a form whose answer is not yet complete. */
  disabled?: boolean;
  /** The modal's confirm is off, for a choice inside the modal whose answer is not yet complete. */
  confirmDisabled?: boolean;
  /** The modal's heading, in title case. */
  title: string;
  /** The modal's question, the user's name in bold. */
  question: ReactNode;
  /** A warning under the question, which the confirm is described by; none when absent. */
  warning?: string;
  /** The confirm's label while the write is out. */
  busy: string;
  confirmClass: string;
  /** Whether the modal offers an optional reason, sent with the write. */
  withNote?: boolean;
  /** The write; `note` is the reason as typed, trimmed, or absent. A refusal rejects. */
  send: (note?: string) => Promise<unknown>;
  /** What follows a success, the confirm still busy; absent, the page is read again. */
  onSent?: () => void;
  /**
   * The sentence a refusal shows; absent, the service's own, read from the
   * GraphQL error.
   */
  refusal?: string | ((error: unknown) => string);
  /**
   * Said in the page's status region after a success, for a screen reader:
   * the result the page then shows, in words. Absent for a control whose
   * success leaves the page, which says it by arriving.
   */
  announcement?: string;
  /** A choice the modal asks beside the question, such as a role to move to; the caller holds its state. */
  choices?: ReactNode | ((sending: boolean) => ReactNode);
  /** Close the modal on success, for a control the re-read does not replace. */
  closeOnSent?: boolean;
  /**
   * Drawn inside the user's modal: asks through its confirm layer and says a refusal in a plain notice, unless `refusalInModal` says otherwise
   * (claude-docs/components/user-list.md, "Inside a modal").
   */
  inModal?: boolean;
  /**
   * How a refusal is said inside a modal: a plain notice (default), or the callout under the control; outside a modal it is always the callout
   * (claude-docs/components/user-list.md, "Inside a modal").
   */
  refusalInModal?: 'notice' | 'callout';
}

/** `ConfirmedAction`'s confirm and Cancel, under its question. */
export interface ConfirmAnswersProps {
  label: string;
  busy: string;
  confirmClass: string;
  /** The warning's id, which the confirm is described by; none without one. */
  describedBy?: string;
  sending: boolean;
  /** The confirm is off though nothing is being sent. */
  disabled?: boolean;
  confirmRef: RefObject<HTMLButtonElement | null>;
  cancelRef: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}
