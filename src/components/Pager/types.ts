export interface PagerProps {
  /** The page before this one; Prev is disabled without it. */
  previousHref?: string;
  /** The page after this one; Next is disabled without it. */
  nextHref?: string;
  /**
   * A soft navigation through `next/link`, for a list whose page guards
   * itself on every render; a plain anchor's full load otherwise, which runs
   * a layout's guard again too.
   */
  soft?: boolean;
  /** Where the page stands, shown between the ends as "Page 2 of 3"; none when the list is not counted. */
  position?: { page: number; pages: number };
}

/** An end of the pager: its label, its mark and the side the mark sits on. */
export interface PagerEndProps {
  href?: string;
  soft: boolean;
  label: 'Prev' | 'Next';
}

/** An end that leads somewhere: its page, and its label. */
export interface PagerLinkProps {
  href: string;
  label: 'Prev' | 'Next';
}

/** What an end shows: its label, and its chevron or, while `busy`, the spinner in its place. */
export interface PagerEndContentProps {
  label: 'Prev' | 'Next';
  busy?: boolean;
}
