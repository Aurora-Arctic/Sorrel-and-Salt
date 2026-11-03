import type { AgreementDocumentKey, AgreementVersion } from '../../lib/types';

export interface TermsAgreementProps {
  /** The versions in force, shown as the joint version so a person can tell this agreement from an earlier one. */
  version: AgreementVersion;
  /** The documents whose version in force is not the one the account last agreed to, in the joint version's order: all three for an account that never agreed. */
  changed: readonly AgreementDocumentKey[];
  /** When the text last changed, as an ISO day (`2026-11-02`). */
  updatedOn: string;
  /** The page's own `next`, already run through safeReturnPath, or the role's landing when there was none. */
  destination: string;
}
