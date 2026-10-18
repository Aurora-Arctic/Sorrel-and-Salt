export type PageNavEntry = {
  /** A fragment link to a section's id, `#account-name`. */
  href: `#${string}`;
  label: string;
  /**
   * The heading of a run of entries: consecutive entries naming the same
   * group are drawn as one nested list beneath it, a label rather than a
   * link. Left out, the entry stands at the top level.
   */
  group?: string;
  /**
   * A top-level entry set apart from the ones above it: the size of a
   * group's entries and the clear break a group label takes, for a closing
   * entry such as an ingredient's References.
   */
  apart?: boolean;
};

export type PageNavProps = {
  /** The landmark's accessible name, "On this page". */
  label: string;
  entries: PageNavEntry[];
};

/** What the menu draws: a top-level entry, or a run of consecutive entries sharing a group. */
export type PageNavItem =
  | { kind: 'entry'; entry: PageNavEntry }
  | { kind: 'group'; label: string; entries: PageNavEntry[] };
