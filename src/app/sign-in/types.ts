export interface SignInPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}
