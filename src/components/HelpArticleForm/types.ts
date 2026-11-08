export type HelpFormKind = 'faq' | 'article' | 'term';
export type HelpFormAudience = 'public' | 'staff' | 'keeper';

/** The row a keeper edits, as the form opens it. */
export interface HelpArticleFormValue {
  id: string;
  kind: HelpFormKind;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  audience: HelpFormAudience;
  parentId: string | null;
  position: number | null;
}

/** A live top-level article a row can nest under. */
export interface HelpParentChoice {
  id: string;
  title: string;
  /** The parent's address segment, which a child's address begins with. */
  slug: string;
  audience: HelpFormAudience;
}

export interface HelpArticleFormProps {
  /** The row being edited; left out for a new one. */
  article?: HelpArticleFormValue;
  parents: readonly HelpParentChoice[];
  onDone: () => void;
}

/** What the fields hold: the parent is `''` for none, and the position is the text typed. */
export interface HelpFormValues {
  kind: HelpFormKind;
  title: string;
  summary: string;
  body: string;
  audience: HelpFormAudience;
  parentId: string;
  position: string;
}
