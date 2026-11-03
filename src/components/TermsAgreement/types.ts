import type { AgreementVersion } from '../../lib/types';

export interface TermsAgreementProps {
  /** The versions in force, shown as the joint version so a person can tell this agreement from an earlier one. */
  version: AgreementVersion;
  /** When the text last changed, as an ISO day (`2026-11-02`). */
  updatedOn: string;
  /** The page's own `next`, already run through safeReturnPath, or the role's landing when there was none. */
  destination: string;
}
