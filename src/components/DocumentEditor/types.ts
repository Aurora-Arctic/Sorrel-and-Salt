export interface DocumentEditorProps {
  documentId: string;
  documentKey: string;
  title: string;
  lede: string;
  body: string;
  publishedBody: string;
  revision: number | null;
  /** The version a publish would make, shown beside the title. */
  nextNumber: number;
}
