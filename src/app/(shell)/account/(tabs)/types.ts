export interface AccountPageProps {
  // `after` and `before` are the Invitations section's pager cursors.
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
  }>;
}
