export interface SpellRecipeParams {
  // Both are promises in Next 16: awaited before use.
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
