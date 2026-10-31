export interface SignInMethodsPageProps {
  // `provider` is the one a failed link was for, which SignInMethods' Add puts on the error callback
  // so the sentence lands in that provider's row.
  searchParams: Promise<{
    error?: string | string[];
    provider?: string | string[];
  }>;
}
