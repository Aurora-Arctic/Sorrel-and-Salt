export interface ReportThisProps {
  code: number;
  /** The error page's digest, sent with the request so it can be matched to the server log. */
  reference?: string;
}
