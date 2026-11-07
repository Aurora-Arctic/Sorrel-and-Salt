export type PageNavEntry = {
  href: `#${string}`;
  label: string;
  /**
   * The heading of a run of entries: consecutive entries naming the same
   * group are drawn as one nested list beneath it, a label rather than a
   * link. Left out, the entry stands at the top level.
   */
  group?: string;
  apart?: boolean;
  /**
   * Drawn only below a tablet's width, where the section it names stands under the text and
   * not beside it: from a tablet up the entry is hidden (and never marked current).
   */
  narrowOnly?: boolean;
};

export type PageNavProps = {
  label: string;
  entries: PageNavEntry[];
  /**
   * On a phone the menu folds behind its label, closed until opened, so a long menu does not push
   * the text down; from a tablet up it stands open with no toggle. Native `<details>`, so it
   * opens without the script.
   */
  collapsible?: boolean;
};

export type PageNavItem =
  | { kind: 'entry'; entry: PageNavEntry }
  | { kind: 'group'; label: string; entries: PageNavEntry[] };
