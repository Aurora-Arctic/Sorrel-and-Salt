export interface SupportListPageProps {
  // A promise, awaited before use. `after` and `before` are the pager's cursors; `request` is the id of the
  // request whose dialog is open.
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
    request?: string | string[];
  }>;
}
