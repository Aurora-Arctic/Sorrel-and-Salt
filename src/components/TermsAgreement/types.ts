import type { AgreementDocumentKey, AgreementVersion } from '../../lib/types';

export interface TermsAgreementProps {
  version: AgreementVersion;
  /** Documents changed since the account last agreed; all three for an account that never agreed. */
  changed: readonly AgreementDocumentKey[];
  /** When the text last changed, as an ISO day (`YYYY-MM-DD`). */
  updatedOn: string;
  /** Already run through safeReturnPath. */
  destination: string;
}
