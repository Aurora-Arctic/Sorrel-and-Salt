export interface AccountPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use. `provider` is
  // the one a failed link was for, which SignInMethods' Add puts on the
  // error callback so the sentence lands in that provider's row. `after` and
  // `before` are the Invitations section's pager cursors (M10.32).
  searchParams: Promise<{
    error?: string | string[];
    provider?: string | string[];
    after?: string | string[];
    before?: string | string[];
  }>;
}
