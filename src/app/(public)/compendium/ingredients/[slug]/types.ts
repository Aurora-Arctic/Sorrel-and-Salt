export interface CompendiumEntryParams {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/dynamic-routes.md) — must be awaited before use.
  params: Promise<{ slug: string }>;
  // Also a promise; a bare `?edit` opens the edit modal, and `?annotate=<covenSlug>` a holding
  // coven's Annotate dialog.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
