import type { DocumentMailingOverview } from '@/modules/documents';

export interface DocumentMailingPanelProps {
  /** The documents changed since the last email, whom a mailing would reach, and the mailings that matter. */
  overview: DocumentMailingOverview;
}

export interface MailingProgressProps {
  /** The mailing whose progress the bar shows. */
  mailing: DocumentMailingOverview['open'][number];
}
