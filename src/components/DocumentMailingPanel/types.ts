import type { DocumentMailingOverview } from '@/modules/documents';

export interface DocumentMailingPanelProps {
  overview: DocumentMailingOverview;
}

export interface MailingProgressProps {
  mailing: DocumentMailingOverview['open'][number];
}
