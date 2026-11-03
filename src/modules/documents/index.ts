// The documents module's behaviour surface: the site's own documents (the privacy policy, the disclaimer, the code of ethics, the terms)
// and their versions. Schema tables are reached at `@/modules/documents/schema/*`; the repository holds their finders and writes.
export { listDocumentVersions, readDocument, readDocumentVersion } from './services/documents';
export {
  discardDocumentDraft,
  publishDocumentDraft,
  readDocumentForEditing,
  saveDocumentDraft,
  updateDocument,
} from './services/editing';
export {
  emailDocumentsToEveryAccount,
  readDocumentMailings,
  resumeDocumentMailing,
  startDailyDocumentMailing,
} from './services/document-mailing';
export {
  agreementVersionInForce,
  currentAgreementVersion,
} from '../../lib/current-agreement-version';
export * from './graphql/documents';
export type {
  DocumentKey,
  DocumentMailingNotifier,
  DocumentMailingOverview,
  DocumentMailingSummary,
  PendingDocument,
} from './types';
