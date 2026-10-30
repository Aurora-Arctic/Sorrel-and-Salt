export interface AccountPageProps {
  // `params` is a promise and is awaited. `provider` is the one a failed link was for, which
  // SignInMethods' Add puts on the error callback so the sentence lands in that provider's row.
  // `after` and `before` are the Invitations section's pager cursors.
  searchParams: Promise<{
    error?: string | string[];
    provider?: string | string[];
    after?: string | string[];
    before?: string | string[];
  }>;
}
