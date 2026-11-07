export interface HelpTermProps {
  /** The term's glossary anchor. */
  slug: string;
  title: string;
  /** The term's body as plain text. */
  definition: string;
  /** The text the mark shows, which is the term's title unless the mark gave other text. */
  shown: string;
}
