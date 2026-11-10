import type { SupportAboutParam } from '../../lib/support-path';

export interface SignedOutSupportFormProps {
  /** The topic chosen already; ignored when it is not one open without an account. */
  about?: SupportAboutParam;
  /** The error screen's reference, sent with the request. */
  errorReference?: string;
  /** The error's name and message, shown read-only and sent with the request. */
  errorDetail?: string;
  path: string;
}
