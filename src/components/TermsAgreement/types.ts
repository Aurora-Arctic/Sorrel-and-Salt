export interface TermsAgreementProps {
  /** The version in force, shown so a person can tell this agreement from an earlier one. */
  version: number;
  /** When the text last changed, as an ISO day (`2026-11-02`). */
  updatedOn: string;
  /** The page's own `next`, already run through safeReturnPath, or the role's landing when there was none. */
  destination: string;
}
