import type { DocumentMailingOverview } from '@/modules/documents';

export interface DocumentMailingPanelProps {
  /** The document's id, sent with the mailing. */
  documentId: string;
  /** The document's key: `terms` makes the mail say each account will be asked to agree. */
  documentKey: string;
  /** The document's title, as its public page shows it. */
  title: string;
  /** The published version, whom a mailing would reach, and the mailings that matter. */
  overview: DocumentMailingOverview;
}
