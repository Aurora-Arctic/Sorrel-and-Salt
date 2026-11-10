import type { SupportAbout } from '@/modules/support';

export type { SupportAbout };

export interface SupportFormProps {
  about?: SupportAbout;
  errorCode?: number;
  errorReference?: string;
  path: string;
  /** Closes the dialog the form sits in; left out on a page, where the form has no Cancel. */
  onDone?: () => void;
}
