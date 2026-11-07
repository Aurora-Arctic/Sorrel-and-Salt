export interface DocumentEditorProps {
  documentId: string;
  /** The document's key: `terms` makes a publish ask every account to agree again. */
  documentKey: string;
  title: string;
  lede: string;
  body: string;
  publishedBody: string;
  revision: number | null;
  /** The version a publish would make, shown beside the title. */
  nextNumber: number;
}
