interface HelpTerm {
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
}

export interface HelpGlossaryProps {
  terms: HelpTerm[];
  /** Edit Glossary at the end of the title row: a verified keeper's alone (`helpViewerOffers`). */
  editHref?: string;
}
