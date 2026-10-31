import type { SupportKind } from '@/modules/support';

/** The kinds a sender may choose, in the order offered. */
export type { SupportKind };

export interface SupportFormProps {
  /** The kind chosen when the form opens; accessibility, the first on offer, when left out. */
  kind?: SupportKind;
  /** The HTTP status of the error page the sender came from, stored with the request. */
  errorCode?: number;
  /** The page the request is about, stored with the request. */
  path: string;
  /** Closes the dialog the form sits in; left out on a page, where the form has no Cancel. */
  onDone?: () => void;
}
