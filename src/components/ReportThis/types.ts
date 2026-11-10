export interface ReportThisProps {
  code: number;
  /** The error page's digest, or the reference the browser made, sent so the report can be matched to the error. */
  reference?: string;
  /** The error's name and message, which the bug form shows the sender. */
  detail?: string;
}
