export interface CompendiumEntryParams {
  params: Promise<{ slug: string }>;
  // Also a promise; a bare `?edit` opens the edit modal, and `?annotate=<covenSlug>` a holding
  // coven's Annotate dialog.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
