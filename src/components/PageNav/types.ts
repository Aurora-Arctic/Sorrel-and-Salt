export type PageNavEntry = {
  /** A fragment link to a section's id, `#account-name`. */
  href: `#${string}`;
  label: string;
};

export type PageNavProps = {
  /** The landmark's accessible name, "On this page". */
  label: string;
  entries: PageNavEntry[];
};
