import type { SupportAbout } from '@/modules/support';

export type { SupportAbout };

export interface SupportFormProps {
  about?: SupportAbout;
  errorCode?: number;
  errorReference?: string;
  /** The error's name and message, shown to the sender read-only and sent with the request. */
  errorDetail?: string;
  path: string;
  /** Closes the dialog the form sits in; left out on a page, where the form has no Cancel. */
  onDone?: () => void;
}

export interface ErrorDetailsProps {
  detail: string;
}
