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
   * Set apart from the entries above it: the clear break a group label takes, with a short
   * rule halfway through it. On a top-level entry it also takes the size of a group's
   * entries, for a closing entry such as an ingredient's References with no sources. A group
   * takes it from its first entry, so the rest of the group's entries need not repeat it.
   */
  apart?: boolean;
};

export type PageNavProps = {
  /** The landmark's accessible name, "On This Page". */
  label: string;
  entries: PageNavEntry[];
};

/** What the menu draws: a top-level entry, or a run of consecutive entries sharing a group. */
export type PageNavItem =
  | { kind: 'entry'; entry: PageNavEntry }
  | { kind: 'group'; label: string; entries: PageNavEntry[] };
