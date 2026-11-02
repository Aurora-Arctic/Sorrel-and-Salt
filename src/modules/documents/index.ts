// The documents module's behaviour surface: the site's own documents (the privacy policy, the disclaimer, the code of ethics, the terms)
// and their versions. Schema tables are reached at `@/modules/documents/schema/*`; the repository holds their finders and writes.
export { listDocumentVersions, readDocument, readDocumentVersion } from './services/documents';
export {
  publishDocumentDraft,
  readDocumentForEditing,
  saveDocumentDraft,
  updateDocument,
} from './services/editing';
export { currentTermsVersion } from '../../lib/current-terms-version';
export * from './graphql/documents';
export type {
  DocumentDraft,
  DocumentForEditing,
  DocumentKey,
  DocumentVersionSummary,
  PublishedDocument,
  PublishedDocumentVersion,
} from './types';
