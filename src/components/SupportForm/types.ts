import type { SupportAbout } from '@/modules/support';

/** What a request can be about, as a sender chooses it, in the order offered. */
export type { SupportAbout };

export interface SupportFormProps {
  /** What it is about when the form opens; nothing is chosen when left out. */
  about?: SupportAbout;
  /** The HTTP status of the error page the sender came from, stored with the request. */
  errorCode?: number;
  /** The error page's digest, stored with the request so it can be matched to the server log. */
  errorReference?: string;
  /** The page the request is about, stored with the request. */
  path: string;
  /** Closes the dialog the form sits in; left out on a page, where the form has no Cancel. */
  onDone?: () => void;
}
