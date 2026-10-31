export interface SupportListPageProps {
  // A promise, awaited before use. `after` and `before` are the pager's cursors.
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}
