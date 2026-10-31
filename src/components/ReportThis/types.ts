export interface ReportThisProps {
  /** The HTTP status of the error page it sits on. */
  code: number;
  /** Whether the Support dialog is in the page, so the link can open it in place. */
  inShell?: boolean;
}
