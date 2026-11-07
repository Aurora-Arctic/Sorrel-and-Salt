export interface CovenIngredientParams {
  params: Promise<{ slug: string; id: string }>;
  // Also a promise; only a bare `?edit` is read, for the edit modal.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
