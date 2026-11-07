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
  /**
   * Drawn only below a tablet's width, where the section it names stands under the text and
   * not beside it: from a tablet up the entry is hidden (and never marked current).
   */
  narrowOnly?: boolean;
};

export type PageNavProps = {
  /** The landmark's accessible name, "On This Page". */
  label: string;
  entries: PageNavEntry[];
  /**
   * On a phone the menu folds behind its label, closed until opened, so a long menu does not push
   * the text down; from a tablet up it stands open with no toggle. Native `<details>`, so it
   * opens without the script.
   */
  collapsible?: boolean;
  /** A skeleton's menu: draws bars in place of the entries, at the menu's own width and padding. */
  pending?: boolean;
};

/** What the menu draws: a top-level entry, or a run of consecutive entries sharing a group. */
export type PageNavItem =
  | { kind: 'entry'; entry: PageNavEntry }
  | { kind: 'group'; label: string; entries: PageNavEntry[] };
