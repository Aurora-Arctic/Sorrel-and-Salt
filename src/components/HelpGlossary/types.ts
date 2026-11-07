export interface HelpTerm {
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
}

export interface HelpGlossaryProps {
  terms: HelpTerm[];
}
