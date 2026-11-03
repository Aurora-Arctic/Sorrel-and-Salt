export interface DocumentEditorProps {
  /** The document's id, sent with each save and publish. */
  documentId: string;
  /** The document's key: `terms` makes a publish ask every account to agree again. */
  documentKey: string;
  /** The document's title, as its public page shows it. */
  title: string;
  /** The sentence under the title. */
  lede: string;
  /** The text the editor opens on: the open draft's, else the published version's. */
  body: string;
  /** The latest published version's text, or empty when nothing is published: what Restore Published Version shows. */
  publishedBody: string;
  /** The open draft's revision, or null when there is no draft yet. */
  revision: number | null;
  /** The version a publish would make, shown beside the title. */
  nextNumber: number;
}
