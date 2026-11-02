import type { SupportAboutParam } from '../../lib/support-path';

export interface SignedOutSupportFormProps {
  /** The topic chosen already; ignored when it is not one open without an account. */
  about?: SupportAboutParam;
  /** The page the visitor came from, stored with the request. */
  path: string;
}
