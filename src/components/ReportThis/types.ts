export interface ReportThisProps {
  /** The HTTP status of the error page it sits on. */
  code: number;
  /** The error page's digest, sent with the request so it can be matched to the server log. */
  reference?: string;
  /** Whether the Support dialog is in the page, so the link can open it in place. */
  inShell?: boolean;
}
