import type { ReactNode } from 'react';

export interface ModalProps {
  /** The dialog's heading, and so its accessible name. */
  title: string;
  /**
   * Asked for by the Close button and by Escape. The owner closes the modal
   * by unmounting it — a URL-driven one by navigating away from its address.
   */
  onClose: () => void;
  children: ReactNode;
}
